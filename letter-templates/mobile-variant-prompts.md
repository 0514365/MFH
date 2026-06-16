# MFH 모바일 선교편지 — Variant 디자인 프롬프트 (v2)

> **무엇**: 모바일 세로 HTML 선교편지를 **Variant(variant.ai)** 가 *처음부터 자유롭게* 디자인하도록, MFH 앱의 **기본 구조와 방향성**만 정확히 전달하는 프롬프트.
> **역할 분담**: 비주얼 디자인(색·레이아웃·무드·장식·다양성) = **Variant**. 구조·콘텐츠 골격·브랜드 방향·제약 = **이 프롬프트(Claude 작성)**.
> **사용 흐름**: §1 메인 프롬프트를 Variant에 넣고 "여러 방향 생성" → 우진이 선택 → Claude가 콘텐츠·링크 미세조정 → `letter.html` 확정.
> **선례**: 핸드오프 `v2bg`/`v2bh`(앱 UI Variant 리프레시), `v2bm`([flyers/variant-prompts.md](../flyers/dongsan-2026-07/variant-prompts.md)).

---

## 0. 사용법

1. **[§1 메인 프롬프트]를 통째로 복사**해 Variant에 입력한다. (구조·방향성·디자인 자유·다양성이 다 들어 있음)
2. 더 또렷한 결과가 필요하면 **[§2 페이지 구조 디테일]** 을 덧붙인다(요소 누락 방지).
3. 특정 무드를 보고 싶으면 **[§5 다양성 주문법]** 의 방향 키워드를 한 줄 덧붙인다.
4. 받은 시안 → §6 절차대로 저장·미세조정·확정.

> 비주얼은 Variant가 다양하게 만든다. 이 프롬프트는 **"무엇이 들어가고, 어떤 톤이어야 하는가"** 만 고정한다.

---

## 1. 메인 프롬프트 (복사해서 Variant에 입력)

