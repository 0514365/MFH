# MFH 핸드오프 v2bm (세션 종료)

> 이전: `v2bl`(프로젝트 할 일 순서·선행/후속·동향 출처 링크). 이번 세션: **동산교회 단기선교 의료봉사 전단 제작**(신규 — `flyers/` 워크플로 정립). 앱 코드·DB 변경 없음. v2bl이 "세션 무관 미커밋"으로 남겨둔 `flyers/`·`.gitignore(.env*)` 를 이번에 정리·커밋.

---

## 현재 위치 (한 줄)

**동산교회 단기선교 전단 완성**(스페인어, 3:4 포스터 + 4:5 WhatsApp 카드). 배경=Gemini 우드컷 콜라주, 카피=HTML 합성 → Chrome headless PNG/PDF. 다음은 (이월) 선교편지 실제 발송 호.

---

## 이번 세션 작업 — 단기선교 전단 (`flyers/dongsan-2026-07/`)

대상: DB `projects` 「동산교회 단기선교팀 사역」(2026-06-29~07-04). **행사 7/1 10:00–17:00**, 장소 **Iglesia de Esperanza, Las Brisas**, 사역=진료·침술·검안/안경·어린이성경학교(VBS)·가족사진, 주최 **Equipo Misionero Iglesia Dongsan**.

| 파일 | 용도 |
|---|---|
| `flyer.html` | 3:4 세로 포스터(1080×1440) — 인쇄·게시 |
| `flyer-card.html` | 4:5 WhatsApp 카드(1080×1350) — 배경 `100% 100%`로 상하 비크롭(십자가·가족 보존) |
| `variant-prompts.md` | 배경 Variant 5종(콜라주/밴드/미니멀/일러스트/수채) 프롬프트 — 모두 "중앙 15~75% 비움" 규칙 |
| `bg-collage2.png` | 채택 배경(Gemini 331nre — 얇은 프레임·넓은 중앙·작은 십자가 위) |
| 산출물(git 제외) | `MFH-flyer-dongsan-2607.{png,pdf}` · `-card.{jpg,png}` |

### 전단 제작 워크플로 (재사용 — 다음 단기팀도 동일)
1. **배경**: Gemini에 콜라주 프롬프트(중앙 15~75% 비움·글자 없음·3:4) → 채택 png를 `flyers/<팀>-<YYYY-MM>/bg.png`.
2. **카피**: `flyer.html` 의 `.content`(십자가 아래~가족 위)에 스페인어 카피 합성. 색=마룬 `#5E2A2B`·레드 `#B2202A`·골드 `#B07C33`, 폰트 Montserrat.
3. **빌드**: `chrome --headless --screenshot`(`--force-device-scale-factor=2`) + `--print-to-pdf`. **`.flyer` 에 `print-color-adjust:exact` 필수**(PDF 배경 누락 방지). 4:5 카드는 `--window-size=1080,1350`.

### 도메인 규칙 적용
- **무료 강조 안 함**(우진 지시): GRATIS 배지·강조 제거, `sin costo` 한 번만 담담히.
- 교회명 **Iglesia de Esperanza**(장소 줄), 주최 **Equipo Misionero Iglesia Dongsan**(역할 분리). 정치 중립.
- Facebook 게시 문구 스페인어/한국어 2버전 제공(현지 초대 / 후원자 소식+기도 2개 압축).

## 핵심 메모 (다음 세션)
- `.gitignore`: `flyers/**` 이미지·PDF 제외(HTML·md만 추적, 배경/산출물은 Dropbox 보존). `.env*` 제외도 이번에 커밋(v2bl까지 미커밋이던 것).
- 빌드 검증 불필요(앱 코드 무변경 — `flyers/` 는 앱 외부 정적 HTML).

## v2bl 남은 확인 (우진 · 실기기) — 이월
1. **프로젝트 상세**: To-do/Done 그룹·구분선, 날짜 우측 ↑↓ 그룹 내 순서, 선행/후속 드롭다운(그 프로젝트 할 일만). 서진아 계정은 보기만.
2. **온두라스 동향**: 다음 `/news-update` 생성분부터 출처가 기사 링크로 동작.

## 백로그 (v2bl 이월)
1. **`news-update.md` 19행 `url` 안내** — 에이전트 커맨드 설정에 자동 차단되어 미적용(기능 무관 — `news-pull.ts`엔 이미 반영). 우진 직접 수정 또는 권한 허용 필요.
2. **선교편지 실제 발송 호** 제작 · 인사이트 상세 리프레시(`LensDetail`·`InsightCard`) · 온두라스 동향·사진·캘린더·중보기도 화면 리프레시 · (보류) 포트폴리오 공개 페이지(`/p/[slug]`) · 첨부/와이드 레이아웃 타 모듈 확장.

*작성: 2026-06-15 세션 종료. 신설: `flyers/dongsan-2026-07/`(flyer.html·flyer-card.html·variant-prompts.md 추적, 이미지/PDF 제외) + `.gitignore` 갱신. 앱 코드·DB 변경 없음. 직전 v2bl → `docs/archive/`.*
