# MFH 핸드오프 v2cz (세션 종료)

> 이전: `v2cy`(10개년 사역계획서 완성). 이번 세션: **MFH 브랜드 메일 서명 제작·전 기기 적용** — Gmail 웹 / 맥 Mail 앱 / 아이폰·아이패드용 3종. 앱 버전 3.4.0 유지(코드 변경은 `public/` 로고 2파일 추가뿐).

---

## 현재 위치 (한 줄)
**메일 서명 완성·배포 완료.** 맥 Mail 서명은 파일 직접 심기 + 잠금으로 적용 완료, 모바일은 우진 셀프 등록 절차 안내 상태. 다음 = v2cy 이월 과제(건축 예산 개정판 등).

---

## 이번 세션 작업

### 1. 메일 서명 3종 (`email-signature/`, 이번 커밋)

**확정 디자인(A안)**: 로고 좌측 + 마룬(#661F20) 세로 구분선 + 우측 텍스트 블록.
내용 = 김우진 선교사(검정 18px bold) · Woojin Kim · Mission for Honduras · 온두라스 산페드로술라 · T +504 9848 9405 · K 카카오톡 woojin22(QR 링크) · W mfh-snowy.vercel.app/p/mfh. **이메일 주소는 제외**(우진 지시). 폰트 11~18px(본문 13px 대비 비율 확정), 로고 141×44px.

| 파일 | 용도 |
|---|---|
| `sig-a-hosted.html` | **Gmail 웹 서명용 최종본** — 로고를 호스팅 URL로 참조. 브라우저로 열어 전체복사 → Gmail 설정 서명란 붙여넣기 |
| `sig-a-mobile.html` | **아이폰·아이패드용** — 로고 없음(iOS 서명란 이미지 미지원), 폰트는 A안과 동일 비율(18/11px) |
| `sig-a.html` | base64 내장 로고판(로컬 예비 — Gmail 수신측에서 로고 차단되므로 발송용으론 쓰지 않음) |
| `sig-b/c.html`, `preview.html` | 미채택 시안(B 타이포/C 컴팩트), 시안 미리보기 |
| `logo-sig.png`, `logo-trim.png` | 로고 소스(360px판, 투명여백 트림판) |

### 2. 로고 호스팅 (커밋 `1d63f0f`, `183da7c`, push 완료)

- `public/logo-sig.png` (360px) → **`public/logo-sig2.png` (141×44px)** 추가. 서명은 **logo-sig2 사용**.
- 141×44 인 이유: **맥 Mail이 서명 이미지를 HTML 지정 크기 무시하고 원본 픽셀 크기로 표시**하기 때문에 표시 크기 그대로 만든 것. 파일명을 바꾼 이유는 Gmail 이미지 프록시가 구버전(360px)을 캐시하기 때문.
- base64 내장 로고는 Gmail 수신 화면에서 차단됨(빈 박스) → 호스팅 URL 방식으로 확정.

### 3. 맥 Mail 앱 서명 — 파일 직접 심기 + 잠금 (적용 완료)

- 대상 파일(로컬+iCloud 사본 2곳, **UUID `1B7BD6F9-83B3-4D49-A6A1-1EDEE59A2DB0`**):
  - `~/Library/Mail/V10/MailData/Signatures/<UUID>.mailsignature`
  - `~/Library/Mobile Documents/com~apple~mail/Data/V4/Signatures/<UUID>.mailsignature`
- 심기 절차: Mail 종료 → 파일 내용을 `sig-a-hosted.html`의 `<table>` 조각으로 교체(헤더 Message-Id/Mime-Version 유지, Content-Type text/html; 8bit) → **`chflags uchg` 잠금** → Mail 재실행.
- **잠금 이유**: Mail이 재저장하면서 원격 이미지를 내장 첨부로 바꾸고 2단 테이블을 해체(로고가 윗줄로 분리)하는 문제 발견 → 잠가서 차단. 원본 백업 `.mailsignature.bak` 있음.
- **서명 수정 시**: `chflags nouchg` 해제 → 파일 수정 → `chflags uchg` 재잠금 (Mail 설정 화면에서 고치면 저장 안 됨).

### 4. 아이폰·아이패드 (우진 셀프 등록, 절차 안내 완료)

셀프 메일 전송 → 아이폰 Mail에서 서명 텍스트 복사 → 설정>Mail>서명(계정별)에 붙여넣기 → **즉시 흔들어 "속성 변경 실행 취소"**(색·굵기 복원 트릭, iPad는 세 손가락 왼쪽 쓸기). iOS 서명란은 공식적으로 서식·이미지 미지원이라 이 트릭이 안 먹히면 무채색 텍스트가 한계.

### 5. 기타
- **김세업 목사님(예수소망교회) 회신 메일 초안 — 우진 지시로 취소.** `applications/2026-08-jesushope/`는 v2cy대로 보류·미커밋 유지.

---

## 다음 과제 (v2cy 이월)

1. **건축 예산 개정판** — 시공 견적 확정 후 `plan-letter.html` 3-4에 항목별 내역 추가 → 03 PDF 재출력 (계약 2026.9–10 예정, 우진 귀국 8.31 후).
2. Word 양식·02-본문의 잔여 차이 정리(우진 편집본 기준).
3. `applications/` 예수소망교회 건 — 회신 초안은 취소됐고 재개 여부는 우진 지시 대기.
4. 모바일 서명 등록 결과 확인(트릭 실패 시 무채색 레이아웃 다듬기).

## 유의 사항 (다음 세션)

- 미커밋 잔여물: `flyers/dongsan-2026-07/` 수정 2건 + `_slim_frame.py`, `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts` — 이번 세션과 무관, 손대지 않음.
- 맥 Mail 서명 파일은 잠금 상태 — 수정 요청 오면 위 3번 절차대로.
- 핸드오프 아카이브: `v2cy` → `docs/archive/` 이동 완료.
