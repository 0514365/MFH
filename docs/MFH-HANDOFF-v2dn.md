# MFH 핸드오프 v2dn (세션 종료)

> 이전: `v2dm`(RVR1960 성경 추가 · 3.7.0). 이번 세션(2026-10-13~14): **데스크탑·iPad 가로 3단 셸**(Manna 방식 좌 사이드바 · 우 보조 패널) a·b·c·d·e 단계 전부 구현. 설계 정본 = `docs/MFH-WIDE-LAYOUT-DESIGN.md`.

---

## 현재 위치 (한 줄)
**3단 셸 a~e 완료**(내비 단일 출처 · 라우트 그룹 셸 · 우측 보조 패널 · 컨테이너 쿼리 폭 · 회계·후원자 상단 세그먼트). a~d 실기기 「성공」, e 는 빌드 통과 후 실기기 확인 대기. 다음 = e 확인 → 버전 제안(MINOR 후보) → 10월호.

---

## 이번 세션 결과

### 반응형 단계(설계 §1)
| 구간 | 폭 | 좌 | 우 | 하단 탭바 |
|---|---|---|---|---|
| 모바일 | <768 | — | — | 표시(기존 그대로) |
| md · iPad 세로 | 768~1023 | 아이콘 레일 72 | — | 숨김 |
| lg · iPad 가로 | 1024~1279 | 아이콘 레일 72 | 보조 패널 240 | 숨김 |
| xl · 데스크탑 | ≥1280 | 사이드바 200(라벨) | 보조 패널 260 | 숨김 |

### 파일
| 블록 | 결과 |
|---|---|
| 내비 단일 출처 | `lib/nav.ts` V1 — `SIDE_NAV` 16항목 4그룹(홈 / 기록 / 말씀 / 분석·소통 / 관리=부부 전용 `finance`) · `THEME_NAV` · 하단 탭 `BOTTOM_*` · `activeHref`(최장 prefix) · 숨김 경로 |
| 아이콘 | `components/ModuleIcon.tsx` V3 — home·qt·reading·heart·news·facebook·supporters·accounting·theme·signout 추가 |
| 하단 탭바 | `components/BottomNav.tsx` V4 — nav.ts 를 읽음, `md:hidden` |
| 셸 | `components/AppShell.tsx` V2 · `components/SideNav.tsx` V1(레일/사이드바 겸용, 그룹 구분선, 하단 주제·목표+로그아웃) · `components/AsidePanel.tsx` V1(신호 · 오늘의 말씀 · 중보·동향 · 이번 달) · `lib/aside.ts` V1(`loadAside`) |
| 라우트 그룹 | 멤버 페이지 16폴더 → `app/(app)/`(`git mv`, URL 불변). `app/(app)/layout.tsx` V2 = 비로그인 → /login · finance 플래그 · aside 조회. 셸 밖 = `/login /p /letters/view /api /auth`. `SplashGate` → `components/`(/p 와 공유) |
| 홈 | `app/(app)/page.tsx` — QT·동향 카드 `lg:hidden`(lg 이상은 보조 패널 담당). 주제 hero·통독 카드는 유지 |
| 루트 | `app/layout.tsx` V2 — BottomNav 제거(셸로 이동). `globals.css` — `main.bible-study-main` md 이상 100svh(탭바 높이 안 뺌) |
| import | `'../p/portfolio-theme.css'` → `'@/app/p/portfolio-theme.css'`, `'../package.json'` → `'@/package.json'`, `@/app/journal|insights/…` → `@/app/(app)/…` |
| 선행 정리 | `tsconfig.json` exclude 에 `docs` 추가 → 미추적 `docs/bible-qt-kit/` 이 로컬 빌드를 더 이상 깨뜨리지 않음 |
| e 마무리 | `AccountingNav` V3 · `SupportersNav` V3 — 하단 탭바 `md:hidden` + `*Segments`(md+ 상단 세그먼트) export, 두 layout(V3/V2)이 헤더 아래 렌더. bible·qt·calendar·photos·portfolio·accounting·supporters 75곳 치환(`md:` → `@2xl:`, `min-[480px]:` → `@md:`) |
| d 컨테이너 쿼리 | `@tailwindcss/container-queries`(devDep) · `tailwind.config.ts` plugins · `AppShell` V3 본문 열 `@container` · 홈(45)·일지(20)·프로젝트(4)·할 일(3)·인사이트(1) = 73곳 `sm:`/`min-[740px]:` → `@xl:`(576), `lg:` → `@4xl:`(896). 홈 QT·동향 `lg:hidden` 만 뷰포트 기준 유지(보조 패널과 동일 기준) |

