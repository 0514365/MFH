#!/usr/bin/env python3
# MFH-BUILD-VIDEO-V2  (구 build-letter-video.py · 릴스·영상편지 공용)
"""장면 HTML(<section class="scene" data-dur="초">) → mp4.  사진 장면은 PNG 켄번즈, 클립 장면은 영상 위에 자막 오버레이.

사용:
  python3 letter-templates/tools/build-video.py <scenes.html> <out.mp4> [--music bgm.mp3] [--voice voice/] [--size 1080x1920]

장면 속성:
  data-dur="6"                 장면 길이(초). 음성이 더 길면 늘어난다.
  data-clip="../../media/raw/2026/11/2026-11-07-0900-IMG_0002.MOV"
                               클립 장면 — 영상을 화면에 꽉 채워(cover) 깔고, 그 위에 이 장면 HTML 을 투명 배경으로 렌더해 얹는다.
                               (클립이 짧으면 마지막 프레임을 유지, 길면 data-dur 에서 자른다)
  data-clip-start="2.5"        클립 시작 지점(초)
  data-clip-audio="0.5"        클립 현장 소리를 이 볼륨으로 섞는다(없으면 무음). 음성 중에는 음악과 함께 낮아진다.
- 사진 장면은 ../photos-web/ 등 상대경로 <img>. 클립 장면 HTML 은 영상이 보일 자리를 비워 둔다(배경은 자동으로 투명 처리).
- --voice: 장면별 녹음 scene-01.m4a … 를 장면 시작에 얹고, 음성이 길면 그 장면을 늘린다. 음성 동안 음악·현장음은 자동으로 낮춘다.
- 음악이 없으면 무음 바탕을 깐다(일부 플랫폼이 무음 트랙 없는 영상을 거부). 최종 음량은 -14 LUFS(SNS 기준)로 맞춘다.
"""
import argparse, json, os, re, subprocess, sys, tempfile

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FPS = 30
XFADE = 0.6   # 장면 전환(초)
ZOOM = 0.03   # 사진 장면당 확대량(3%)
VOICE_LEAD = 0.5   # 장면 시작 후 음성 시작(초)
VOICE_TAIL = 0.5   # 음성 끝난 뒤 다음 전환까지 여유(초)
MUSIC_ALONE = 0.8        # 음성 없을 때 음악 볼륨
MUSIC_UNDER_VOICE = 0.3  # 음성 있을 때 음악 기본 볼륨(덕킹 전)
TRANSPARENT_CSS = "<style>html,body,.scene{background:transparent!important}</style>"


def attr(tag, name):
    m = re.search(rf'{name}="([^"]*)"', tag)
    return m.group(1) if m else None


def split_scenes(src):
    text = re.sub(r"<!--.*?-->", "", open(src, encoding="utf-8").read(), flags=re.S)
    head = text.split("<body>")[0] + "<body>"
    found = re.findall(r'(<section class="scene[^"]*"[^>]*>)(.*?)</section>', text, re.S)
    if not found:
        sys.exit("scene 이 없습니다: <section class=\"scene\" data-dur=\"초\">")
    scenes = []
    for open_tag, body in found:
        dur = attr(open_tag, "data-dur")
        if not dur:
            sys.exit(f"data-dur 없음: {open_tag[:60]}")
        clip = attr(open_tag, "data-clip")
        scenes.append({
            "html": open_tag + body + "</section>",
            "dur": float(dur),
            "clip": os.path.normpath(os.path.join(os.path.dirname(src), clip)) if clip else None,
            "clip_start": float(attr(open_tag, "data-clip-start") or 0),
            "clip_audio": float(attr(open_tag, "data-clip-audio") or 0),
        })
    return head, scenes


def shot(head, scene, png, w, h, workdir, transparent):
    page = os.path.join(workdir, f".scene-{os.getpid()}.html")
    with open(page, "w", encoding="utf-8") as f:
        f.write(head + (TRANSPARENT_CSS if transparent else "") + scene + "</body></html>")
    cmd = [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
           "--force-device-scale-factor=2", f"--window-size={w},{h}",
           "--virtual-time-budget=8000", f"--screenshot={png}", f"file://{page}"]
    if transparent:
        cmd.insert(1, "--default-background-color=00000000")
    try:
        subprocess.run(cmd, stderr=subprocess.DEVNULL, check=True)
    finally:
        os.remove(page)


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", path],
                       capture_output=True, text=True, check=True)
    info = json.loads(r.stdout)
    return float(info["format"].get("duration") or 0), any(s.get("codec_type") == "audio" for s in info["streams"])


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
        need = VOICE_LEAD + probe(v)[0] + VOICE_TAIL + XFADE if v else 0
        out.append(round(max(d, need), 2))
    return out


