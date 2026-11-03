# MFH 핸드오프 v2dz (세션 종료)

> 이전: `v2dy`(4-8·4-9·회계 잔여, `docs/archive/`). 이번 세션(2026-10-22~23): **2027 개정 5단계 — 로고·스플래시 시안 → 「현재 유지」 결정 → themeColor 흰색 → 로그인·공개 `/p` 2027 적용**. 단계마다 미리보기 아티팩트 → 결정 → 적용 → 빌드 → 푸시. 앱 버전 **3.8.0 유지**(다음 "버전" 때 누적 검토 — 5단계 마무리 시 MAJOR `4.0.0` 후보).

---

## 현재 위치 (한 줄)
**앱 셸 안·밖(로그인·공개 `/p`) 2027 개정 완료.** 남은 것 = **5단계 마무리: 마룬 `light` 토큰·`inter` 폰트 정리 → 편지 템플릿(2027호부터)** + 잔여 그림자 모달 2개.

---

## 이번 세션 커밋 (전부 origin/main)
| 커밋 | 단계 | 내용 |
|---|---|---|
| `356f455` | 5-② | viewport `themeColor` · manifest `theme_color`/`background_color` 마룬 → 흰색 · 안 쓰던 `.splash-overlay` CSS 44줄 삭제 |
| `7904a8d` | 5-③ | **로그인**: 로고(현재 색) + Manrope 제목 + 연회색 입력 면 + 터키석 알약 로그인. **공개 `/p`**: `portfolio-theme.css` V2 전면 교체(Stayly·Inter → b27 브릿지 · `pf-section-title`/`pf-group-title` = 8px 색 사각형 `::before` · `pf-dot-1/3/5/6` 섹션 색 · `pf-btn` 알약 · 그림자 제거) · 컴포넌트 12개(테두리 카드 → 연회색 면, 면 안 요약 = 흰 면, 최신 편지 배지 로즈 틴트, 연혁 진행 중 = 진한 민트, 중보기도 CTA 터키석 알약, 중보기도 폼 연회색 입력·터키석 보내기·빨간 ‹) · `OwnerBar` 흰 바탕 + 남색 글자 + 아래 선 |
| (이번) | — | 핸드오프 v2dz · 디자인 문서 §9 갱신 |

## 확정된 결정 (이번 세션)
- **로고·앱 아이콘·og-image = 현재(빨강·마룬) 그대로 유지.** 재채색(남색·터키석) 시안 4개를 보고 기각. 디자인 문서 5단계의 「로고 재채색」 항목은 **닫힘** — 다시 제안하지 않는다.
- **오프닝 스플래시(`SplashGate`)·`public/offline.html` 도 현재 색 유지**(2027 시안 A 를 보고 기각). `sw.js` 캐시 버전도 그대로(v5).
- `themeColor` 흰색은 적용. iOS 홈 화면 앱은 재실행/재설치 후 반영.
- **공개 `/p` 섹션 색**: 선교사 소개 5 라벤더(포트폴리오 모듈색·기본) · 연혁 3 살구 · 선교편지 6 로즈 · 사역 영상 1 라군. 사진 중심 레이아웃·흰 로고·YouTube/Facebook 브랜드색은 유지. 히어로 폴백(사진 없을 때) = 남색 단색.
- 셸 밖 2027 브릿지는 `.portfolio-theme`(`/p` 전용) 스코프. 로그인은 스코프 없이 `b27-*` 클래스 직접 사용(변수는 `:root`).

## 코드 위치 (새로 생긴 것·바뀐 것)
- `app/p/portfolio-theme.css` V2 — `/p` 토큰 브릿지 + `.pf-*` 부품. 섹션 색은 `.pf-dot-n` 을 `.pf-section-head`/`.pf-group-title` 에 붙인다. 연회색 면 안에서는 `.pf-face` 를 부모에 붙이면 `.pf-count-badge` 가 흰 알약이 된다.
- `app/p/layout.tsx` — `manrope.variable` 주입(Inter 제거). **`lib/fonts.ts` 의 `inter` 는 이제 쓰는 곳 0.**
- `app/login/page.tsx` V2 · `components/OwnerBar.tsx` V2 · `app/p/[slug]/*` 마커 V 각 +1.
- Tailwind `b27-*` 색에 `/70` 같은 투명도 수식어는 CSS 변수라 적용되지 않음 → `rgba(43,49,96,.72)` 인라인 사용(LetterSection No. 배지). 기존 `focus:ring-b27-ink/15` 류는 그대로 둠(동작 여부 미확인).