```
ROLE & GOAL
Design a MOBILE, vertical, single-page HTML newsletter ("선교편지", a Korean missionary support
letter) for the ministry "Mission for Honduras (MFH)". I give you the STRUCTURE, CONTENT SLOTS, and
BRAND DIRECTION. YOU own the visual design — explore it freely and return several DISTINCT directions.

WHO WE ARE — Mission for Honduras (MFH)
- A Korean missionary couple, Kim Woojin and Seo Jina, sent to San Pedro Sula, Honduras since
  February 2016 (with their children).
- Our calling is among CHILDREN and the URBAN POOR: children's education and church planting.
  We run a kindergarten and after-school programs and are planting and building the Zapotal church.
- The heart of it is presence, not programs — walking alongside one person, one family at a time
  (a pastoral "walking-with").

WHY THIS LETTER EXISTS — purpose of the mobile letter
- A monthly letter that keeps supporters and home churches walking WITH us: to report honestly,
  to give thanks, and above all to INVITE PRAYER. It is a warm letter between friends — NOT a
  fundraising flyer or a corporate report.
- Read on a phone, it should feel like a personal note from the field: easy to read on the go,
  with gentle taps through to the app, to pray, and to support.

SPIRIT / MOOD — how it should FEEL (translate this into the visual design)
- Warm, sincere, pastoral, hopeful. Quiet faith over spectacle. Honest and plain — no hype, no
  glossy corporate polish; restrained, intentional ornament; generous, calm space.
- Carry the felt sense of the 2026 theme, "주님은 길을 내십니다 / The Lord makes a way"
  (Isaiah 43:19): even through blocked, difficult places there is a path and quiet hope —
  light emerging over hardship, faithfulness over performance.
- Dignify the people in the photos: their faces and stories come first; the design serves them.
- Color and type feel warm and human, never clinical — confident but gentle.

2026 THEME (thread it through cover and closing)
- "2026년 주제 · 주님은 길을 내십니다" — Isaiah 43:19, "내가 광야에 길을, 사막에 강을 내리니".

STRUCTURE (fixed skeleton — one continuous vertical scroll)
1) COVER — MFH logo, issue badge "MFH #YYMM", a year-theme line, a hero image area, the main title,
   an optional Bible verse, the month line "2026년 N월 · 선교편지", and the author "김우진 · 서진아 선교사".
2) BODY — three parts in THIS exact order, each its own section:
   ① 온두라스 (Honduras)   ② 사역 (Ministry — may be SEVERAL items)   ③ 선교사 가정 (Family)
   Each section has: a section label, a heading, Korean body paragraphs, an OPTIONAL photo area
   (one OR many photos), and an OPTIONAL prayer block.
3) OUTRO — a prayer SUMMARY (groups in order 온두라스 → 사역 → 가정), a call-to-action to the MFH app,
   a support/donation line, contact + SNS, and the MFH logo.

CONTENT RULES (these define the letter — keep them)
- All reader-facing copy is KOREAN; keep any Korean text I provide verbatim (do not translate/rewrite).
  English only for tiny labels (e.g., "FOR HONDURAS", "OUR FAMILY").
- Prayer order is ALWAYS 온두라스 → 사역 → 가정. Honduras content stays politically NEUTRAL
  (no parties, no figures). Ministry prayers stay compact (1–2 items). Family = peace & protection.
- Ministry photos are EVIDENCE, not decoration: show them FULLY, never crop out the subject, and
  never lay title/body text on top of a ministry photo (a caption in a thin strip at the photo's
  bottom edge is fine).
- Some body sections carry MANY photos — design FLEXIBLE photo layouts (single full-bleed, a pair,
  a 2×2 grid, a mosaic of one large + small ones, a step-by-step strip, a swipe gallery) and pick
  whichever fits each section.

INTERACTIVE (mobile, touch)
- Real <a> links with comfortable tap targets (min 44px). Tag each with data-link and href="#":
  allowed values app | donate | video | album | contact | prayer | archive.
- Include at least: app (on cover and outro), donate + contact (outro). Optionally a sticky bottom
  "앱 열기" bar, and a subtle top quick-nav jumping to in-page section anchors.

BRAND DIRECTION (a starting point — you MAY evolve it)
- MFH brand cues: deep maroon, brand red, neutral grey. Korean-readable type — e.g., Pretendard for
  body, a serif (e.g., Nanum Myeongjo) for headings, Montserrat for small labels/numbers.
- Keep a logo on the cover and the outro (placeholder images: assets/logo-*.png, assets/mfh-icon.png,
  assets/온두라스로고4.png).
- This is a DIRECTION, not a cage. You may shift the palette, type pairing, spacing, and layout
  language to create genuinely different design moods — as long as it stays warm, legible, on-brand
  in spirit, and Korean-first.

DESIGN FREEDOM (this is yours)
- Own the color system, type scale, spacing rhythm, section dividers, photo framing, decorative
  details, and overall mood. Make it feel designed, not templated.

OUTPUT
- One self-contained HTML file (HTML + a single inline <style>). Mobile portrait, content column
  ~max 430px centered on a neutral page background, continuous vertical scroll, web fonts via CDN.
- Fill with realistic KOREAN placeholder copy that respects the structure and content rules above
  (so I can judge the design with real-feeling content).

VARIATIONS
- Return SEVERAL distinct design directions. Each must reinterpret the SAME structure with its own
  color, typography, and layout language — not merely recolor one layout. Aim for variety in mood
  (e.g., editorial / warm letter / minimal / documentary / natural) while keeping the structure intact.
```

---

## 2. 페이지 구조 디테일 (필요 시 덧붙임 — 요소 체크리스트)

> Variant가 요소를 빠뜨리거나 순서를 흩트리면 아래를 프롬프트에 덧붙인다. *비주얼이 아니라 "무엇이 있어야 하는가"* 만 규정.

**표지(Cover)** — 로고 · `MFH #YYMM` 배지 · 연 주제("2026년 주제 · 주님은 길을 내십니다") · 대표 사진 영역 · 제목(명조 권장) · (선택)성구+출처 · "2026년 N월 · 선교편지" · 작성자("김우진 · 서진아 선교사").

**내지(Body)** — 3단 고정: ① 온두라스 ② 사역(여러 항목 가능) ③ 선교사 가정. 각 섹션 = 섹션 라벨 + 제목 + 한국어 본문 + (선택)사진 영역(0·1·2·여러 장) + (선택)기도제목 블록.
- 사진 장수별 레이아웃은 **Variant 재량**: 0장(타이포 중심) · 1장(풀블리드) · 2장(스택/페어) · 3~4장(그리드/모자이크/단계 스트립/갤러리). 다양하게 시도하도록.