def build(pngs, scenes, durs, out, w, h, music, voices):
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    n_in = 0
    vid_in, ov_in, amb = [], [], []   # 장면별 (영상 입력 idx, 오버레이 입력 idx) · 현장음 (idx, scene, vol)
    for i, (png, sc, d) in enumerate(zip(pngs, scenes, durs)):
        if sc["clip"]:
            if not os.path.exists(sc["clip"]):
                sys.exit(f"클립 없음: {sc['clip']}")
            cmd += ["-ss", f"{sc['clip_start']}", "-t", f"{d}", "-i", sc["clip"]]
            vid_in.append(n_in); n_in += 1
            if sc["clip_audio"] > 0 and probe(sc["clip"])[1]:
                amb.append((vid_in[-1], i, sc["clip_audio"]))
            cmd += ["-loop", "1", "-t", f"{d}", "-i", png]
            ov_in.append(n_in); n_in += 1
        else:
            cmd += ["-loop", "1", "-t", f"{d}", "-i", png]
            vid_in.append(n_in); ov_in.append(None); n_in += 1
    total = sum(durs) - XFADE * (len(durs) - 1)
    if music:
        cmd += ["-stream_loop", "-1", "-i", music]
    else:
        cmd += ["-f", "lavfi", "-t", f"{total}", "-i", "anullsrc=r=48000:cl=stereo"]
    bed_in = n_in; n_in += 1
    voice_inputs = []
    for i, v in enumerate(voices):
        if v:
            cmd += ["-i", v]
            voice_inputs.append((n_in, i)); n_in += 1

    parts = []
    for i, (sc, d) in enumerate(zip(scenes, durs)):
        n = int(round(d * FPS))
        if sc["clip"]:
            parts.append(f"[{vid_in[i]}:v]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},"
                         f"fps={FPS},setsar=1,tpad=stop_mode=clone:stop_duration={d},trim=duration={d},"
                         f"setpts=PTS-STARTPTS[c{i}]")
            parts.append(f"[{ov_in[i]}:v]scale={w}:{h},format=rgba[o{i}]")
            parts.append(f"[c{i}][o{i}]overlay=0:0:format=auto,format=yuv420p[v{i}]")
        else:
            parts.append(f"[{vid_in[i]}:v]scale={w*2}:{h*2},zoompan=z='1+{ZOOM}*on/{n}':"
                         f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={w}x{h}:fps={FPS},"
                         f"trim=duration={d},setpts=PTS-STARTPTS,format=yuv420p[v{i}]")
    last, offset = "v0", 0.0
    for i in range(1, len(durs)):
        offset += durs[i - 1] - XFADE
        parts.append(f"[{last}][v{i}]xfade=transition=fade:duration={XFADE}:offset={offset:.3f}[x{i}]")
        last = f"x{i}"

    starts = [sum(durs[:i]) - XFADE * i for i in range(len(durs))]
    fade = f"afade=t=in:d=1.5,afade=t=out:st={max(total - 3, 0)}:d=3"
    bed_vol = MUSIC_UNDER_VOICE if voice_inputs else MUSIC_ALONE
    parts.append(f"[{bed_in}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=duration={total},"
                 f"asetpts=PTS-STARTPTS,volume={bed_vol},{fade}[music]")
    if amb:
        labels = []
        for k, (idx, scene, vol) in enumerate(amb):
            ms = int(starts[scene] * 1000)
            parts.append(f"[{idx}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=duration={durs[scene]},"
                         f"asetpts=PTS-STARTPTS,afade=t=in:d=0.4,afade=t=out:st={max(durs[scene]-0.6,0)}:d=0.6,"
                         f"volume={vol},adelay={ms}|{ms}[am{k}]")
            labels.append(f"[am{k}]")
        parts.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0,apad=whole_dur={total}[ambmix]")
        parts.append("[music][ambmix]amix=inputs=2:normalize=0[bed]")
    else:
        parts.append("[music]anull[bed]")
    if voice_inputs:
        labels = []
        for k, (idx, scene) in enumerate(voice_inputs):
            ms = int((starts[scene] + VOICE_LEAD) * 1000)
            parts.append(f"[{idx}:a]aresample=48000,aformat=channel_layouts=stereo,"
                         f"highpass=f=80,adelay={ms}|{ms}[vo{k}]")
            labels.append(f"[vo{k}]")
        parts.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0,"
                     f"apad=whole_dur={total},asplit[voice][key]")
        # 음성이 나오는 동안 음악·현장음을 낮춘다(덕킹)
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
    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    pngs = []
    for i, sc in enumerate(scenes, 1):
        png = os.path.join(framedir, f"scene-{i:02d}.png")
        shot(head, sc["html"], png, w, h, os.path.dirname(src), transparent=bool(sc["clip"]))
        pngs.append(png)
        print(f"  장면 {i}/{len(scenes)} 렌더{' (클립)' if sc['clip'] else ''}")
    voices = find_voices(args.voice, len(scenes))
    durs = fit_durations([sc["dur"] for sc in scenes], voices)
    total = build(pngs, scenes, durs, os.path.abspath(args.out), w, h, args.music, voices)
    clips = sum(1 for sc in scenes if sc["clip"])
    print(f"완료: {args.out} ({total:.1f}초, 장면 {len(scenes)}개 · 클립 {clips}개 · 음성 {sum(1 for v in voices if v)}개)")


if __name__ == "__main__":
    main()
