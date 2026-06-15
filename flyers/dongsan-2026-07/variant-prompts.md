# 동산교회 단기선교 전단 — Variant 배경 프롬프트

> 방식 C(혼합): 배경은 이미지 AI로, 글·일정·로고는 Claude가 HTML로 조립.
> **공통 규칙** — 모든 변주가 **중앙(세로 15~75%)을 비우고 상·하단·테두리만 장식**한다.
> 그래야 같은 카피(헤드라인·서비스 5종·일정박스)가 어느 배경에도 동일하게 얹혀 비교된다.
> 출력: 세로 3:4 · 글자/로고 없음 · 고해상도 · 브랜드색(마룬 #5E2A2B · 레드 #B61821 · 골드 #B88A3E · 크림 #F2EAD7).

확정 정보: **1 de julio, 2026 · 10:00 a.m. – 5:00 p.m. · Iglesia Las Brisas**

---

## A. 종이콜라주 (이미 보유 — 받으신 그 이미지)
`flyers/dongsan-2026-07/bg-collage.png` 로 저장 예정.

## B. 기하학 밴드 (모던·가독성 최고)
```
Modern geometric flyer background: a deep maroon rounded band across the TOP holding one small
centered red cross, a warm red band across the BOTTOM with a subtle row of family silhouettes,
and a clean cream block filling the entire MIDDLE. A few minimalist gold line-icons (stethoscope,
eyeglasses, heart) tucked near the band edges. Crisp, balanced.
Keep the center 15–75% height empty for text. Maroon #5E2A2B / red #B61821 / gold #B88A3E /
cream #F2EAD7. No text, no logos. Vertical 3:4, print-ready.
```

## C. 미니멀 십자가 (절제·신뢰·고급)
```
Minimal elegant flyer background on warm cream paper: one large, very soft pale-maroon cross
faintly watermarked behind the center, thin gold corner ornaments, and small delicate spot icons
(stethoscope, eyeglasses, a sprig of leaves, a heart) only in the four corners. Lots of calm
negative space, refined and trustworthy.
Keep the center 15–75% height empty for text. Maroon #5E2A2B / red #B61821 / gold #B88A3E /
cream #F2EAD7. No text, no logos. Vertical 3:4, print-ready.
```

## D. 따뜻한 일러스트 띠 (친근·가족)
```
Warm flat-illustration flyer background: along the BOTTOM third, a cheerful scene of a Honduran
family — parents, children, an elderly couple — in front of a small church, with a friendly nurse;
a slim decorative leaf strip along the TOP edge holding a small red cross. Keep the upper
two-thirds open as clean cream space. Soft, hopeful, editorial flat style.
Keep the center 15–75% height empty for text. Maroon #5E2A2B / red #B61821 / gold #B88A3E /
cream #F2EAD7. No text, no logos. Vertical 3:4, print-ready.
```

## E. 수채 보태니컬 프레임 (A의 부드러운 대안)
```
Soft watercolor flyer background: a delicate botanical frame of maroon, red and gold leaves,
small flowers, and a slender red cross at top-center, painted around the edges on warm cream
paper. Gentle painterly texture. Keep the whole center clean and empty. Calm, warm, organic.
Keep the center 15–75% height empty for text. Maroon #5E2A2B / red #B61821 / gold #B88A3E /
cream #F2EAD7. No text, no logos. Vertical 3:4, print-ready.
```

---

## 사용법
1. 위 프롬프트로 배경을 뽑는다(Gemini/ChatGPT/Midjourney). Midjourney는 끝에 `--ar 3:4 --no text`.
2. 받은 png를 `flyers/dongsan-2026-07/` 에 저장 — 예: `bg-B.png`, `bg-C.png` …
3. Claude가 각 배경에 같은 카피를 얹어 **비교 그리드**로 렌더 → 우진이 선택 → 최종 PDF.
