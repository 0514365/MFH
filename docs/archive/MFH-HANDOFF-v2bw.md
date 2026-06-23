# MFH 핸드오프 v2bw (세션 종료)

> 이전: `v2bv`(오프라인 2단계 읽기). 이번 세션: **공개 포트폴리오(/p) Airbnb-Style 디자인 시스템 적용** — 우진이 claude.ai 에서 만든 "Stayly Marketplace" DS 의 CSS 토큰을 이식해 순백·레드핑크·카드룩으로 전면 리디자인. 앱 `3.2.0` **유지**(우진 결정: 이 디자인 개선은 최종까지 3.2.0 범위, 버전 안 올림). 실기기 확인 완료(우진 "성공").

---

## 현재 위치 (한 줄)

공개 포트폴리오(/p)를 Airbnb 풍으로 전면 리디자인 완료·배포·실기 확인. 전체편지/전체영상 페이지 추가 다듬기 일부 남음.

---

## 이번 세션 여정

1. **DS 입수**: 우진이 claude.ai 에서 만든 "Stayly Marketplace" 디자인시스템 HTML(3.6MB, `~/Downloads`). base64 이미지가 대부분이라 통째로 못 읽음 → **grep 으로 `:root` CSS 토큰만 추출**(색/radius/spacing/타이포/shadow + Inter @font-face). 컴포넌트는 React(babel) base64 라 추출 비효율 → 토큰+디자인원칙으로 직접 설계.
2. **전략 확정**(우진): 색까지 **전면 채택** + **공개페이지(/p)에만 스코프 적용**(차후 전체 확장).
3. **테마 기반**: `app/p/portfolio-theme.css`(Stayly 토큰 + **MFH 토큰 브릿지**) + `lib/fonts.ts`(Inter) + `app/p/layout.tsx`(.portfolio-theme 스코프). 브릿지 덕에 기존 PortfolioView 등이 **코드 수정 없이** 즉시 순백·레드핑크·Inter 로 전환.
4. **카드룩**: `.pf-*` 컴포넌트 클래스. 영상·편지 = Airbnb 카드 그리드. 섹션 제목 5개 **동급 통일**(좌측 레드핑크 바 + 한글 + 영어 부제).
5. **신규 `/p/[slug]/letters`** 전체 편지 아카이브(연도 앵커 + HashScroll 스크롤 보정). 메인 편지목록 = 연도 카드 → `/letters#year-YYYY` (사역영상 구조 미러).
6. **우진 피드백 반영**: 선교연혁 원형 chevron(작은 ▾→큰 버튼), 목록 썸네일 최신편지와 동일 크기, 개수 뱃지(N편/N개), 전체페이지 그룹 타이틀에 좌측 바+큰 폰트+뱃지.

## 영어 부제 (우진 컨펌 확정)
선교사 소개 `Meet the missionaries` / 선교 연혁 `Our mission journey` / 선교편지 `Letters from Honduras` / 선교편지 목록 `Letter archive` / 사역 영상 `Ministry in action`.

## 구조 (배포본 = `1eb95e5`)

- **`app/p/portfolio-theme.css`**: ① Stayly DS 원본 토큰 ② **MFH 토큰 브릿지**(`--paper`→canvas 순백, `--primary`→ink 검정, `--accent`→레드핑크 `#FF385C`, `--line`→hairline 등 — 기존 컴포넌트 자동 전환의 핵심) ③ `.pf-*` 컴포넌트 클래스(`pf-card`/`pf-btn`(+`--pill` 뱃지버튼)/`pf-media`(+`--portrait`)/`pf-section-head`+`pf-section-title`+`pf-section-sub`/`pf-group-title`/`pf-count-badge`). `body:has(.portfolio-theme)` 로 종이노이즈 off.
- **`app/p/layout.tsx`**: `.portfolio-theme` + Inter variable 주입(공개 라우트 전체 스코프).
- **`lib/fonts.ts`**: Inter(라틴, Airbnb Cereal 대체) — 한글은 `--font-sans` 스택에서 Pretendard 글리프 폴백.
- **`lib/portfolio.ts`**: 편지 헬퍼 공통화(`LetterWithUrls`/`isVideoLetter`/`letterLink`/`letterCoverSrc`).
- **`app/p/[slug]/`**: PortfolioView·VideoSummary·VideoSection·LetterSection(메인)·**LetterFullSection**(신규,/letters)·HistoryAccordion·PrayerCta 전부 `.pf-*` 적용. **HashScroll.tsx**(신규, 해시 앵커 스크롤 보정).
- **`app/p/[slug]/letters/page.tsx`**(신규): 전체 편지 아카이브(videos 페이지 미러).

## 핵심 메모 / 교훈

- **토큰 브릿지 전략**: DS도 CSS변수·MFH도 CSS변수 → `.portfolio-theme` 에서 MFH 토큰명을 DS 값으로 재정의하면 기존 컴포넌트 **코드 0줄**로 색/배경/폰트 전환. 디자인시스템 교체의 가장 효율적 경로.
- **스코프 격리**: 공개페이지(/p)에만 적용 → 로그인 후 앱 내부 무영향. **차후 앱 전체 확장 = `.portfolio-theme` 를 `:root` 로 승격**하면 끝.
- **⚠️ dev 서버 watcher 함정(이 repo 고유)**: repo 가 Dropbox 동기화 폴더라 `npm run dev` 가 **`'use client'` 컴포넌트 변경/새 파일을 stale 캐싱**(HMR 미반영, `Cannot read properties of undefined (reading 'call')` 런타임 에러). → **검증은 `npm run build` + prod(`next-prod`) 서버로.** dev 로 볼 땐 `.next` 삭제 후 재시작. Vercel(build 기반)은 항상 정상. (메모리에도 저장)
- `.claude/launch.json` 에 `next-prod`(npm start, port 3000) 추가 — prod 검증용.
- preview MCP(헤드리스)는 이 앱의 SplashGate/SPA navigation 을 불안정하게 처리 → 페이지가 `/`·`/login` 으로 튐. eval/curl 로 우회 검증.

## 다음 세션 (예정)

1. **전체편지/전체영상 페이지 추가 다듬기**(우진 추가 피드백 대기 — 이번에 그룹 타이틀·뱃지는 반영).
2. **스플래시 색 결정**: `SplashGate` 가 `#661f20`(마룬) 하드코딩 + 홈과 공유 구조. 공개페이지만 레드핑크로 하려면 prop 분리 필요. 현재 마룬 유지(보류).
3. (차후) **Airbnb 테마 앱 전체 확장** — 스코프 `:root` 승격 / palette 통합.

## 백로그
1. 오프라인 3단계(쓰기+동기화) — v2bv 이월.
2. 공개페이지 추가 개선(전체페이지 디테일) + 스플래시 색.
3. (차후) Airbnb 테마 앱 전체 확장.
4. 첨부 이미지 썸네일 확장 등 이월(v2bu/v2bs).

*작성: 2026-06-22 세션 종료. 공개 포트폴리오 Airbnb-Style 리디자인(3.2.0 유지) — 토큰 브릿지+스코프 테마, 카드룩, `/letters` 신규, 우진 피드백 반영. 커밋 `51b3bb9`·`1eb95e5`. 실기 확인 완료. 직전 `v2bv` → `docs/archive/`.*