**아웃트로(Outro)** — 기도제목 요약(온두라스→사역→가정 순) · 앱 CTA(`data-link="app"`) · 후원 안내(`donate`) · 문의·SNS(`contact`) · 로고.

---

## 3. 방향성 레퍼런스 (브랜드 큐 — 권장, 강제 아님)

Variant가 "출발점"으로 삼을 MFH 방향성. **고정이 아니라 참고** — 디자인 다양화는 Variant가 한다.

| 항목 | 권장(출발점) | 비고 |
|---|---|---|
| 색 | 마룬 `#661F20` · 레드 `#B61821` · 그레이 `#80807F` (앱 브랜드) / 편지 톤은 차콜+브랜드레드도 무방 | Variant가 무드별로 변주 가능 |
| 폰트 | 제목 Nanum Myeongjo · 본문 Pretendard · 라벨·숫자 Montserrat | **한글 가독은 필수 제약**, 페어링은 자유 |
| 톤 | 따뜻·담백·신뢰·차분. 이모지 절제(🙏 하나 정도) | 강렬·원색·상투 지양 |
| 로고 | 표지·아웃트로에 유지 | 자산: `assets/logo-*.png`, `mfh-icon.png`, `온두라스로고4.png` |
| 도메인 | 기도제목 온두라스→사역→가정 · 정치 중립 · 사역 기도 1~2개 · 가정 평강 | [CLAUDE.md §7](../CLAUDE.md) · [MFH-LETTER-AGENTS §6](../docs/MFH-LETTER-AGENTS.md) |

---

## 4. 링크 슬롯

모든 링크는 `<a data-link="…" href="#">` 플레이스홀더로 생성 → Claude가 확정 단계에서 실제 URL 주입. "다양하게 지정" 가능하게 슬롯만.

| `data-link` | 대상 | 위치(예) |
|---|---|---|
| `app` | MFH 앱 홈·포트폴리오 | 표지 헤더, 아웃트로 CTA, sticky 바 |
| `donate` | 후원 안내 | 아웃트로 |
| `contact` | 문의·소통(이메일/카톡) | 아웃트로·푸터 |
| `video` | 사역 영상 | 관련 사역 섹션 |
| `album` | 사진첩 | 사진 많은 섹션 |
| `prayer` | 중보기도 신청 | 기도제목 근처(선택) |
| `archive` | 지난 편지 | 아웃트로 |

---

## 5. 다양성 주문법 (Variant에 여러 방향 요청)

메인 프롬프트만으로도 여러 시안이 나오지만, 방향을 또렷이 하려면 끝에 한 줄 덧붙인다:

```
Give me 5 directions, one each in these moods: editorial-magazine, warm hand-letter,
quiet-minimal, field-documentary, natural-organic. Same structure, distinct visual language.
```

방향 키워드 풀(섞어 주문): `editorial` · `warm letter` · `minimal` · `documentary` · `natural/botanical` · `soft pastel` · `bold poster` · `classic print`.

---

## 6. 워크플로 (받은 시안 → 확정)

1. **저장**: `letter-templates/issues/<YYYY-MM>/variants/mobile-A.html`, `mobile-B.html` … (월별 폴더, git 제외).
2. **Claude 미세조정**: 한국어 콘텐츠·사진 교체 → `data-link` href 실제 URL 주입 → 간격·가독 다듬기 → 도메인 QA.
3. **확정**: 선택안을 `issues/<YYYY-MM>/letter.html`(모바일 메인)로. **PDF·오프라인 게시용 카드뉴스는 [mfh-cardnews.html](mfh-cardnews.html) 별도 산출.**
4. **도메인 QA(필수)**: 기도제목 순서 온두라스→사역→가정 · 온두라스 정치 중립 · 사역 기도 1~2개 압축 · 가정 평강·문제예방·사전축복 · 실명은 팀장 지정 방침.

---

*작성: 2026-06 · v2(구조·방향성 + 선교 정신/정체성, 디자인은 Variant 위임). v1(단일 V4 시스템 고정)에서 전환 — 우진 지시: "디자인 다양성은 Variant, Claude는 앱 기본 구조·방향성 프롬프트." 선교 정체성·편지 목적·분위기는 MFH-CONTEXT·포트폴리오 시드 근거, 모토=2026 연 주제 "주님은 길을 내십니다".*
