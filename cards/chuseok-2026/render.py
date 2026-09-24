import subprocess, os
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
html = os.path.abspath("card.html")
for v in ("cream", "navy"):
    out = os.path.abspath(f"MFH-chuseok-2026-{v}.png")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=1", "--window-size=1080,1994",
                    "--virtual-time-budget=8000", f"--screenshot={out}", f"file://{html}?v={v}"],
                   stderr=subprocess.DEVNULL)
    print(out)
