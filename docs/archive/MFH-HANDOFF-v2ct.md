# MFH 핸드오프 v2ct (세션 종료)

> 이전: `v2cs`(일지 상세 사진 밴드). 이번 세션: **6월호 편지 연락처 QR 개편** — 카카오 QR 신규 생성·링크화, MFH QR 링크화, 모바일 배치 변경, 앱 스토리지 서빙본 교체. 앱 버전 3.4.0 유지.

---

## 현재 위치 (한 줄)
**6월호(#2606) 연락처 QR 개편 배포 완료 + 실기기 확인 성공.** 다음 = **설교문 피드백 반영** 또는 **편지 #2607** 준비.

---

## 이번 세션 작업

### 6월호 편지 연락처 QR 개편 (커밋 `956af37`·`5c38d7c`, push 완료)
- **카카오 QR 신규 생성**: 라이언 카드 이미지 → **QR 단독 이미지**로 교체. 원본 QR을 디코딩해 같은 링크(`https://qr.kakao.com/talk/hzQB2A9YlsL550oRrEI5e_yvT7k-`)로 고해상도 QR 생성(진회색 모듈 + 중앙 말풍선), 스캔 디코딩 검증 완료.
  - 자산: `letter-templates/assets/kakao-qr-code.png` (각 호 `photos/` 에 복사, `photos-web/kakao-qr-code.jpg` 병행)
- **두 QR 패널 모두 터치 링크**: MFH 패널 → `https://mfh-snowy.vercel.app/p/mfh`(공개페이지, mfh-qr.png 디코딩으로 확인) / 카카오 패널 → 위 카카오 링크. 카카오 ID `woojin22` 항상 기재.
- **모바일 배치**: 카카오 카드를 **MFH QR 카드 바로 아래**로 이동(Facebook·YouTube·이메일 행보다 위).
- **재빌드·서빙 교체**: `letter-mobile.html`·`letter-cardnews.html` 수정 → 공유 HTML·PDF 재빌드 → **Supabase Storage `portfolio-letters` 버킷 기존 경로에 upsert 덮어쓰기**. 공개 URL 서빙 내용 검증 완료.
- 규칙 명문화: `docs/MFH-LETTER-AGENTS.md` §6(마감 카드 고정 요소)·§7(자산 표) — **7월호부터 designer·assembler 자동 적용**.

### 함정 (편지 개정 시 — 중요)
- **앱에 등록된 편지는 로컬 수정만으로 반영 안 됨.** letters 레코드의 `mobile_path`/`pdf_path` 가 가리키는 Storage 객체를 **같은 경로에 upsert** 해야 함 (`.env.local` SERVICE_ROLE_KEY, supabase-js `storage.upload(..., {upsert:true})`). DB 레코드는 건드리지 않음.
  - 2606 경로: `portfolio-letters/6920f3d8-.../mobile-20260630.html`·`letter-20260630.pdf`
- **재빌드는 반드시 photos-web 스왑 후**: `src="photos/X.*"` → `photos-web/X.jpg`(존재 시)로 치환한 임시 HTML로 `tools/build-letter.py` embed/pdf 실행. 원본 photos 로 빌드하면 26MB → 117~156MB 로 폭증.
- QR 디코딩은 cv2 기본 detector 실패 — **opencv-contrib `wechat_qrcode_WeChatQRCode`** 사용 (스크래치패드 venv).

## 우진 확인 대기 (v2cq 이월)
1. 온두라스 소개 2면 수치 검수 (H1 보고서).
2. SEED 소개 면 문구 (seedtoday.org 기준).
3. 설교 실전 정보 — 대상 교회·예배 종류 확정 시 맞춤 수정.

## 다음 작업
1. 설교문 피드백 반영 (`reports/2026-H1/06-sermon-manuscript.md`).
2. 편지 #2607 (7/2~, ICMS 훈련 — 온라인 7/6~17, 대면 7/20~8/14) — 마감 카드에 새 QR 규칙 적용.
3. (선택) 내부 페이지 와이드 레이아웃 확대 검토.
4. 백로그: import_letters V3 / 리허설 노트 / v2ck 앱 백로그.

## 빌드·검증 함정 (변동 없음 — v2ck·v2cl 참조)
- 앱 코드 변경 없음(문서·자산·편지 파일만). worktree 심링크 / prettier 금지 / push 명시 승인.

## 참고
- 미커밋 잔여(이번 세션과 무관, 커밋 제외 유지): `CLAUDE.md`, `flyers/dongsan-2026-07/*`, `scripts/measure-usage.ts`, `reports/2026-H1/06-sermon-manuscript.md`(피드백 후 커밋 예정).
- 메모리 `kakao-contact-qr.md` 에 ID·링크·자산 경로·Storage 덮어쓰기 절차 기록됨.

---

*작성: 2026-07-15 세션. 6월호 연락처 QR 개편 배포·확인 완료. 직전 v2cs→archive.*
