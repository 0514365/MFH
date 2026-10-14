# MFH 와이드 레이아웃 설계 — 데스크탑·iPad 가로 3단 셸 (초안 v1, 2026-10-13)

> 목표: 데스크탑과 iPad 가로 모드에서 **Manna 처럼 좌(사이드바)·우(보조 패널)를 메뉴·요약 공간으로 활용**한다.
> 모바일(<768px)은 지금 그대로(하단 탭바 + 세로 스택). 참조 구현 = `../Manna` 의 `AppShell · SideNav · AsidePanel · Page · lib/nav.ts`.

---

## 0. 현재 상태 요약

| 항목 | MFH 현재 | Manna(참조) |
|---|---|---|
| 셸 | 없음. `app/layout.tsx` = children + `BottomNav`(fixed, 경로 가드) | `app/(app)/layout.tsx` 라우트 그룹 → `AppShell` 3단 |
| 상단 | 페이지마다 `PageHeader`(로고→홈 · 제목 · 캘린더 · action · 로그아웃) | `TopBar`(홈에서는 숨김) |
| 본문 폭 | 페이지마다 제각각(`max-w-md` → `min-[740px]:max-w-5xl` / `lg:max-w-6xl` …) | `<Page>` 한 컴포넌트(480 / md 1200) |
| 내비 정의 | `BottomNav.tsx` 안에 하드코딩(4탭+홈) · 홈 타일 별도 | `lib/nav.ts` 단일 출처(사이드바·레일·하단 탭 공용) |
| 서브 브랜치 | `/accounting`·`/supporters` 는 자체 레이아웃·4탭 네비, 전역 탭바 숨김 | 없음 |
| 셸 밖 | `/login`, `/p/*`(공개) | `/login /signup /pending` |

---

## 1. 반응형 단계 (핵심 결정)

iPad 가로 = 1024(mini)·1180(10세대)·1194(Pro 11)·1366(Pro 12.9). Manna 를 그대로 쓰면 lg(1024)에서 200+260=460px 을 양옆이 차지해 iPad mini 가로 본문이 564px 로 좁다. → MFH 는 **한 단계 더 쪼갠다**.

| 구간 | 폭 | 좌 | 본문 | 우 | 하단 탭바 |
|---|---|---|---|---|---|
| 모바일 | <768 | — | 현재 그대로 | 없음(홈이 같은 정보를 담음) | 표시 |
| md · iPad 세로 | 768~1023 | 아이콘 레일 72 (툴팁) | flex-1 | 없음 | 숨김 |
| lg · iPad 가로 | 1024~1279 | 아이콘 레일 72 | flex-1 (≥712) | 보조 패널 240 | 숨김 |
| xl · 데스크탑 | ≥1280 | 사이드바 200 (아이콘+라벨) | flex-1, max 1200 | 보조 패널 260 | 숨김 |

- 좌·우 모두 `sticky top-0 h-screen`, 레일/사이드바는 `overflow-y-auto`(항목 많음).
- iPad 가로에서 Safari 주소창 포함 시 세로 744~. 레일 항목 40px 로 유지.

---

## 2. 좌측 내비 — `lib/nav.ts` 단일 출처 (신규)

Manna 와 같은 타입: `{ href, label, icon, group, finance? }`. **그룹 구분선**으로 묶고, 부부 전용(회계·후원자)은 `canManageFinance` 일 때만.

| 그룹 | 항목(순서) | 비고 |
|---|---|---|
| — | 홈 | |
| 기록 | 일지 · 프로젝트 · 할 일 · 캘린더 · 사진 | 4모듈 + 캘린더·사진 |
| 말씀 | QT · 통독 · 성경 · 중보기도 | `/qt /bible /bible/study /intercessions` |
| 분석·소통 | 인사이트 · 동향 · Facebook · 포트폴리오 | `/insights /honduras /facebook /portfolio` (`/letters` 는 색인 없는 공개 뷰어라 제외) |
| 관리(부부) | 후원자 · 회계 | `finance: true` |
| 하단 고정 | 주제·목표(/theme) · 로그아웃 | Manna 의 「내 정보」 자리 |

