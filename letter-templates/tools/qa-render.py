#!/usr/bin/env python3
# MFH-LETTER-QA-RENDER-V1
"""선교편지 렌더 QA — 모바일·카드뉴스를 실제로 렌더링해 캡처하고 기계 점검 리포트를 만든다.
디자인을 바꾸지 않는다. 입력 HTML 은 읽기만 하고, 결과는 <호 폴더>/qa/ 에만 쓴다.

사용:
  python3 letter-templates/tools/qa-render.py letter-templates/issues/2026-10
  옵션: --cards-only / --mobile-only

출력(qa/):
  report.md            기계 점검 결과 (FAIL=발행 전 수정, WARN=눈으로 판단)
  cards/card-NN.png    카드뉴스 1:1 캡처
  cards-sheet.png      카드 전체 한눈 시트
  mobile/page-NN.png   모바일 390×844 캡처 (실기기 화면 단위)

macOS + Chrome 필요. 눈 검수 절차는 .claude/skills/letter-design-qa/SKILL.md 참고.
"""
import base64, json, math, os, re, shutil, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CARD_W, CARD_H = 1080, 1350
MOBILE_W, MOBILE_SLICE = 390, 844
CARD_MIN_FONT = 20      # 카드뉴스 지면 기준 하한(px). 본문 ~29 · 기도 ~24 는 §9 기준.
MOBILE_MIN_FONT = 12    # 모바일 캡션 ~12.5 기준.
CARD_GAP = 170          # 카드 안 빈 띠(세로) 경고 기준(px).

CARD_CSS = """<style id="__qa">
.top-note,.label{display:none!important}
.stage{width:1080px!important;height:1350px!important;display:block!important}
.card{transform:none!important}
html,body{margin:0!important;padding:0!important}
body{display:block!important;gap:0!important}
</style>"""

