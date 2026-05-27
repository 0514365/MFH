#!/usr/bin/env python3
"""
MFH patch60 — Portfolio Step A
신규 파일 7개 + SQL 안내. EDIT 없음.

사용:
  python3 /tmp/patch60/apply.py            # dry-run
  python3 /tmp/patch60/apply.py --apply    # 실제 적용
"""
import os
import sys
import shutil
from pathlib import Path

PATCH_DIR = Path(__file__).parent.resolve()
NEW_DIR = PATCH_DIR / "new"
REPO = Path.cwd()

APPLY = "--apply" in sys.argv

# 신규 파일 목록 (NEW_DIR 안 상대경로 == repo 안 경로)
NEW_FILES = [
    "lib/portfolio.ts",
    "app/p/[slug]/page.tsx",
    "app/p/[slug]/PortfolioView.tsx",
    "app/portfolio/page.tsx",
    "app/portfolio/PortfolioForm.tsx",
    "app/portfolio/HistoryEditor.tsx",
    "components/PortfolioPhotoUpload.tsx",
]

def copy_new_file(rel_path):
    src = NEW_DIR / rel_path
    dst = REPO / rel_path
    if not src.is_file():
        print(f"  [ERROR] source missing: {src}")
        return "ERROR"
    if dst.exists():
        # 이미 있고 동일한가?
        with open(src, "rb") as f:
            src_content = f.read()
        with open(dst, "rb") as f:
            dst_content = f.read()
        if src_content == dst_content:
            print(f"  [SKIP]  {rel_path} (already up-to-date)")
            return "SKIP"
        print(f"  [WARN]  {rel_path} exists with different content — skipping (manual check needed)")
        return "WARN"
    if APPLY:
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        print(f"  [NEW]   {rel_path}")
    else:
        print(f"  [NEW]   {rel_path} (dry-run)")
    return "NEW"

def main():
    print("=" * 60)
    print("MFH patch60 — Portfolio Step A")
    print(f"  Mode: {'APPLY' if APPLY else 'DRY-RUN'}")
    print(f"  Repo: {REPO}")
    print("=" * 60)

    if not (REPO / "package.json").exists() and not (REPO / "next.config.js").exists() and not (REPO / "next.config.mjs").exists():
        print("[ABORT] 현재 디렉토리가 MFH repo 가 아닌 것 같습니다 (package.json/next.config 못 찾음).")
        print(f"        현재: {REPO}")
        sys.exit(1)

    print("\n[1/2] 신규 파일 복사")
    results = {}
    for rel in NEW_FILES:
        r = copy_new_file(rel)
        results[r] = results.get(r, 0) + 1

    print("\n[2/2] 요약")
    for k, v in sorted(results.items()):
        print(f"  {k}: {v}")

    if not APPLY:
        print("\n→ dry-run 완료. 적용하려면 다음 실행:")
        print("  python3 /tmp/patch60/apply.py --apply")
    else:
        print("\n→ 적용 완료. 추가 작업:")
        print("  1) Supabase SQL 에디터에서 /tmp/patch60/portfolio.sql 실행")
        print("  2) git add -A; git commit -m 'patch60: portfolio step A'; git push")
        print("  3) Vercel 빌드 확인 → /portfolio 진입 (로그인 후) → 사진/연혁 등록 → /p/mfh 확인")

if __name__ == "__main__":
    main()
