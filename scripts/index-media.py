#!/usr/bin/env python3
# MFH-INDEX-MEDIA-V1
"""영상 클립·음성 메모를 media/raw/YYYY/MM/ 로 정리하고 media/index.md 를 만든다.

사용:
  python3 scripts/index-media.py                      # media/inbox(iPhone 단축어 도착함)의 영상·음성을 촬영일 기준
                                                      # media/raw/YYYY/MM/ 로 옮기고 index.md 재생성
  python3 scripts/index-media.py --dry                # 옮길 목록만 출력
  python3 scripts/index-media.py --sort <폴더>         # 다른 폴더(예: Dropbox 카메라 업로드)를 도착함 대신 정리
  python3 scripts/index-media.py --since 2026-11-01 --until 2026-12-31   # 기간만 표로 출력(collector 용)

파일명 규약: YYYY-MM-DD-HHMM-<원본이름>.<ext>  (슬러그는 우진이 Finder 에서 원본이름 자리에 바꿔 써도 됨 — 날짜 머리만 유지)
촬영일 = ffprobe creation_time(없으면 파일 수정시각). 길이·가로세로 = ffprobe.
"""
import argparse, json, os, re, shutil, subprocess, sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "media", "raw")
INBOX = os.path.join(ROOT, "media", "inbox")
INDEX = os.path.join(ROOT, "media", "index.md")
VIDEO_EXT = {".mov", ".mp4", ".m4v"}
AUDIO_EXT = {".m4a", ".mp3", ".wav", ".aac"}
NAME_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})-(\d{4})-")


def probe(path):
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", path],
            capture_output=True, text=True, check=True).stdout
        info = json.loads(out)
    except Exception:
        return None
    fmt = info.get("format", {})
    dur = float(fmt.get("duration") or 0)
    w = h = 0
    for s in info.get("streams", []):
        if s.get("codec_type") == "video":
            w, h = int(s.get("width") or 0), int(s.get("height") or 0)
            rot = 0
            for sd in s.get("side_data_list", []) or []:
                if "rotation" in sd:
                    rot = abs(int(float(sd["rotation"])))
            if rot in (90, 270):
                w, h = h, w
            break
    ct = fmt.get("tags", {}).get("creation_time") or ""
    taken = None
    if ct:
        try:
            taken = datetime.fromisoformat(ct.replace("Z", "+00:00")).astimezone()
        except ValueError:
            taken = None
    if taken is None:
        taken = datetime.fromtimestamp(os.path.getmtime(path)).astimezone()
    return {"dur": dur, "w": w, "h": h, "taken": taken}


def orientation(w, h):
    if not w or not h:
        return "음성"
    return "세로" if h > w else ("가로" if w > h else "정방")


def fmt_dur(sec):
    sec = int(round(sec))
    return f"{sec // 60}:{sec % 60:02d}" if sec >= 60 else f"{sec}초"


def sort_into_raw(src, dry):
    moved = 0
    for name in sorted(os.listdir(src)):
        ext = os.path.splitext(name)[1].lower()
        if ext not in VIDEO_EXT | AUDIO_EXT:
            continue
        path = os.path.join(src, name)
        info = probe(path)
        if not info:
            print(f"  건너뜀(ffprobe 실패): {name}")
            continue
        t = info["taken"]
        base = name if NAME_RE.match(name) else f"{t:%Y-%m-%d-%H%M}-{name}"
        dest_dir = os.path.join(RAW, f"{t:%Y}", f"{t:%m}")
        dest = os.path.join(dest_dir, base)
        print(f"  {name} → media/raw/{t:%Y}/{t:%m}/{base}  ({orientation(info['w'], info['h'])} {fmt_dur(info['dur'])})")
        if not dry:
            os.makedirs(dest_dir, exist_ok=True)
            if os.path.exists(dest):
                print(f"  이미 있음, 건너뜀: {dest}")
                continue
            shutil.move(path, dest)
        moved += 1
    print(f"{'옮길' if dry else '옮긴'} 파일 {moved}개")


def scan():
    rows = []
    for dirpath, _, files in os.walk(RAW):
        for name in files:
            ext = os.path.splitext(name)[1].lower()
            if ext not in VIDEO_EXT | AUDIO_EXT:
                continue
            path = os.path.join(dirpath, name)
            info = probe(path)
            if not info:
                continue
            m = NAME_RE.match(name)
            date = f"{m.group(1)}-{m.group(2)}-{m.group(3)}" if m else f"{info['taken']:%Y-%m-%d}"
            rows.append({
                "date": date, "name": name, "rel": os.path.relpath(path, ROOT),
                "kind": "음성" if ext in AUDIO_EXT else orientation(info["w"], info["h"]),
                "dur": info["dur"], "px": f"{info['w']}×{info['h']}" if info["w"] else "",
                "mb": os.path.getsize(path) / 1e6,
            })
    rows.sort(key=lambda r: (r["date"], r["name"]))
    return rows


def render(rows, since=None, until=None):
    if since:
        rows = [r for r in rows if r["date"] >= since]
    if until:
        rows = [r for r in rows if r["date"] <= until]
    lines = ["# media/index.md — 영상 클립·음성 메모 색인 (자동 생성 · `scripts/index-media.py`)", "",
             f"> 생성 {datetime.now():%Y-%m-%d %H:%M} · 파일 {len(rows)}개 · 총 {sum(r['mb'] for r in rows):.0f}MB · "
             "같은 날짜의 일지(`journal_entries.entry_date`)와 짝지어 쓴다.", ""]
    cur = None
    for r in rows:
        if r["date"] != cur:
            cur = r["date"]
            lines += ["", f"## {cur}", "", "| 파일 | 종류 | 길이 | 해상도 | MB |", "|---|---|---|---|---|"]
        lines.append(f"| `{r['rel']}` | {r['kind']} | {fmt_dur(r['dur'])} | {r['px']} | {r['mb']:.0f} |")
    return "\n".join(lines) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sort", metavar="폴더", help="이 폴더의 영상·음성을 media/raw/YYYY/MM/ 로 옮긴다 (기본: media/inbox)")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--since"), ap.add_argument("--until")
    a = ap.parse_args()
    os.makedirs(RAW, exist_ok=True)
    os.makedirs(INBOX, exist_ok=True)
    src = a.sort or INBOX
    if not a.since and not a.until:
        if not os.path.isdir(src):
            sys.exit(f"폴더 없음: {src}")
        sort_into_raw(src, a.dry)
        if a.dry:
            return
    rows = scan()
    if a.since or a.until:
        sys.stdout.write(render(rows, a.since, a.until))
        return
    with open(INDEX, "w", encoding="utf-8") as f:
        f.write(render(rows))
    print(f"media/index.md 갱신 — {len(rows)}개")


if __name__ == "__main__":
    main()
