#!/usr/bin/env python3
"""MFH 선교편지 빌드 도구 — 9장 통합 letter HTML을 분리·캡처·그리드·임베드·PDF로.

사용:
  python3 tools/build-letter.py <letter.html> --all
  옵션: --grid (9장 그리드 PNG)  --embed (사진 박은 self-contained HTML)  --pdf  --all

macOS + Chrome 필요(headless 렌더). 채팅 미리보기가 안 보이면 *-embed.html을 브라우저로 열 것.
"""
import sys, os, re, base64, subprocess

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def shot(html, png, w=1080, h=1350, vt=6000):
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=2", f"--window-size={w},{h}",
                    f"--virtual-time-budget={vt}", f"--screenshot={png}", f"file://{html}"],
                   stderr=subprocess.DEVNULL)


def split_cards(letter):
    """미리보기 scale을 제거하고 .stage(=카드 1장)별 단독 HTML로 분리.
    카드를 /tmp에 두므로, 사진/로고 상대경로는 letter 기준 절대 file://로 바꿔 깨짐을 막는다."""
    src = open(letter).read(); bs = src.index('<body>'); bd = os.path.dirname(os.path.abspath(letter))
    head = (src[:bs]
            .replace('transform:scale(.425);transform-origin:top left;', '')
            .replace('.stage{width:459px;height:573px;}', '.stage{width:1080px;height:1350px;}'))
    body = src[bs + len('<body>'):]; out = []
    def absuri(m):
        p = os.path.normpath(os.path.join(bd, m.group(1)))
        return f'src="file://{p}"' if os.path.exists(p) else m.group(0)
    for i, c in enumerate(body.split('<div class="label">')[1:], 1):
        si = c.index('<div class="stage">'); rest = c[si:]
        ei = rest.rindex('</div></div>') + len('</div></div>')
        html = re.sub(r'src="([^"]+\.(?:jpe?g|png|webp))"', absuri,
                      head + '<body>' + rest[:ei] + '</body></html>', flags=re.I)
        p = f"/tmp/_mfhcard-{i:02d}.html"; open(p, 'w').write(html); out.append(p)
    return out


def embed(letter, out):
    """letter 안의 모든 사진/로고(상대경로 src)를 base64로 박아 self-contained HTML 생성."""
    src = open(letter).read(); bd = os.path.dirname(os.path.abspath(letter))
    def r(m):
        p = os.path.normpath(os.path.join(bd, m.group(1)))
        if os.path.exists(p):
            d = open(p, 'rb').read()
            mime = ('image/png' if p.lower().endswith('.png')
                    else 'image/webp' if d[:4] == b'RIFF' else 'image/jpeg')
            return f'src="data:{mime};base64,{base64.b64encode(d).decode()}"'
        return m.group(0)
    open(out, 'w').write(re.sub(r'src="([^"]+\.(?:jpe?g|png|webp))"', r, src, flags=re.I))


def pdf(letter, out):
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                    "--virtual-time-budget=9000", f"--print-to-pdf={out}",
                    f"file://{os.path.abspath(letter)}"], stderr=subprocess.DEVNULL)


def main():
    if len(sys.argv) < 2:
        print(__doc__); return
    letter = os.path.abspath(sys.argv[1]); d = os.path.dirname(letter)
    name = os.path.splitext(os.path.basename(letter))[0]
    a = sys.argv[2:]; allf = '--all' in a
    if allf or '--grid' in a:
        pngs = []
        for c in split_cards(letter):
            png = c.replace('.html', '.png'); shot(c, png); pngs.append(png)
        cells = ''.join(f'<figure style="margin:0"><img style="width:100%;border:1px solid #ccc;'
                        f'border-radius:4px" src="file://{p}"></figure>' for p in pngs)
        gh = "/tmp/_mfhgrid.html"
        open(gh, 'w').write('<body style="margin:0;padding:20px;background:#E9E7E3">'
                            '<div style="display:grid;grid-template-columns:repeat(3,1fr);'
                            f'gap:16px;max-width:1100px;margin:auto">{cells}</div></body>')
        shot(gh, f"{d}/{name}-grid.png", 1120, 1560, 2500)
        print("그리드:", f"{name}-grid.png ({len(pngs)}장)")
    if allf or '--embed' in a:
        embed(letter, f"{d}/{name}-embed.html"); print("임베드:", f"{name}-embed.html")
    if allf or '--pdf' in a:
        pdf(letter, f"{d}/{name}.pdf"); print("PDF:", f"{name}.pdf")


if __name__ == "__main__":
    main()
