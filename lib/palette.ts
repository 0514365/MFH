// lib/palette.ts
// MFH 2026 Brand Kit — 팔레트 토큰 (라이트)
// CSS 변수(--kebab-case)로 주입해 사용한다. (app/layout.tsx)

export type PaletteTokens = {
  // Brand
  primary: string;
  primaryHover: string;
  accent: string;
  accentHover: string;
  danger: string;
  // Tint (연한/어두운 채움 + 그 위 글자)
  primarySoft: string;
  accentSoft: string;
  onPrimarySoft: string;
  onAccentSoft: string;
  // Neutral
  paper: string;
  surface: string;
  surfaceSubtle: string;
  line: string;
  text: string;
  textMuted: string;
  textFaint: string;
  // On-color
  onPrimary: string;
  onAccent: string;
  // Status (2026 개편: upcoming/in_progress/done — 브랜드색과 별개의 기능색, NOTION 식 soft)
  statusUpcoming: string;
  onStatusUpcoming: string;
  statusProgress: string;
  onStatusProgress: string;
  statusDone: string;
  onStatusDone: string;
};

export const light: PaletteTokens = {
  primary: "#661F20",
  primaryHover: "#531719",
  accent: "#B61821",
  accentHover: "#9A141B",
  danger: "#B61821",
  primarySoft: "#F1E4E4",
  accentSoft: "#FAE3E4",
  onPrimarySoft: "#661F20",
  onAccentSoft: "#B61821",
  paper: "#FFFFFF", // 2027 셸(2단계): 미색 #FAF8F7 → 순백(셸과 본문 경계 제거)
  surface: "#FFFFFF",
  surfaceSubtle: "#F2EEEC",
  line: "#E5DFDC",
  text: "#221C1C",
  textMuted: "#80807F",
  textFaint: "#A8A6A4",
  onPrimary: "#FFFFFF",
  onAccent: "#FFFFFF",
  statusUpcoming: "#F1EFE8",
  onStatusUpcoming: "#444441",
  statusProgress: "#E6F1FB",
  onStatusProgress: "#0C447C",
  statusDone: "#E1F5EE",
  onStatusDone: "#0F6E56",
};

// camelCase 토큰 키 → --kebab-case CSS 변수명
const toCssVar = (key: string): string =>
  "--" + key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

// 토큰 한 세트를 ":root{...}" 내부에 넣을 선언 문자열로 변환
export function tokensToCssVars(tokens: PaletteTokens): string {
  return (Object.keys(tokens) as (keyof PaletteTokens)[])
    .map((k) => `${toCssVar(k as string)}: ${tokens[k]};`)
    .join(" ");
}

// ---------------------------------------------------------------------------
// MFH 2027 리브랜딩 — "Minimal Block" 토큰 (회계 먼저 적용, 2027 전체 확장).
// 흰 바탕 · 파스텔 블록 8색 + 같은 색 할로(흰 글자 가장자리 대비) · 남색 앵커 · 터키석 ＋ 하나.
// CSS 변수 접두 --b27-* 로 :root 에 주입(app/layout.tsx). 공용 토큰(--paper 등)을 2027 값으로 덮는 브릿지는 app/globals.css 의 .theme-2027 스코프. 기존 `light` 세트와 독립.
// 대비(흰 바탕): ink 12.6 · income 6.3 · expense 5.3 · wait 5.0. 블록 위 흰 글자는 할로 50%(3·4번 65%) 기준 3.3~5.8.

export type Brand2027Tokens = {
  ink: string; // 글자 · 선택 · 오늘 · 탭 활성 · 앵커 블록 · = 키
  plus: string; // ＋ 기록 버튼 · "모두 승인" 글자 (유일한 터키석)
  paper: string; // 바탕
  card: string; // 키패드 · 비활성 면
  muted: string; // 보조 글자
  line: string; // 행 구분선
  income: string;
  expense: string;
  wait: string; // 승인 대기 · 경고
  sun: string; // 달력 일요일 날짜 · 요일 머리글 (Rose 진한톤 — 지출 빨강과 구분)
  sat: string; // 달력 토요일 (터키석 = plus 와 동일)
  block1: string;
  block2: string;
  block3: string;
  block4: string;
  block5: string;
  block6: string;
  block7: string;
  block8: string;
  halo1: string;
  halo2: string;
  halo3: string;
  halo4: string;
  halo5: string;
  halo6: string;
  halo7: string;
  halo8: string;
  // 틴트 — 블록 n 의 연한 면(타이틀 알약 · 그룹 면 · 통화/결제수단 묶음)
  tint1: string;
  tint2: string;
  tint3: string;
  tint4: string;
  tint5: string;
  tint6: string;
  tint7: string;
  tint8: string;
  // 소프트 — 의미색의 연한 면 / 막대 진한 톤
  incomeSoft: string;
  expenseSoft: string;
  waitSoft: string;
  incomeBar: string; // 수입 현재 막대 · 범례 (지출 쪽은 block6)
};