## 운용 (git 밖)
- 빌드 검증: 세션 스크래치 `buildcheck`(rsync + node_modules 심링크)에서 `tsc` + `npm run build`. 실화면 확인은 `.claude/launch.json` 의 `next-dev` 로 dev 서버(Dropbox 폴더 직접) + 브라우저 패널.
- **로컬 폴더가 원격보다 뒤처질 수 있음**(다른 기기 세션). 푸시 전 `git fetch` → 뒤처졌으면 `git rebase --autostash origin/main`. 이번에 `app/globals.css` 충돌 1회(원격 기준에서 splash 블록만 제거로 해결).
- 미리보기 아티팩트(우진 계정 비공개): 로고 재채색(기각) https://claude.ai/artifact/6o75nLMm1wc8ztWgKYV72L · 스플래시(기각)·themeColor https://claude.ai/artifact/V3kV8wzdJ3AtZSyrMs91Y1 · 로그인·공개 /p https://claude.ai/artifact/4RV1eoejoSEindRE2kwK9f (이전 것은 v2dy·v2dx 참조)
- 미커밋 잔여물(로컬 Mac, 그대로): `flyers/dongsan-2026-07/`(수정 2 + `_slim_frame.py`) · `applications/` · `reports/2026-H1/06-sermon-manuscript.md` · `scripts/measure-usage.ts` · `docs/bible-qt-kit/` · `letter-templates/assets/2026추석.heic`.

## 다음 과제
0. **5-④ 마룬 `light` 토큰·`inter` 정리** — 먼저 범위 조사: `lib/palette.ts` `light` 세트를 쓰는 곳(`app/layout.tsx` 의 `tokensToCssVars(light)` 주입, `tailwind.config.ts` 의 `primary/accent/surface…` 매핑, 셸 밖 `/letters/view` 등)을 grep 으로 확인 → 결정 테이블(① `light` 값을 2027 값으로 바꿔 브릿지 자체를 없앨지 ② 셸·`/p` 스코프 브릿지만 두고 `light` 는 삭제할지) → 승인 → 적용. `lib/fonts.ts` `inter` 삭제 포함. 주의: `public/offline.html` 은 유지 결정(마룬 하드코딩 그대로).
1. **5-⑤ 편지 템플릿(2027호부터)** — `letter-templates/` 마스터(`mfh-cardnews.html`·`mfh-mobile-letter.html`)의 색·글꼴을 2027 로. 로고는 현재 색 유지. 2026 호수는 건드리지 않는다.
2. 잔여 그림자 모달: `app/(app)/bible/RebalanceButton.tsx` · `components/RecurrenceScopeModal.tsx` → 시트 문법.
3. 실기 확인 미완: `/login` · `/p/mfh`(모바일·태블릿) · `/p/mfh/prayer` · 상태바 흰색 — 다음 세션 시작 때 「성공/에러」 받기.
4. 선택: 후원자 현황 「최근 연락」 목록 · 다크 모드(범위 밖). "버전" 요청 시 5단계 완료 기준 `4.0.0` 제안.
5. 이월: 11/3 이후 10월 마감 확인 · 11/13·11/15 카드 명세서 대조 · **10월호(MFH #2610)** 11월 초 착수.

## 다음 세션 시작 프롬프트(복사용)
```
docs/MFH-HANDOFF-v2dz.md 와 docs/MFH-DESIGN-2027.md 를 읽고 시작. 2027 개정 5단계 마무리 — 마룬 light 토큰·inter 폰트 정리 범위 조사 후 결정 테이블부터. 로고·스플래시·오프라인은 현재 유지(재제안 금지). 단계마다 미리보기 → 승인 → 적용, 커밋·푸시는 내가 말할 때만.
```
