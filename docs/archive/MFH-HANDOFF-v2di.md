# MFH 핸드오프 v2di (세션 종료)

> 이전: `v2dh`(인앱 성경 본문 이식 · 3.6.0). 이번 세션(2026-09-25): **아이패드 하단 탭바 스크롤 버그 수정** — 위로 스크롤(오버스크롤·모멘텀) 시 fixed 탭바가 콘텐츠와 함께 끌려 올라가던 현상. 앱 버전 **3.6.0 유지**(PATCH 후보, "버전" 요청 시 검토).

---

## 현재 위치 (한 줄)
**탭바 고정 수정 배포(`f54254c`)·아이패드 실기기 확인 성공.** 다음 = v2dh 이월 과제(letter 프롬프트 관찰 · 9월호 제작).

---

## 변경 파일

| 파일 | 내용 |
|---|---|
| `app/globals.css` | `html { overscroll-behavior-y: none }` — 루트 러버밴드 차단 · `body::before`(전역 SVG 노이즈 fixed 오버레이) 에 `transform: translateZ(0)` — 스크롤 중 재합성(tearing) 방지 |
| `components/BottomNav.tsx` **V3** | `<nav>` style 에 `translate3d(0,0,0)` · `WebkitBackfaceVisibility: hidden` · `willChange: transform` — 독립 합성 레이어로 고정 |

- 원인 추정: iOS/iPadOS 루트 오버스크롤 + 전체화면 fixed 노이즈 레이어 재합성. 두 처치 병행으로 해결(개별 기여도는 미분리).
- 부작용: 오버스크롤 차단으로 pull-to-refresh 없음(PWA standalone 은 원래 없음).

## 다음 과제
1. (v2dh 이월) letter 프롬프트 실사용 관찰(최신호 = kind letter 기준 로그 확인) · 9월호 제작(`#2609`, `set-letter-summary.mjs --period 2609`) · 인사 카드 kind 토글 UI · 회계 계좌 후속 · 공유본 빌드/OG 스크립트화.
2. 성경 본문 원자료 보정이 Manna 에서 생기면 `npx tsx scripts/bible-seed.ts <ver>` 재시딩만.
3. 다른 fixed 하단 요소(`components/SelectionBar.tsx`, `app/accounting/AccountingNav.tsx`, `app/supporters/SupportersNav.tsx`)에서 같은 증상이 보이면 BottomNav V3 와 동일한 style 적용.

## 유의 사항
- **git 환경**: `/usr/bin/git` 실패 시 `/Library/Developer/CommandLineTools/usr/bin/git`(메모리). 이번 세션 `git` 정상.
- **빌드 잡음**: 미커밋 `docs/bible-qt-kit/` 발췌 `.tsx` 때문에 `npx tsc`·`npm run build` 타입 단계 실패. 로컬 검증은 `npx tsc --noEmit | grep -v "^docs/bible-qt-kit"`. Vercel 무관(git 에 없음).
- 미커밋 잔여물(그대로 둠): `flyers/dongsan-2026-07/`(수정 2건 + `_slim_frame.py`), `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts`, `docs/bible-qt-kit/`, `letter-templates/assets/2026추석.heic`.
- 핸드오프 아카이브: `v2dh` → `docs/archive/` 이동.
