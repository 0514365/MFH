# MFH 핸드오프 v2dy (세션 종료)

> 이전: `v2dx`(2027 개정 1~4-7, `docs/archive/`). 이번 세션(2026-10-23): **4-8 포트폴리오(내부)·주제 → 4-9 브릿지 정리 → 회계 데스크탑 잔여 a·b**. 단계마다 미리보기 → 결정 → 적용 → 빌드 → 푸시 → 실기 「성공」. 앱 버전 **3.8.0 유지**(다음 "버전" 때 누적 검토 — 앱 안 개정 완료, 5단계까지 끝나면 MAJOR `4.0.0` 후보).

---

## 현재 위치 (한 줄)
**앱 셸 안 전 화면 2027 개정 완료.** 남은 것 = **5단계: 로고 재채색 → 스플래시·로그인·PWA 아이콘·`themeColor` → 공개 `/p`** + 잔여 그림자 모달 2개.

---

## 이번 세션 커밋 (전부 origin/main · 실기 성공)
| 커밋 | 단계 | 내용 |
|---|---|---|
| `cc2ea08` | 4-8 | 포트폴리오 편집: 52px 헤더 [공개\|비공개] 알약 + 남색 저장 · 라벤더 상태 줄 · 그룹 = 타이틀 알약(건수) · 편지/연혁/영상 = 2줄 행 + 탭 펼침 패널 · CSV 「도구」 접힘 · 공용 클래스 `portfolio/ui.ts`. 주제: 빨간 ‹ · **[올해\|내년] 연도 알약**(내년 저장 = 화면 유지 + 안내) · 홈 카드 실시간 미리보기 · 목표 한 줄씩 + 터키석 ＋ |
| `085c934` | 4-9 | `.theme-2027` 를 **`AppShell` 맨 바깥 1회**로(페이지별 29곳 제거) · `.app-theme` 잔재·`projects/Progress.tsx` 삭제 · 홈 env 화면 남색 · 마룬 `light` 는 셸 밖 전용 주석 |
| `3128da3` | 회계 a | 기록 폼 = 연회색 면 + 흰 칸 · 구분 4칸 의미색(선택 칸만) · 최근 입력 타이틀 알약 + 2줄 행 · CSV·영수증 칸 · 승인대기 = 홈과 같은 상태 알약 · 카드 미상환 줄 연한 빨강 · 검색 합계 면 · 빈 상태 8곳 · `SearchFilters`(내역 탭 공유) 테두리 제거 · `amtColor` 2027 색 |
| `98a21f6` | 회계 b | 승인함 섹션 타이틀 알약(승인 터키석 · 되돌리기 연한 빨강) · 모달 5종 = 그림자 없는 흰 시트 24px + Manrope 제목 + 「닫기」 회색 알약 · 계좌 추가 면 · `charts.tsx` 미사용 코드 삭제 |
| (이번) | — | 핸드오프 v2dy · 디자인 문서 §9 갱신(4-8·4-9·회계 완료, `/p` 결정) |

## 확정된 결정 (이번 세션)
- **공개 `/p`**: 5단계에서 로고 색 확정 후 `/p`·로그인·스플래시를 한 번에 2027 로. 사진 중심 레이아웃 유지, 색·글꼴·버튼만. 마룬 `light` 토큰·`portfolio-theme.css` 정리 범위도 그때.
- **2027 브릿지 위치**: 루트 `:root` 승격 대신 앱 셸(`components/AppShell.tsx`)에 1회. 셸 밖(/p · /login · /letters · 스플래시)은 마룬 그대로.
- **포트폴리오 모듈색** 5 라벤더(틴트 `#F1EFFA` · 진한 톤 `#4E39C6`) · 주제 화면 = 홈 카드 살구 `#FDE6C1`.
- **모달 문법**: 그림자 없는 흰 시트 `rounded-3xl` · 제목 Manrope 16/600 · 「닫기」 = `bg-b27-card` 알약 · 시트 안 입력 = 연회색 면, 연회색 면 안 입력 = 흰 면.
- 회계 구분 4칸 = 선택 칸만 의미색(지출 `expense-soft` · 수입 `income-soft` · 이체 `tint-8` · 조정 `card`).

## 코드 위치 (새로 생긴 것)
- `app/(app)/portfolio/ui.ts` — 포트폴리오 편집 공용 클래스(입력·행동·저장·도구·삭제·패널·행).
- `app/(app)/theme/page.tsx` — 연도 상태(`year`) · 목표 배열 입력.
- `components/AppShell.tsx` — `.theme-2027` 부착 지점.

## 운용 (git 밖)
- 빌드 검증: `npm ci`(새 컨테이너) → `npx tsc --noEmit` → `npm run build`.
- 일괄 토큰 치환 스크립트(세션 스크래치, 보관 안 함): 옛 클래스 → b27(`text-muted→text-b27-muted`, `font-bold→font-semibold`, `font-display→font-num` …). 다음에 쓰려면 같은 매핑으로 다시 작성.
- 미리보기 아티팩트(우진 계정 비공개): 포트폴리오·주제 https://claude.ai/artifact/XzvQ27gQpZTUrc47NN6DP8 · 회계 데스크탑 https://claude.ai/artifact/9HuMLGSkb2EyLNmbCsChKY (이전 것은 v2dx 참조)
- 미커밋 잔여물(v2dx 와 동일, 로컬 Mac 쪽): `flyers/dongsan-2026-07/` · `applications/` · `reports/2026-H1/06-sermon-manuscript.md` · `scripts/measure-usage.ts` · `docs/bible-qt-kit/` · `letter-templates/assets/2026추석.heic`.

## 다음 과제
0. **5단계** — ① 로고 재채색(남색·터키석) 시안 → ② 스플래시(`globals.css` `.splash-overlay` 마룬 배경)·로그인(`app/login/page.tsx` `text-primary/accent`)·PWA 아이콘·`app/layout.tsx` `themeColor #661F20` → 흰색 → ③ 공개 `/p`(`portfolio-theme.css` · `OwnerBar` `bg-primary` 포함) → ④ 마룬 `light` 토큰 정리 → ⑤ 편지 템플릿(2027호부터).
1. 잔여 그림자 모달: `app/(app)/bible/RebalanceButton.tsx` · `components/RecurrenceScopeModal.tsx` → 시트 문법.
2. 선택: 후원자 현황 「최근 연락」 목록 · 다크 모드(범위 밖).
3. 이월: 11/3 이후 10월 마감 확인 · 11/13·11/15 카드 명세서 대조 · **10월호(MFH #2610)** 11월 초 착수.

## 다음 세션 시작 프롬프트(복사용)
```
docs/MFH-HANDOFF-v2dy.md 와 docs/MFH-DESIGN-2027.md 를 읽고 시작. 2027 개정 5단계 — 로고 재채색 시안부터. 단계마다 미리보기 → 승인 → 적용, 커밋·푸시는 내가 말할 때만.
```
