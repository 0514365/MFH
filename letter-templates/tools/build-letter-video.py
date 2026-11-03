#!/usr/bin/env python3
# MFH-LETTER-VIDEO-V1
"""장면 HTML(<section class="scene" data-dur="초">) → 장면 PNG → mp4(천천히 확대 + 크로스페이드 + 배경음악).

사용:
  python3 letter-templates/tools/build-letter-video.py <scenes.html> <out.mp4> [--music bgm.mp3] [--voice voice/] [--size 1080x1920]
- 장면 HTML 은 issues/<월>/video/ 에 두고 사진은 ../photos-web/ 상대경로로 참조.
- --voice: 장면별 녹음 scene-01.m4a … 를 장면 시작에 얹고, 음성이 길면 그 장면을 늘린다. 음성 동안 음악은 자동으로 낮춘다.
- 음악이 없으면 무음 바탕을 깐다(일부 플랫폼이 무음 트랙 없는 영상을 거부). 최종 음량은 -14 LUFS(SNS 기준)로 맞춘다.
"""
import argparse, os, re, subprocess, sys, tempfile

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FPS = 30
XFADE = 0.6   # 장면 전환(초)
ZOOM = 0.03   # 장면당 확대량(3%)
VOICE_LEAD = 0.5   # 장면 시작 후 음성 시작(초)
VOICE_TAIL = 0.5   # 음성 끝난 뒤 다음 전환까지 여유(초)
MUSIC_ALONE = 0.8        # 음성 없을 때 음악 볼륨
MUSIC_UNDER_VOICE = 0.3  # 음성 있을 때 음악 기본 볼륨(덕킹 전)


def split_scenes(src):
    text = open(src, encoding="utf-8").read()
    head = text.split("<body>")[0] + "<body>"
    scenes = re.findall(r'(<section class="scene[^"]*"[^>]*data-dur="([\d.]+)"[^>]*>.*?</section>)', text, re.S)
    if not scenes:
        sys.exit("scene 이 없습니다: <section class=\"scene\" data-dur=\"초\">")
    return head, [(html, float(d)) for html, d in scenes]


def shot(head, scene, png, w, h, workdir):
    page = os.path.join(workdir, f".scene-{os.getpid()}.html")
    with open(page, "w", encoding="utf-8") as f:
        f.write(head + scene + "</body></html>")
    try:
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        "--force-device-scale-factor=2", f"--window-size={w},{h}",
                        "--virtual-time-budget=8000", f"--screenshot={png}", f"file://{page}"],
                       stderr=subprocess.DEVNULL, check=True)
    finally:
        os.remove(page)