# 페이지 안에서 측정해 base64 JSON 을 <meta> 로 남긴다 (--dump-dom 으로 회수).
MEASURE_JS = r"""<script>
(function(){
const MODE=window.__QA_MODE, SOLO=window.__QA_SOLO, SCROLL=window.__QA_SCROLL;
function lum(c){const f=c.slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*f[0]+.7152*f[1]+.0722*f[2]}
function parse(s){const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat);return [p[0],p[1],p[2],p[3]===undefined?1:p[3]]}
function bgOf(el){for(let e=el;e;e=e.parentElement){const s=getComputedStyle(e);if(s.backgroundImage!=='none')return null;const c=parse(s.backgroundColor);if(c&&c[3]>=.99)return c;if(c&&c[3]>0)return null}return [255,255,255,1]}
function hit(a,b){return a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom}
function isBody(t){t=t.trim();return /[가-힣]/.test(t)&&t.replace(/\s/g,'').length>=12}
function snip(t){t=t.replace(/\s+/g,' ').trim();return t.length>26?t.slice(0,26)+'…':t}
function textNodes(root){const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),out=[];let n;while(n=w.nextNode()){if(!n.nodeValue.trim())continue;const p=n.parentElement;if(!p||['SCRIPT','STYLE','NOSCRIPT'].includes(p.tagName))continue;const s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity)===0)continue;const r=document.createRange();r.selectNodeContents(n);const b=r.getBoundingClientRect();if(!b.width||!b.height)continue;out.push({n,p,s,b})}return out}
function inspect(root,minFont){
  const box=root.getBoundingClientRect(),res={fails:[],warns:[],fonts:{}};
  const imgs=[...root.querySelectorAll('img')];
  imgs.forEach(i=>{const src=(i.getAttribute('src')||'').split('/').pop().slice(0,40);
    if(!i.complete||!i.naturalWidth){res.fails.push('이미지 깨짐: '+src);return}
    const b=i.getBoundingClientRect(),fit=getComputedStyle(i).objectFit;
    if(b.width&&(i.naturalWidth<b.width*.8||i.naturalHeight<b.height*.8)&&fit!=='contain')res.warns.push(`저해상도 사진: ${src} (원본 ${i.naturalWidth}×${i.naturalHeight} → 표시 ${Math.round(b.width)}×${Math.round(b.height)})`);
    if(fit==='fill'&&b.width&&Math.abs(b.width/b.height-i.naturalWidth/i.naturalHeight)>.04)res.fails.push('사진 비율 왜곡: '+src)});
  const texts=textNodes(root),small=new Set(),low=new Set(),clip=new Set();
  texts.forEach(({n,p,s,b})=>{const t=n.nodeValue,fs=parseFloat(s.fontSize);
    res.fonts[Math.round(fs)]=(res.fonts[Math.round(fs)]||0)+t.trim().length;
    if(fs<minFont&&isBody(t))small.add(`${snip(t)} (${fs}px)`);
    for(let e=p;e&&e!==root.parentElement;e=e.parentElement){const o=getComputedStyle(e);if(e===root||o.overflow!=='visible'){const c=e.getBoundingClientRect();if(b.bottom>c.bottom+1.5||b.right>c.right+1.5||b.top<c.top-1.5||b.left<c.left-1.5){clip.add(snip(t));break}}}
    const fg=parse(s.color);if(!isBody(t)||!fg||imgs.some(i=>hit(i.getBoundingClientRect(),b)))return;const bg=bgOf(p);if(!bg)return;
    const hi=Math.max(lum(fg),lum(bg)),lo=Math.min(lum(fg),lum(bg)),cr=(hi+.05)/(lo+.05),large=fs>=24||(fs>=18.66&&parseInt(s.fontWeight)>=700);
    if(cr<(large?3:4.5))low.add(`${snip(t)} (${cr.toFixed(1)}:1, ${fs}px)`)});
  clip.forEach(t=>res.fails.push('글자 잘림·넘침: '+t));
  small.forEach(t=>res.warns.push('작은 글자: '+t));
  low.forEach(t=>res.warns.push('낮은 대비: '+t));
  return {res,box,texts,imgs};
}
function gapOf(root,box,texts,imgs){
  const iv=[];texts.forEach(({b})=>iv.push([b.top,b.bottom]));
  imgs.forEach(i=>{const b=i.getBoundingClientRect();if(b.height<box.height*.92)iv.push([b.top,b.bottom])});
  root.querySelectorAll('*').forEach(e=>{if(getComputedStyle(e).backgroundImage.includes('url(')){const b=e.getBoundingClientRect();if(b.height<box.height*.92&&b.height>0)iv.push([b.top,b.bottom])}});
  iv.sort((a,b)=>a[0]-b[0]);let last=box.top,max=0,where=0;
  iv.forEach(([t,bt])=>{if(t-last>max){max=t-last;where=last-box.top}last=Math.max(last,bt)});
  if(box.bottom-last>max){max=box.bottom-last;where=last-box.top}
  return {gap:Math.round(max),at:Math.round(where)};
}
function run(){
  const out={mode:MODE,innerWidth:innerWidth,fontsOk:{},items:[],bodyText:document.body.innerText};
  ['Nanum Myeongjo','Pretendard','Montserrat'].forEach(f=>{out.fontsOk[f]=document.fonts.check('16px "'+f+'"','가A')});
  if(MODE==='cards'){
    const cards=[...document.querySelectorAll('.card')];
    if(SOLO!==undefined){document.querySelectorAll('.stage').forEach((s,i)=>{if(i!==SOLO)s.style.setProperty('display','none','important')})}
    else cards.forEach((c,i)=>{const {res,box,texts,imgs}=inspect(c,window.__QA_MIN);const g=gapOf(c,box,texts,imgs);
      out.items.push({n:i+1,cls:c.className,fails:res.fails,warns:res.warns,fonts:res.fonts,gap:g,overflowScroll:c.scrollHeight>c.clientHeight+1})});
  }else if(SCROLL!==undefined){document.documentElement.style.scrollBehavior='auto';window.scrollTo({top:SCROLL,left:0,behavior:'instant'})}
  else{
    const {res}=inspect(document.body,window.__QA_MIN);
    out.items.push({n:1,fails:res.fails,warns:res.warns,fonts:res.fonts});
    out.docH=document.documentElement.scrollHeight;out.docW=document.documentElement.scrollWidth;
  }
  const m=document.createElement('meta');m.id='__qaresult';
  m.setAttribute('content',btoa(unescape(encodeURIComponent(JSON.stringify(out)))));document.head.appendChild(m);
  try{if(parent!==window)parent.postMessage(m.getAttribute('content'),'*')}catch(e){}
}
addEventListener('load',()=>{(document.fonts&&document.fonts.ready||Promise.resolve()).then(()=>setTimeout(run,900))});
})();
</script>"""