### 결정(설계 문서 반영)
- `/letters` 는 색인 없는 공개 뷰어라 좌측 메뉴 제외(편지는 포트폴리오 경유).
- 보조 패널은 **lg 이상에서만** 렌더(Manna 와 달리 본문 아래 중복 배치 안 함 — 홈이 같은 정보를 담음).
- 보조 패널 수치는 레이아웃 데이터라 **클라이언트 내비게이션에서는 갱신되지 않음**(revalidatePath / router.refresh / 전체 로드 때 갱신).

---

## 유의 사항
- a~c 셸은 우진 실기기 「성공」(2026-10-14). **iPad 세로 744~767px 은 md 미만이라 하단 탭바 유지**(iPad mini 세로 = 744).
- d 치환 후 기대 동작: 데스크탑 1440(본문 980) 홈 12열 · iPad 가로(본문 712~868) 홈 2열 그룹 · iPad 세로 820(본문 748) 2열 그룹. 로컬 브라우저 패널은 로그인 세션이 없어 화면 확인은 실기기로.
- 셸 밖(`/login`, `/p`)만 뷰포트 기준으로 남음(의도). 셸 안 페이지는 전부 컨테이너 쿼리(`@xl`/`@2xl`/`@4xl`) — 새 화면을 만들 때도 `sm:`/`md:`/`lg:` 대신 `@xl:`/`@2xl:`/`@4xl:` 을 쓴다. 예외 = 보조 패널·사이드바 표시와 같은 기준이어야 하는 것(뷰포트 `lg:`/`md:`).
- 로컬 `npm run build` 가 한 번 14시간 멈춘 적 있음(콜드 `.next` + Dropbox 폴더 추정). 멈추면 `pkill -f "next build"` → `rm -rf .next` → 재빌드.
- `package-lock.json` 루트 version 은 3.2.0 고정(관행). SoT 는 `package.json`.
- 미커밋 잔여물(그대로 둠): `flyers/dongsan-2026-07/` 수정분·`_slim_frame.py`, `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts`, `docs/bible-qt-kit/`, `letter-templates/assets/2026추석.heic`.

## 다음 과제
1. e 실기기 확인(iPad·데스크탑에서 회계·후원자 상단 세그먼트, 하단 탭바 없음 · 통독/성경 2패널 · 캘린더 폭).
2. 셸 후속 아이디어(미착수): 페이지별 보조 패널 슬롯 · 사이드바 접기 토글 · 다크 모드.
3. 버전: 셸 도입은 MINOR 후보(3.8.0) — 우진이 "버전" 꺼낼 때 제안.
4. **10월호(MFH #2610)**: 자료 기간 2026-10-05~. 벧엘교회 단기선교(10/6~9), 어린이 전도, Zapotal 건축 착공 준비, KCPC 의료팀, UNAH 한국문화축제(11/9~12), 신약 통독.
5. (v2dk 이월) `/bible` 진행 표시·딥링크·통독 통계 · `/bible/study` 무한 스크롤·패널별 글꼴 · 즐겨찾기 DB 동기화 · 인사 카드 kind 토글 UI · 회계 계좌 후속.
