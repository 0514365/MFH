# MFH 핸드오프 v2bx (세션 종료)

> 이전: `v2bw`(공개 포트폴리오 Airbnb 리디자인). 이번 세션: **앱 전역 Airbnb 톤 통합을 페이지별로 확장** — 스플래시·홈·하단탭·포트폴리오·QT·인사이트·온두라스 7화면 + 색 미세조정 다수. 핵심 메커니즘은 v2bw 의 토큰 브릿지를 `.app-theme` 로 일반화. 강조색은 레드핑크 → **MFH 마룬레드(#B61821)** 로 통일(우진 "눈 아픔"). 앱 `3.2.0` 유지.

---

## 현재 위치 (한 줄)

공개페이지(/p)만 Airbnb 였던 디자인을 **앱 내부 7화면**까지 같은 톤으로 확장 — 모두 실기 "성공" 확인. 온두라스 동향에 우진 미세조정 요청 1건 이월(아래 1번).

---

## 이번 세션 여정

1. **스플래시 색 변경**(2번 작업, v2bw 이월): SplashGate 마룬(#661f20) → **순백 + 레드핑크**(Airbnb B안). 토큰 9곳 + 로고 컬러본 교체. 우진 "성공". (커밋 `934f1ee`)
2. **앱 전역 통합 시작 — 홈**(우진 "한 페이지씩"):
   - `portfolio-theme.css` 의 `.portfolio-theme` 셀렉터를 **`.app-theme` 와 공유**(브릿지 일반화). 홈에 적용 = `palette.ts` 마룬을 코드 수정 0줄로 Airbnb 톤 자동 전환. (커밋 `8b85653`)
3. **레드핑크 → 마룬레드**: 우진 "너무 눈 아픔" → 홈/스플래시/홈 FAB 를 마룬레드(#B61821)로(커밋 `b92131a`) → 포트폴리오까지 통일(`--color-primary` 자체 교체, 커밋 `8f94127`). **앱 전체 단일 강조색** 완성.
4. **하단탭**: 양옆 활성탭도 `text-primary`(기존 마룬) → `text-accent`(마룬레드)로 통일. (커밋 `26903b7`)
5. **홈 모듈 아이콘 색 베리에이션**: 단조로움 해소 — 9 모듈에 의미 기반 색(Log 에메랄드 · Insights 앰버 · Calendar 스카이 · Projects 바이올렛 · To-Do 틸 · 중보기도 로즈 · Photos 푸시아 · Facebook 블루 · Portfolio 인디고). hero·라벨·FAB는 마룬레드 유지. (커밋 `d49233b`)
6. **QT 페이지**: 미리보기 후 적용. 4파일(`page`·`QtView`·`PassageAccordion`·`CommentaryAccordion`) 16곳. 영문 라벨(Meditation/Application)은 회색(text-muted), 한글 제목(묵상/우리 사역에의 적용)은 마룬레드. (커밋 `fe2d0f3`)
7. **인사이트 페이지**: 렌즈/분야 아이콘 색 베리에이션(prayer=로즈, balance=스카이, fruit=앰버, letter=인디고; 분야 journal=에메랄드, project=바이올렛, task=틸) + 분야 타이틀 **EN(Log/Project/To-Do)** 로컬 매핑(전역 DOMAIN_LABEL 은 AI 프롬프트용이라 유지). (커밋 `64c52c9`)
8. **인사이트 미세조정**: "분야별 분석" 강조→검정(우진), Prayer 라벨 색뱃지(온두라스 스카이/사역 앰버/가정 로즈), Letter 발행호수 크게+볼드. (커밋 `8e7385e`)
9. **인사이트 추가 조정**: 연주제 뱃지 삭제, Overall 카드 = navy(B안) 시도 → 우진 "은은하게" 요청 → **웜 그레이지(#f3f1ec) + 마룬레드 아이콘** 으로 확정. (커밋 `34afc12`, `ee84de6`)
10. **온두라스 동향**: 메인·BriefingView·상세·목록 4파일. 하이라이트 박스 `bg-accent-soft`(연레드) + 마룬레드 태그, 선교 인사이트 `bg-surface-subtle`(연회색) + 좌측 마룬레드 바, 4분야 차분 dot 유지. **기존 코드의 무효 클래스 `bg-primarySoft` 수정**(원래 배경이 안 먹고 있었음). (커밋 `c4d7dc7`)

---

## 핵심 메커니즘 (다음 세션 필수 이해)

**토큰 브릿지 = .app-theme**:
- `app/p/portfolio-theme.css` 의 `.portfolio-theme, .app-theme { ... }` 가 양쪽에 같은 Stayly DS 토큰 + MFH 브릿지(`--primary`→잉크, `--accent`→마룬레드 등) 주입.
- **새 페이지 통합 = 단 2줄**: `import '../p/portfolio-theme.css'` + `<main className="app-theme ...">`. 그러면 기존 `text-primary`/`bg-primary-soft` 등이 자동으로 Airbnb 톤으로 전환.
- **세부 보정**: 마룬레드 강조가 필요한 곳은 `text-primary` → `text-accent` 로 바꾼다(toCken 값상 `--primary` = 잉크 검정, `--accent` = 마룬레드 #B61821).
- 단조롭다 싶은 곳에 색 베리에이션은 **Tailwind 기본 팔레트**(emerald/amber/sky/violet/teal/rose/fuchsia/blue/indigo) 그대로. 정적 매핑 `Record<string,string>` 으로(동적 클래스 금지 = Tailwind purge).

**색 체계 (이번 세션 정착)**:
- 캔버스: 순백 `#fff` (페이퍼 노이즈 off)
- 본문: 잉크 `#222` (`text-ink`)
- 강조: **마룬레드 `#B61821`** (`text-accent`, `bg-accent`, `border-accent`)
- 강조 연틴트: `#FAE3E4` (`bg-accent-soft`)
- 보조 면: 연회색 `#f7f7f7` (`bg-surface-subtle`)
- 다중 강조(아이콘 칩 한정): Tailwind 100/700 페어
- 신호/상태 칩(긴급도): 기능색 유지(red-50/amber 등, 변경 금지)

---

## 다음 세션 (예정 — 1번이 최우선)

1. **온두라스 동향 미세조정 (이월, 우진 마지막 요청)**:
   - "주목"(하이라이트) 영역이 **전체 붉은 배경 + 면적 커서 시야 부담** → 글로우 톤 조합 추천 필요(예: 흰 박스 + 작은 마룬레드 좌측 바·태그 / 또는 hairline 테두리 + 연레드 인 라벨만 / 미리보기 후 결정).
   - 4분야 텍스트 박스(`ItemBlock` 흰 카드 + line 테두리) 단조로움 → 디자인 컬러 중 **은은한 톤 동일색**으로 테두리 추천(예: 모든 박스 hairline-soft `#ebebeb` 유지 + 좌측 아주 얇은 연색 바 / 또는 `#f7f7f7` 박스로 자연 분리).
   - 코드 위치: `app/honduras/BriefingView.tsx` 의 highlights 섹션(`bg-accent-soft p-4`)·`ItemBlock`(`border border-line bg-surface p-4`).
2. **나머지 내부 화면 통합** (한 페이지씩, 미리보기 후 진행): 일지(/journal) → 할일(/tasks) → 프로젝트(/projects) → 캘린더(/calendar) → 사진(/photos) → 중보기도(/intercessions) → 페이스북(/facebook).
3. **차후**: 통합 끝나면 `.app-theme` → `body` 자동 부여(layout) 또는 `:root` 승격으로 스코프 제거.

---

## 빌드·검증 함정 (메모리에도 있음)

- **Dropbox dev 서버 stale**: `npm run dev` 가 'use client' 변경/새 파일을 캐싱. **항상 `npm run build` + `next-prod`(`.claude/launch.json`)** 로 검증. dev 스크린샷은 신뢰 금지.
- **preview MCP 로그인 의존 페이지**: /qt /insights /honduras 등은 로그인 후 진입 → preview 헤드리스에선 자격 자동 입력 불가 → preview 캡처는 **퍼블릭/로그인 후 페이지에만**. 그 외는 빌드 통과 + 우진 실기 확인 사이클로.
- **PWA SW 캐시**: 우진 실기 확인 시 "**앱 완전 종료 후 재실행**" 가이드 필수. service worker 가 app-shell 캐시.

---

## 백로그
1. 온두라스 미세조정(위 1번) — 다음 세션 1순위.
2. 나머지 내부 화면 7개 통합.
3. 오프라인 3단계(쓰기+동기화) — v2bv 부터 이월.
4. (차후) `.app-theme` 전역화 / palette.ts 통합 / 첨부 이미지 썸네일 확장 등.

---

## 워킹트리 메모 (앱 라인 무관, 그대로 둠)
- `flyers/dongsan-2026-07/` — 동산교회 전단지 작업물(앱 외).
- `scripts/measure-usage.ts` — Supabase 사용량 임시 측정 스크립트(읽기 전용, 측정 후 삭제 가능 표기).

*작성: 2026-06-23 세션 종료. 앱 전역 Airbnb 톤 통합 7화면(3.2.0 유지) — 토큰 브릿지 `.app-theme` 일반화, 마룬레드 강조 통일, 홈/인사이트 색 베리에이션. 커밋 `934f1ee`~`c4d7dc7` 12건. 실기 확인 완료. 직전 `v2bw` → `docs/archive/`. 다음 세션 1순위 = 온두라스 "주목"·분야박스 미세조정.*