def probe_len(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def find_voices(voice_dir, count):
    """voice_dir 의 scene-NN.* (m4a·mp3·wav·aiff) → 장면 순서 리스트. 없는 장면은 None."""
    if not voice_dir:
        return [None] * count
    files = {}
    for name in os.listdir(voice_dir):
        m = re.match(r"scene-(\d+)\.(m4a|mp3|wav|aiff|aif|caf)$", name, re.I)
        if m:
            files[int(m.group(1))] = os.path.join(voice_dir, name)
    return [files.get(i) for i in range(1, count + 1)]


def fit_durations(durs, voices):
    """음성이 장면 안에 다 들어가도록 장면 길이를 늘린다(줄이지는 않는다)."""
    out = []
    for d, v in zip(durs, voices):
        need = VOICE_LEAD + probe_len(v) + VOICE_TAIL + XFADE if v else 0
        out.append(round(max(d, need), 2))
    return out


def build(pngs, durs, out, w, h, music, voices):
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for png, d in zip(pngs, durs):
        cmd += ["-loop", "1", "-t", f"{d}", "-i", png]
    total = sum(durs) - XFADE * (len(durs) - 1)
    a = len(durs)
    if music:
        cmd += ["-stream_loop", "-1", "-i", music]
    else:
        cmd += ["-f", "lavfi", "-t", f"{total}", "-i", "anullsrc=r=48000:cl=stereo"]
    voice_inputs = []
    for i, v in enumerate(voices):
        if v:
            voice_inputs.append((a + 1 + len(voice_inputs), i))
            cmd += ["-i", v]

    parts = []
    for i, d in enumerate(durs):
        n = int(round(d * FPS))
        parts.append(f"[{i}:v]scale={w*2}:{h*2},zoompan=z='1+{ZOOM}*on/{n}':"
                     f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={w}x{h}:fps={FPS},"
                     f"trim=duration={d},setpts=PTS-STARTPTS,format=yuv420p[v{i}]")
    last, offset = "v0", 0.0
    for i in range(1, len(durs)):
        offset += durs[i - 1] - XFADE
        parts.append(f"[{last}][v{i}]xfade=transition=fade:duration={XFADE}:offset={offset:.3f}[x{i}]")
        last = f"x{i}"
    fade = f"afade=t=in:d=1.5,afade=t=out:st={max(total - 3, 0)}:d=3"
    bed_vol = MUSIC_UNDER_VOICE if voice_inputs else MUSIC_ALONE
    parts.append(f"[{a}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=duration={total},"
                 f"asetpts=PTS-STARTPTS,volume={bed_vol},{fade}[bed]")
    if voice_inputs:
        starts = [sum(durs[:i]) - XFADE * i for i in range(len(durs))]
        labels = []
        for k, (idx, scene) in enumerate(voice_inputs):
            ms = int((starts[scene] + VOICE_LEAD) * 1000)
            parts.append(f"[{idx}:a]aresample=48000,aformat=channel_layouts=stereo,"
                         f"highpass=f=80,adelay={ms}|{ms}[vo{k}]")
            labels.append(f"[vo{k}]")
        parts.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0,"
                     f"apad=whole_dur={total},asplit[voice][key]")
        # 음성이 나오는 동안 음악을 낮춘다(덕킹)
        parts.append("[bed][key]sidechaincompress=threshold=0.02:ratio=10:attack=30:release=600[duck]")
        parts.append("[duck][voice]amix=inputs=2:normalize=0[mix]")
    else:
        parts.append("[bed]anull[mix]")
    parts.append(f"[mix]loudnorm=I=-14:TP=-1.5:LRA=11,atrim=duration={total}[a]")

    cmd += ["-filter_complex", ";".join(parts), "-map", f"[{last}]", "-map", "[a]",
            "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p", "-r", str(FPS),
            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", f"{total}", out]
    subprocess.run(cmd, check=True)
    return total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scenes")
    ap.add_argument("out")
    ap.add_argument("--music", help="배경음악(짧으면 반복)")
    ap.add_argument("--voice", help="장면별 내레이션 폴더(scene-01.m4a …)")
    ap.add_argument("--size", default="1080x1920")
    ap.add_argument("--keep-frames", action="store_true", help="장면 PNG 를 <out>-frames/ 에 남긴다")
    args = ap.parse_args()
    w, h = map(int, args.size.split("x"))

    src = os.path.abspath(args.scenes)
    head, scenes = split_scenes(src)
    framedir = (os.path.splitext(os.path.abspath(args.out))[0] + "-frames") if args.keep_frames else tempfile.mkdtemp()
    os.makedirs(framedir, exist_ok=True)
    pngs = []
    for i, (scene, _) in enumerate(scenes, 1):
        png = os.path.join(framedir, f"scene-{i:02d}.png")
        shot(head, scene, png, w, h, os.path.dirname(src))
        pngs.append(png)
        print(f"  장면 {i}/{len(scenes)} 렌더")
    voices = find_voices(args.voice, len(scenes))
    durs = fit_durations([d for _, d in scenes], voices)
    total = build(pngs, durs, os.path.abspath(args.out), w, h, args.music, voices)
    print(f"완료: {args.out} ({total:.1f}초, 장면 {len(scenes)}개, 음성 {sum(1 for v in voices if v)}개)")


if __name__ == "__main__":
    main()