- 활성 판정 = Manna `activeHref`(가장 긴 prefix). `/bible` vs `/bible/study` 충돌 해결됨.
- 아이콘: `ModuleIcon` 에 `qt · intercessions · honduras · facebook · letters · supporters · accounting · theme · home` 추가(현재 `app/page.tsx` 인라인 SVG 를 옮긴다).
- 하단 탭바(`BottomNav`)는 그대로 두되 항목을 `nav.ts` 에서 읽도록만 바꾼다(화면 변화 없음).

---

## 3. 우측 보조 패널 — `AsidePanel`(MFH 판)

Manna = 내 그룹 · 승인 대기 · 내 걸음 · 이번 주. MFH 는 **"오늘 바로 눌러야 할 것"** 요약으로 구성(레이아웃에서 서버 조회, 전 페이지 공통):

| 섹션 | 내용 | 링크 | 데이터 출처(이미 홈에서 조회 중) |
|---|---|---|---|
| 신호 | 프로젝트·할 일의 overdue / soon / stalled / important 칩 | /projects · /tasks | `lib/signals` |
| 오늘의 말씀 | QT 제목 한 줄 + 통독 오늘 분량·진행률 | /qt · /bible | `qt_entries` 최신 · `reading_plans` 활성 |
| 중보·동향 | 미읽음 중보기도 n · 최신 브리핑 제목 | /intercessions · /honduras | `prayerQ` · `news` 최신 |
| 이번 달 | 일지 n건 · 최근 편지 호수·제목 | /journal · /portfolio | `journal_entries` 월 count · `letters`(kind=letter) 최신 |

- 구현 위치: `lib/aside.ts` `loadAside()` 를 셸 레이아웃(`app/(app)/layout.tsx`)이 호출 → `AppShell aside=<AsidePanel/>`.
- 홈의 좌열(주제 hero · QT · 통독 · 동향)과 **중복** → 홈의 QT·동향 카드는 `lg:hidden`(lg 이상은 패널이 담당, 모바일·iPad 세로는 홈 그대로). 주제 hero·통독 카드는 홈 유지.
- **lg 미만에서는 패널을 렌더하지 않는다**(Manna 는 본문 아래 배치하지만 MFH 는 홈이 이미 같은 정보를 담아 중복·페이지 길이 증가만 남음).
- 주의: App Router 레이아웃은 클라이언트 내비게이션에서 재렌더되지 않아 패널 수치는 `revalidatePath`/`router.refresh`/전체 로드 때 갱신된다.

---

## 4. 구조 — 라우트 그룹 vs 루트 레이아웃 게이트

| 안 | 방법 | 장점 | 단점 |
|---|---|---|---|
| **A. 라우트 그룹 `app/(app)/`** (추천) | 셸 대상 폴더를 `app/(app)/` 로 `git mv`. `/login`·`/p` 는 밖에 둠 | Manna 와 동일 · 셸 레이아웃에서 서버 데이터 조회가 자연스러움 · URL 불변 | 파일 이동 커밋이 큼(`git mv` 라 diff 는 rename) · 상대 import 3곳 수정(`app/page.tsx` 의 `../package.json`, `./p/portfolio-theme.css`, `./SplashGate`) |
| B. 루트 레이아웃 + 경로 게이트 | `app/layout.tsx` 에 `AppShell` 두고 클라 `usePathname` 으로 `/login`·`/p` 는 셸 생략 | 파일 이동 없음 | 서버 레이아웃이 경로를 몰라 공개 `/p` 요청에서도 보조 패널 데이터를 조회(낭비) · 비로그인 처리 꼬임 |

→ **A 추천.** 이동 대상: `page.tsx journal projects tasks insights calendar qt bible photos intercessions honduras facebook portfolio supporters accounting theme`. 남는 것: `layout.tsx globals.css icon.png api auth login p letters`(`/letters/view/[id]` 는 공개 편지 뷰어 라우트). `SplashGate` 는 `/p` 와 공유하므로 `components/` 로 이동.

