#!/usr/bin/env python3
# MFH-IMPORT-LETTERS-V2
# 선교편지 일괄 import: "News Letter/" 폴더의 PDF(+모바일 HTML) 를
#   - portfolio-letters 버킷에 PDF + 표지 (+ 모바일 HTML) 업로드
#   - letters 테이블에 row insert (public_view=true, mobile_path 포함)
# V2: 폴더에 .html(모바일 편지 — 사진 임베드 단일 파일) 이 있으면 함께 업로드.
#     이미 import 된 편지도 mobile_path 가 비어 있고 html 이 있으면 모바일만 보강(update).
#     (요구: letters.mobile_path 컬럼 — supabase/letters-mobile-path.sql 선실행)
#
# 사용법:
#   python3 scripts/import_letters.py --dry      # 미리보기 (파싱·표지추출만, 업로드/insert 없음)
#   python3 scripts/import_letters.py --apply     # 실제 업로드 + insert
#
# 요구사항: .env.local 에
#   NEXT_PUBLIC_SUPABASE_URL=...
#   SUPABASE_SERVICE_ROLE_KEY=...   (--apply 필수. import 완료 후 Supabase 대시보드에서 Reset)
#
# 의존성: 없음 (Python3 stdlib + macOS 내장 qlmanage/sips)
# 멱등성: letters.pdf_path 가 이미 있으면 skip. Storage 는 x-upsert=false(덮어쓰기 금지).

import os
import re
import sys
import json
import subprocess
import urllib.request
import urllib.parse
import urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEWS_DIR = os.path.join(ROOT, "News Letter")
ENV_PATH = os.path.join(ROOT, ".env.local")
BUCKET = "portfolio-letters"
SLUG = "mfh"
COVER_TMP = "/tmp/mfh-covers"
IMAGE_EXTS = (".png", ".jpg", ".jpeg")


# ---------- env ----------