def chrome(args, vt=9000):
    with tempfile.TemporaryDirectory(prefix="mfhqa-") as prof:
        return subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                               f"--user-data-dir={prof}", "--no-first-run",
                               "--allow-file-access-from-files",
                               f"--virtual-time-budget={vt}", *args],
                              capture_output=True, text=True, timeout=180)


def instrument(src_path, tmp_path, mode, css="", solo=None, scroll=None, min_font=0):
    """원본을 건드리지 않고 임시 사본에 <base>·측정 스크립트를 주입한다."""
    src = open(src_path, encoding="utf-8").read()
    base = "file://" + os.path.dirname(os.path.abspath(src_path)) + "/"
    cfg = (f"<script>window.__QA_MODE={json.dumps(mode)};window.__QA_MIN={min_font};"
           + (f"window.__QA_SOLO={solo};" if solo is not None else "")
           + (f"window.__QA_SCROLL={scroll};" if scroll is not None else "") + "</script>")
    head = f'<base href="{base}">{cfg}'
    src = re.sub(r"<head[^>]*>", lambda m: m.group(0) + head, src, count=1, flags=re.I)
    src = re.sub(r"</head>", lambda m: css + MEASURE_JS + m.group(0), src, count=1, flags=re.I)
    open(tmp_path, "w", encoding="utf-8").write(src)


def host(tmp, tmpd, name, w, h):
    """headless Chrome 창은 폭 500px 아래로 줄지 않아, 모바일은 390px iframe 안에서 렌더한다."""
    p = f"{tmpd}/{name}"
    open(p, "w", encoding="utf-8").write(
        f'<!doctype html><html><head></head><body style="margin:0;background:#fff">'
        f'<iframe src="file://{tmp}" style="width:{w}px;height:{h}px;border:0;display:block;margin:0 auto"></iframe>'
        "<script>addEventListener('message',e=>{const m=document.createElement('meta');"
        "m.id='__qaresult';m.setAttribute('content',e.data);document.head.appendChild(m)})</script>"
        "</body></html>")
    return p


def measure(tmp, w, h):
    r = chrome([f"--window-size={w},{h}", "--dump-dom", f"file://{tmp}"])
    m = re.search(r'id="__qaresult"[^>]*content="([^"]+)"', r.stdout) or \
        re.search(r'content="([^"]+)"[^>]*id="__qaresult"', r.stdout)
    if not m:
        raise RuntimeError("측정 결과를 읽지 못했습니다: " + tmp)
    return json.loads(base64.b64decode(m.group(1)).decode("utf-8"))


def shot(tmp, png, w, h):
    chrome([f"--window-size={w},{h}", f"--screenshot={png}", f"file://{tmp}"])
    return os.path.exists(png)


def text_rules(text, tag):
    """도메인 고정값 중 화면 글자로 판정 가능한 것만."""
    fails = []
    for mk in ("[미확정]", "[우진확인]", "[추가요청]"):
        if mk in text:
            fails.append(f"{tag}: 작업용 마커 노출 {mk}")
    if "1002-349-524757" in text or "우리은행" in text:
        fails.append(f"{tag}: 구 후원계좌(우리은행) 잔존")
    if "183-939319-04737" not in text:
        fails.append(f"{tag}: 후원계좌(하나은행) 문구 없음")
    return fails


def fonts_line(d):
    return ", ".join(f"{k}: {'OK' if v else '미로드'}" for k, v in d.items())