`/accounting`·`/supporters` 는 셸 안에 들어가되 자체 4탭 서브 네비는 유지(모바일). md 이상에서는 그 서브 네비를 상단 세그먼트로 바꾸는 건 후속.

---

## 5. 본문 폭 — 컨테이너 기준으로 전환

문제: 홈 등은 `lg:grid-cols-12` 처럼 **뷰포트** 기준인데, 셸 안에서는 본문 열이 뷰포트보다 312~460px 좁다(iPad 가로 1024 → 본문 712).

| 안 | 방법 | 비고 |
|---|---|---|
| **① 컨테이너 쿼리** (추천) | `@tailwindcss/container-queries` 플러그인 추가, 본문 열에 `@container`, 페이지는 `@lg:grid-cols-12` 식으로 치환 | Tailwind 3.4 OK · 페이지별 치환은 점진 |
| ② 브레이크포인트 재조정 | 각 페이지의 `lg:` 를 `xl:` 로 올림 | 빠르지만 iPad 가로에서 와이드 레이아웃 손해 |

→ ① 채택. 임계값 매핑 = `sm:`·`min-[740px]:` → `@xl:`(576) · `lg:` → `@4xl:`(896). 데스크탑 1440(본문 980)은 12열, iPad 가로(본문 712~868)는 2열 그룹. 예외: 홈 QT·동향 카드의 `lg:hidden` 은 보조 패널 표시(뷰포트 lg)와 같은 기준이라 뷰포트 그대로 둔다. 단 **phase 로 분리**: 셸 먼저 붙이고(기존 페이지는 좁아져도 깨지진 않음 — `mx-auto max-w-*` 라 중앙 정렬 유지), 홈 → 목록 3종(일지·프로젝트·할 일) → 나머지 순으로 컨테이너 쿼리 치환.

공통 `<Page>` 래퍼(Manna V3 식)는 치환 때 함께 도입: `mx-auto w-full px-4 max-w-[480px] sm:max-w-none md:max-w-[1200px]`.

---

## 6. 단계 계획

| 단계 | 작업 | 산출 |
|---|---|---|
| a ✅ | `lib/nav.ts` + `ModuleIcon` 아이콘 보강 + `BottomNav` 가 nav.ts 를 읽도록(화면 불변) | 내비 단일 출처 |
| b ✅ | 라우트 그룹 `app/(app)/` 이동 + `AppShell`(좌 레일/사이드바 · 우 패널 자리) + `SideNav` · `BottomNav` md 숨김 | 3단 골격(보조 패널은 자리만) |
| c ✅ | `AsidePanel` 4섹션 + `lib/aside.ts` 서버 조회 · 홈 QT·동향 카드 `lg:hidden` | 우측 완성 |
| d ✅ | `@tailwindcss/container-queries` + AppShell 본문 열 `@container` · 홈·일지·프로젝트·할 일·인사이트 73곳 치환(`sm:`/`min-[740px]:` → `@xl:` 576 · `lg:` → `@4xl:` 896). `<Page>` 래퍼는 도입 안 함 | iPad 가로 본문 최적화 |
| e | 회계·후원자 서브 네비 md+ 상단 세그먼트 · 나머지 페이지 폭 치환 | 마무리 |

각 단계 끝에 `npx tsc --noEmit` + `npm run build`, 실기기(iPad 가로·데스크탑) 확인 후 다음 단계.

---

## 7. 유의

- `docs/bible-qt-kit/` 의 `*.excerpt.tsx` 가 로컬 빌드를 깨뜨림(핸드오프 v2dm) — b 단계 전 tsconfig `exclude` 정리 선행 권장.
- `body:has(.app-theme)` 가 배경을 흰색으로 바꾸므로 셸(레일·패널)은 `bg-surface`/`border-line` 토큰으로 맞춘다(종이 노이즈는 `.app-theme` 에서 이미 꺼짐).
- `main.bible-study-main` 높이 계산(`100svh − 76px 탭바`)은 md 이상에서 탭바가 사라지므로 `md:` 에서 76px 을 빼지 않도록 수정.
- 다크 모드는 범위 밖(Manna 와 달리 MFH 는 라이트 고정).