def load_env():
    env = {}
    if not os.path.exists(ENV_PATH):
        return env
    with open(ENV_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


# ---------- 폴더명 파싱 ----------

def parse_folder(name):
    # 패턴: YYYYMMDD_MFH[#]?<number>[_<title>]
    m = re.match(r"^(\d{8})_MFH#?(.+)$", name)
    if not m:
        return None
    date8 = m.group(1)
    rest = m.group(2)
    parts = rest.split("_", 1)
    number = parts[0].strip()
    title = parts[1].strip() if len(parts) > 1 else ""
    year, month, day = date8[:4], date8[4:6], date8[6:8]
    year_month = f"{year}-{month}"
    if not title:
        title = f"{int(year)}년 {int(month)}월호"
    return {
        "folder": name,
        "date8": date8,
        "year_month": year_month,
        "number": number,
        "title": title,
        "sort_order": int(day),
    }


def find_pdf(folder_path):
    pdfs = sorted(f for f in os.listdir(folder_path) if f.lower().endswith(".pdf"))
    return os.path.join(folder_path, pdfs[0]) if pdfs else None


def find_html(folder_path):
    htmls = sorted(f for f in os.listdir(folder_path) if f.lower().endswith((".html", ".htm")))
    return os.path.join(folder_path, htmls[0]) if htmls else None


def find_existing_cover(folder_path):
    for f in sorted(os.listdir(folder_path)):
        if f.lower().endswith(IMAGE_EXTS):
            return os.path.join(folder_path, f)
    return None


def extract_cover(pdf_path, date8):
    # qlmanage 로 PDF 1쪽 썸네일 PNG 추출 → cover-{date8}.png 로 정규화
    os.makedirs(COVER_TMP, exist_ok=True)
    out = os.path.join(COVER_TMP, f"cover-{date8}.png")
    if os.path.exists(out):
        os.remove(out)
    subprocess.run(
        ["qlmanage", "-t", "-s", "1400", "-o", COVER_TMP, pdf_path],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False,
    )
    produced = os.path.join(COVER_TMP, os.path.basename(pdf_path) + ".png")
    if os.path.exists(produced):
        os.replace(produced, out)
        return out
    return None


# ---------- Supabase REST / Storage ----------

def api_get(base, key, path):
    req = urllib.request.Request(
        base + path,
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())


def get_user_id(base, key):
    rows = api_get(base, key, f"/rest/v1/portfolio?slug=eq.{SLUG}&select=user_id")
    return rows[0]["user_id"] if rows else None


def letter_exists(base, key, pdf_path):
    # V2: 존재 시 row(id·mobile_path) 반환 — 기존 편지 모바일 보강용. 없으면 None.
    q = urllib.parse.quote(pdf_path, safe="")
    rows = api_get(base, key, f"/rest/v1/letters?pdf_path=eq.{q}&select=id,mobile_path")
    return rows[0] if rows else None


def update_letter(base, key, letter_id, patch):
    data = json.dumps(patch, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        f"{base}/rest/v1/letters?id=eq.{urllib.parse.quote(str(letter_id), safe='')}",
        data=data, method="PATCH",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            return True, r.status
    except urllib.error.HTTPError as e:
        return False, f"{e.code} {e.read().decode()[:200]}"


def storage_upload(base, key, storage_path, local_path, content_type):
    with open(local_path, "rb") as f:
        data = f.read()
    url = f"{base}/storage/v1/object/{BUCKET}/{urllib.parse.quote(storage_path)}"
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": content_type,
            "x-upsert": "false",
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            return True, r.status
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        # 이미 존재(409) 는 멱등 관점에서 경고만
        return False, f"{e.code} {body}"


def insert_letter(base, key, row):
    data = json.dumps(row, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        f"{base}/rest/v1/letters", data=data, method="POST",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            return True, r.status
    except urllib.error.HTTPError as e:
        return False, f"{e.code} {e.read().decode()[:200]}"


# ---------- main ----------

def main():
    if "--apply" in sys.argv:
        mode = "apply"
    elif "--dry" in sys.argv:
        mode = "dry"
    else:
        print("사용법: python3 scripts/import_letters.py [--dry | --apply]")
        sys.exit(1)

    env = load_env()
    base = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    service = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    anon = env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

    if not base:
        print("[중단] .env.local 에 NEXT_PUBLIC_SUPABASE_URL 이 없습니다.")
        sys.exit(1)
    if mode == "apply" and not service:
        print("[중단] --apply 에는 .env.local 의 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.")
        sys.exit(1)

    read_key = service or anon  # user_id 조회·멱등체크 (portfolio 는 public_read 라 anon 도 가능)
    write_key = service

    if not os.path.isdir(NEWS_DIR):
        print(f"[중단] 폴더 없음: {NEWS_DIR}")
        sys.exit(1)

    user_id = None
    if read_key:
        try:
            user_id = get_user_id(base, read_key)
        except Exception as e:
            print(f"[경고] user_id 조회 실패: {e}")
    if not user_id:
        if mode == "apply":
            print("[중단] user_id 를 조회하지 못했습니다 (portfolio slug='mfh' 확인).")
            sys.exit(1)
        user_id = "<USER_ID>"  # dry 미리보기용

    folders = sorted(
        d for d in os.listdir(NEWS_DIR)
        if os.path.isdir(os.path.join(NEWS_DIR, d)) and not d.startswith(".")
    )

    print(f"=== MFH 선교편지 import ({mode}) ===")
    print(f"폴더: {NEWS_DIR}")
    print(f"user_id: {user_id}\n")

    targets, skipped_novid, dups = [], [], []
    for name in folders:
        fp = os.path.join(NEWS_DIR, name)
        meta = parse_folder(name)
        if not meta:
            skipped_novid.append((name, "폴더명 파싱 실패"))
            continue
        pdf = find_pdf(fp)
        if not pdf:
            skipped_novid.append((name, "PDF 없음 (영상/빈 폴더)"))
            continue
        meta["pdf_local"] = pdf
        meta["html_local"] = find_html(fp)  # V2: 모바일 편지 HTML (선택)
        meta["existing_cover"] = find_existing_cover(fp)
        targets.append(meta)

    ok_count = fail_count = mobile_up_count = 0
    for i, m in enumerate(targets, 1):
        pdf_path = f"{user_id}/letter-{m['date8']}.pdf"
        mobile_path = f"{user_id}/mobile-{m['date8']}.html" if m.get("html_local") else None

        # 멱등: 이미 import 된 편지면 skip — 단 html 이 있고 mobile_path 가 비어 있으면 모바일만 보강(V2)
        if read_key and user_id != "<USER_ID>":
            try:
                existing = letter_exists(base, read_key, pdf_path)
                if existing:
                    if mobile_path and not existing.get("mobile_path"):
                        print(f"[{i}/{len(targets)}] 기존 편지 + 모바일 보강  {m['folder']}")
                        print(f"        mobile-> {mobile_path}")
                        if mode == "apply":
                            ok_m, info_m = storage_upload(base, write_key, mobile_path, m["html_local"], "text/html")
                            if not ok_m and not str(info_m).startswith("409"):
                                print(f"        [실패] 모바일 업로드: {info_m}")
                                fail_count += 1
                                continue
                            ok_u, info_u = update_letter(base, write_key, existing["id"], {"mobile_path": mobile_path})
                            if ok_u:
                                print(f"        [OK] mobile_path 보강 완료")
                                mobile_up_count += 1
                            else:
                                print(f"        [실패] update: {info_u}")
                                fail_count += 1
                    else:
                        dups.append(m["folder"])
                        print(f"[{i}/{len(targets)}] SKIP (이미 존재)  {m['folder']}")
                    continue
            except Exception as e:
                print(f"  [경고] 멱등 체크 실패: {e}")

        # 표지 결정
        if m["existing_cover"]:
            cover_local = m["existing_cover"]
            cover_src = "폴더 내 이미지"
            cover_ext = os.path.splitext(cover_local)[1].lstrip(".").lower() or "png"
        else:
            cover_local = extract_cover(m["pdf_local"], m["date8"])
            cover_src = "PDF 1쪽 추출(qlmanage)" if cover_local else "추출 실패 → placeholder"
            cover_ext = "png"
        cover_path = f"{user_id}/cover-{m['date8']}.{cover_ext}" if cover_local else None

        print(f"[{i}/{len(targets)}] {m['folder']}")
        print(f"        year_month={m['year_month']}  number={m['number']}  title={m['title']}  sort={m['sort_order']}")
        print(f"        pdf  -> {pdf_path}")
        print(f"        mobile-> {mobile_path or '(없음)'}")
        print(f"        cover-> {cover_path or '(없음)'}  [{cover_src}]")

        if mode == "dry":
            continue

        # 업로드
        ok_pdf, info_pdf = storage_upload(base, write_key, pdf_path, m["pdf_local"], "application/pdf")
        if not ok_pdf:
            print(f"        [실패] PDF 업로드: {info_pdf}")
            fail_count += 1
            continue
        if mobile_path:
            ok_m, info_m = storage_upload(base, write_key, mobile_path, m["html_local"], "text/html")
            if not ok_m:
                print(f"        [경고] 모바일 업로드 실패(편지는 진행): {info_m}")
                mobile_path = None
        if cover_local:
            ct = "image/png" if cover_ext == "png" else ("image/jpeg" if cover_ext in ("jpg", "jpeg") else "application/octet-stream")
            ok_cv, info_cv = storage_upload(base, write_key, cover_path, cover_local, ct)
            if not ok_cv:
                print(f"        [경고] 표지 업로드 실패(편지는 진행): {info_cv}")
                cover_path = None

        # insert
        row = {
            "user_id": user_id,
            "year_month": m["year_month"],
            "number": m["number"],
            "title": m["title"],
            "pdf_path": pdf_path,
            "mobile_path": mobile_path,
            "cover_path": cover_path,
            "public_view": True,
            "sort_order": m["sort_order"],
        }
        ok_in, info_in = insert_letter(base, write_key, row)
        if ok_in:
            print(f"        [OK] insert 완료")
            ok_count += 1
        else:
            print(f"        [실패] insert: {info_in}")
            fail_count += 1

    # 요약
    print("\n=== 요약 ===")
    print(f"대상(PDF 있음): {len(targets)}건")
    if mode == "apply":
        print(f"insert 성공: {ok_count} / 모바일 보강: {mobile_up_count} / 실패: {fail_count} / 중복 skip: {len(dups)}")
    else:
        print("(dry-run — 업로드/insert 안 함. --apply 로 실행)")
    if skipped_novid:
        print(f"\n제외 {len(skipped_novid)}건 (PDF 없음):")
        for name, reason in skipped_novid:
            print(f"  - {name}  [{reason}]")


if __name__ == "__main__":
    main()
