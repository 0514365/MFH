# MFH 핸드오프 v2cw (세션 종료)

> 이전: `v2cv`(마크다운 인용 볼드). 이번 세션: **회계·후원 하단 네비에 중앙 메인홈 FAB 추가** — UI 패치 1건 배포. 앱 버전 3.4.0 유지.

---

## 현재 위치 (한 줄)
**회계·후원 브랜치 하단 탭바를 메인 홈 탭바와 동일한 5버튼(중앙 홈 FAB) 구조로 통일·배포 완료.** 다음 = **설교문 피드백 반영** 또는 **편지 #2607** 준비.

---

## 이번 세션 작업

### 회계·후원 하단 네비 중앙 홈 버튼 (커밋 `1c3e9a9`, push 완료)
- `app/accounting/AccountingNav.tsx` (마커 V1→V2): 4탭 균등 → **요약 · 기록 · [홈] · 내역 · 분석**.
- `app/supporters/SupportersNav.tsx` (마커 V1→V2): 4탭 균등 → **현황 · 명단 · [홈] · 등록 · 분석**.
- 중앙 홈 = `components/BottomNav.tsx` 와 동일 패턴 — 마룬(`#b61821`) 원형 FAB, 흰 집 아이콘(Feather home), `-translate-y-4` 로 탭바 위 돌출, 라벨 없음, `href="/"` · `aria-label="메인홈"`.
- 구조: `TABS` → `LEFT_TABS`/`RIGHT_TABS` 분리 + `TabLink`·`HomeIcon` 추출. `ul` 정렬 `items-stretch` → `items-end`. 스페이서 68px·safe-area 유지(콘텐츠 가림 없음).
- 두 `layout.tsx` 상단 주석 문구만 "4탭 하단 네비" → "하단 네비(4탭 + 중앙 홈)".
- 헤더 우측의 메인홈 아이콘은 **의도적으로 유지**(우진 결정 — 중복이지만 그대로 둠).
- 검증: `npx tsc --noEmit` 통과 → 푸시 → 우진 실기기 확인 **성공**. (두 페이지는 로그인+재정관리자 가드라 로컬 프리뷰 확인 불가.)

### 세션 외 문서 커밋 (v2cv 이후, 참고)
`3b2be19` 사역 기도제목 가이드라인 정정 · `33a81b0` 편지 릴리스에 `letters.summary` 필수 단계화.

## 우진 확인 대기 (v2cq 이월)
1. 온두라스 소개 2면 수치 검수 (H1 보고서).
2. SEED 소개 면 문구 (seedtoday.org 기준).
3. 설교 실전 정보 — 대상 교회·예배 종류 확정 시 맞춤 수정.

## 다음 작업
1. 설교문 피드백 반영 (`reports/2026-H1/06-sermon-manuscript.md`).
2. 편지 #2607 (7/2~, ICMS 훈련) — 마감 카드에 새 QR 규칙 적용.
3. (선택) 내부 페이지 와이드 레이아웃 확대 — 다음 후보: 할 일(Tasks) 상세, 후원자 상세.
4. 백로그: import_letters V3 / 리허설 노트 / v2ck 앱 백로그.

## 함정 (이월, 변동 없음)
- **Vercel 배포 누락 시**: GitHub 장애 여부 먼저 확인(githubstatus.com). 복구되면 밀린 웹훅이 소급 실행됨. CLI 배포(`npx vercel deploy --prod`)는 우진 직접 실행 필요.
- 회계·후원 화면은 인증+`canManageFinance` 가드 → 로컬 브라우저 검증 불가, 배포 후 실기기 확인이 유일한 경로.
- worktree 심링크 / prettier 금지 / push 명시 승인 (v2ck·v2cl 참조).

## 참고
- 미커밋 잔여(이번 세션과 무관, 커밋 제외 유지): `flyers/dongsan-2026-07/*`(+`_slim_frame.py`), `applications/`, `scripts/measure-usage.ts`, `reports/2026-H1/06-sermon-manuscript.md`(피드백 후 커밋 예정).

---

*작성: 2026-08-11 세션. 회계·후원 중앙 홈 FAB 배포·확인 완료. 직전 v2cv→archive.*
