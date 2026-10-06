# MFH-BUILD-MOBILE-SHARE-V1
# 모바일 편지(letter.html) → 단일파일 공유본(외부 리소스 0): 그달 글자 서브셋 폰트 · Tailwind CSS · 사진 base64 내장.
# 2609 실기기에서 직전 호 폰트 재사용 시 새 글자(빛·맺 등)가 대체폰트로 깨진 문제 → 매호 그달 글자로 폰트를 새로 만든다.
# 사용: python3 letter-templates/tools/build-mobile-share.py letter-templates/issues/<YYYY-MM>/letter.html <출력.html>
# 필요: macOS Chrome(Tailwind CDN 렌더 → 생성 CSS 추출) · 인터넷(Google Fonts text 서브셋 · jsDelivr Pretendard).
import re,base64,sys,html,os,urllib.request,urllib.parse,subprocess,tempfile
letter,out=sys.argv[1:3]
out=os.path.abspath(out)
os.chdir(os.path.dirname(os.path.abspath(letter))); letter=os.path.basename(letter)  # 사진 경로 photos-web/… 기준
CH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
dom=tempfile.mktemp(suffix='.html')
with open(dom,'w') as f:
    subprocess.run([CH,'--headless=new','--disable-gpu','--virtual-time-budget=8000','--dump-dom','file://'+os.path.abspath(letter)],stdout=f,stderr=subprocess.DEVNULL,check=True)
UA={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'}
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=60).read()
src=open(letter).read()
body=re.sub(r'<(script|style)[^>]*>.*?</\1>','',src,flags=re.S)
txt=html.unescape(re.sub(r'<[^>]+>',' ',body))
chars=set(txt)|set(chr(c) for c in range(0x20,0x7f))|set('·—–“”‘’…→←①②③④⑤•')
chars={c for c in chars if c not in '\n\r\t'}
print('chars',len(chars))
faces=[]
# Google fonts (text subset)
textq=urllib.parse.quote(''.join(sorted(chars)))
for fam,wts in [('Nanum+Myeongjo',[700,800]),('Montserrat',[500,600,700,800])]:
    for w in wts:
        css=get(f'https://fonts.googleapis.com/css2?family={fam}:wght@{w}&text={textq}').decode()
        for m in re.finditer(r'@font-face\s*\{(.*?)\}',css,re.S):
            b=m.group(1); u=re.search(r'url\((https:[^)]+)\)',b).group(1)
            data=base64.b64encode(get(u)).decode()
            faces.append(f"@font-face {{ font-family: '{fam.replace('+',' ')}'; font-style: normal; font-weight: {w}; font-display: swap; src: url(data:font/woff2;base64,{data}) format('woff2'); }}")
# Pretendard dynamic subset chunks
base='https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/'
pcss=get(base+'pretendard-dynamic-subset.css').decode()
cps={ord(c) for c in chars}
def hit(ur):
    for part in ur.split(','):
        part=part.strip().replace('U+','').replace('u+','')
        a,_,b=part.partition('-'); a=int(a,16); b=int(b,16) if b else a
        if any(a<=c<=b for c in cps): return True
    return False
n=0
for m in re.finditer(r'@font-face\s*\{(.*?)\}',pcss,re.S):
    b=m.group(1); w=int(re.search(r'font-weight:\s*(\d+)',b).group(1))
    if w not in (400,600,700,800): continue
    ur=re.search(r'unicode-range:\s*([^;]+)',b).group(1)
    if not hit(ur): continue
    u=re.search(r'url\(([^)]+\.woff2)\)',b).group(1).strip('"\'')
    data=base64.b64encode(get(urllib.parse.urljoin(base,u))).decode(); n+=1
    faces.append(f"@font-face {{ font-family: 'Pretendard'; font-style: normal; font-weight: {w}; font-display: swap; src: url(data:font/woff2;base64,{data}) format('woff2'); unicode-range: {ur.strip()}; }}")
print('faces',len(faces),'pretendard chunks',n)
d=open(dom).read()
tw=re.search(r'<style>\*, ::before, ::after\{--tw-border-spacing.*?</style>',d,re.S).group(0)
s=src
s=re.sub(r'\s*<link[^>]*(fonts\.googleapis|fonts\.gstatic|pretendard)[^>]*>','',s)
s=re.sub(r'\s*<script src="https://cdn\.tailwindcss\.com[^"]*"></script>','',s)
s=re.sub(r'\s*<script>\s*tailwind\.config.*?</script>','',s,flags=re.S)
s=s.replace('</head>','<style>\n'+'\n'.join(faces)+'\n</style>\n'+tw+'\n</head>',1)
def emb(m):
    p=m.group(1); mt='image/png' if p.lower().endswith('.png') else 'image/jpeg'
    return 'src="data:%s;base64,%s"'%(mt,base64.b64encode(open(p,'rb').read()).decode())
s=re.sub(r'src="(photos-web/[^"]+)"',emb,s)
open(out,'w').write(s); print('size',len(s))