def qa_cards(path, qa, tmpd, lines):
    shutil.rmtree(f"{qa}/cards", ignore_errors=True)
    os.makedirs(f"{qa}/cards")
    t = f"{tmpd}/cards.html"
    instrument(path, t, "cards", CARD_CSS, min_font=CARD_MIN_FONT)
    data = measure(t, CARD_W, CARD_H)
    items = data["items"]

    def one(i):
        s = f"{tmpd}/card-{i:02d}.html"
        instrument(path, s, "cards", CARD_CSS, solo=i, min_font=CARD_MIN_FONT)
        return shot(s, f"{qa}/cards/card-{i + 1:02d}.png", CARD_W, CARD_H)
    with ThreadPoolExecutor(4) as ex:
        shots = list(ex.map(one, range(len(items))))

    cells = "".join(f'<img src="file://{qa}/cards/card-{i + 1:02d}.png" style="width:100%;display:block">'
                    for i in range(len(items)))
    rows = math.ceil(len(items) / 5)
    sheet = f"{tmpd}/sheet.html"
    open(sheet, "w").write('<body style="margin:0;padding:12px;background:#ddd"><div style="display:grid;'
                           f'grid-template-columns:repeat(5,1fr);gap:10px">{cells}</div></body>')
    shot(sheet, f"{qa}/cards-sheet.png", 1400, rows * 336 + 24)

    f = sum(len(c["fails"]) for c in items) + text_rules(data["bodyText"], "카드뉴스").__len__()
    lines += [f"## 카드뉴스 ({len(items)}장)", "", f"- 폰트 로드: {fonts_line(data['fontsOk'])}",
              f"- 캡처: {sum(shots)}/{len(items)}", ""]
    lines += [f"- **FAIL** {x}" for x in text_rules(data["bodyText"], "카드뉴스")]
    warns = 0
    for c in items:
        msgs = [f"**FAIL** {x}" for x in c["fails"]] + [f"WARN {x}" for x in c["warns"]]
        if c["gap"]["gap"] >= CARD_GAP and "cover" not in c["cls"]:
            msgs.append(f"WARN 빈 띠 {c['gap']['gap']}px (위에서 {c['gap']['at']}px 지점)")
        warns += sum(m.startswith("WARN") for m in msgs)
        if msgs:
            lines += [f"### 카드 {c['n']:02d}", ""] + [f"- {m}" for m in msgs] + [""]
    return f, warns


def qa_mobile(path, qa, tmpd, lines):
    shutil.rmtree(f"{qa}/mobile", ignore_errors=True)
    os.makedirs(f"{qa}/mobile")
    t = f"{tmpd}/mobile.html"
    instrument(path, t, "mobile", min_font=MOBILE_MIN_FONT)
    data = measure(host(t, tmpd, "mhost.html", MOBILE_W, MOBILE_SLICE), 500, MOBILE_SLICE)
    it = data["items"][0]
    pages = math.ceil(data["docH"] / MOBILE_SLICE)

    def one(i):
        s = f"{tmpd}/mobile-{i:02d}.html"
        instrument(path, s, "mobile", scroll=i * MOBILE_SLICE, min_font=MOBILE_MIN_FONT)
        png = f"{qa}/mobile/page-{i + 1:02d}.png"
        ok = shot(host(s, tmpd, f"mhost-{i:02d}.html", MOBILE_W, MOBILE_SLICE), png, 500, MOBILE_SLICE)
        if ok:
            subprocess.run(["sips", "-c", str(MOBILE_SLICE), str(MOBILE_W), png],
                           capture_output=True)
        return ok
    with ThreadPoolExecutor(4) as ex:
        shots = list(ex.map(one, range(pages)))

    rules = text_rules(data["bodyText"], "모바일")
    fails = list(it["fails"]) + rules
    if data["docW"] > data["innerWidth"] + 1:
        fails.append(f"가로 넘침: 문서 {data['docW']}px > 화면 {data['innerWidth']}px")
    lines += [f"## 모바일 (폭 {data['innerWidth']}px · 높이 {data['docH']}px)", "",
              f"- 폰트 로드: {fonts_line(data['fontsOk'])}", f"- 캡처: {sum(shots)}/{pages}", ""]
    lines += [f"- **FAIL** {x}" for x in fails] + [f"- WARN {x}" for x in it["warns"]] + [""]
    return len(fails), len(it["warns"])


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        return
    issue = os.path.abspath(args[0])
    qa = f"{issue}/qa"
    os.makedirs(qa, exist_ok=True)
    lines, fails, warns = [], 0, 0
    with tempfile.TemporaryDirectory(prefix="mfhqa-t-") as tmpd:
        m, c = f"{issue}/letter.html", f"{issue}/letter-cardnews.html"
        if "--cards-only" not in sys.argv and os.path.exists(m):
            f, w = qa_mobile(m, qa, tmpd, lines); fails += f; warns += w
        if "--mobile-only" not in sys.argv and os.path.exists(c):
            f, w = qa_cards(c, qa, tmpd, lines); fails += f; warns += w
    if not lines:
        print("letter.html / letter-cardnews.html 이 아직 없습니다:", issue)
        return
    head = [f"# 렌더 QA — {os.path.basename(issue)}", "",
            f"**FAIL {fails} · WARN {warns}** (FAIL=발행 전 수정 · WARN=캡처를 보고 판단)", ""]
    open(f"{qa}/report.md", "w", encoding="utf-8").write("\n".join(head + lines) + "\n")
    print(f"FAIL {fails} · WARN {warns} → {qa}/report.md")


if __name__ == "__main__":
    main()