export const brand2027: Brand2027Tokens = {
  ink: "#2B3160",
  plus: "#2EC4B6",
  paper: "#FFFFFF",
  card: "#F6F8FA",
  muted: "#7A8093", // 실기 피드백(홈 C안): #8A90A0 → 한 단계 진하게(연회색 면 위 가독성)
  line: "#EEF0F3",
  income: "#2A5BC0",
  expense: "#C23A34",
  wait: "#B45309",
  sun: "#D64A58", // 흰 바탕 대비 4.2
  sat: "#2EC4B6", // 흰 바탕 대비 2.2 — 햇빛에서 약하면 #17A094(3.5)
  // 항목 블록 8색 — 대분류 안 항목 정렬 순서대로 순환 (lib/acct-display.ts, c 단계)
  block1: "#8ED0CE", // Lagoon
  block2: "#F9ADA4", // Salmon
  block3: "#FCD79B", // Apricot
  block4: "#C6EBE1", // Mint
  block5: "#CFCAED", // Lavender
  block6: "#F07F8A", // Rose
  block7: "#F4CBD0", // Blush
  block8: "#B3B9E2", // Periwinkle
  // 할로 — 같은 색 진한 톤 50% (Apricot·Mint 는 밝아서 65%)
  halo1: "rgba(32,80,79,0.5)",
  halo2: "rgba(148,20,5,0.5)",
  halo3: "rgba(133,80,0,0.65)",
  halo4: "rgba(34,108,90,0.65)",
  halo5: "rgba(78,57,198,0.5)",
  halo6: "rgba(101,6,15,0.5)",
  halo7: "rgba(169,30,48,0.5)",
  halo8: "rgba(48,60,141,0.5)",
  tint1: "#EAF6F5", // 달러
  tint2: "#FDECEA", // 신용카드 · 카드대금 · 결제수단 카드
  tint3: "#FEF6E7", // 원화 · 결제수단 현금
  tint4: "#EBF8F4",
  tint5: "#F1EFFA", // 결제수단 납부
  tint6: "#FCE7E9",
  tint7: "#FBF0F1",
  tint8: "#EEF0F9", // 렘피라
  incomeSoft: "#E1EAFB",
  expenseSoft: "#FBE1DF",
  waitSoft: "#FFF4E3",
  incomeBar: "#8FB8EE",
};

export const BLOCK_COUNT = 8;

// 블록 번호(1~8, 범위 밖은 순환) → { bg, halo } 토큰 값
export function blockColor(n: number): { bg: string; halo: string } {
  const i = (((n - 1) % BLOCK_COUNT) + BLOCK_COUNT) % BLOCK_COUNT + 1;
  const bg = brand2027[`block${i}` as keyof Brand2027Tokens];
  const halo = brand2027[`halo${i}` as keyof Brand2027Tokens];
  return { bg, halo };
}

// 블록 위 흰 글자용 text-shadow 3겹(2·6·10px). 인라인 style 로 사용: style={{ textShadow: blockHalo(n) }}
export function blockHalo(n: number): string {
  const { halo } = blockColor(n);
  return `0 0 2px ${halo}, 0 0 6px ${halo}, 0 1px 10px ${halo}`;
}

// brand2027 → "--b27-kebab: value;" 선언 문자열 (:root 주입용 — tint1 → --b27-tint-1, incomeSoft → --b27-income-soft)
export function brand2027ToCssVars(): string {
  return (Object.keys(brand2027) as (keyof Brand2027Tokens)[])
    .map((k) => `--b27-${(k as string).replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()).replace(/(\D)(\d)$/, "$1-$2")}: ${brand2027[k]};`)
    .join(" ");
}
