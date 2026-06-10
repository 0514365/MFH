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
  paper: "#FAF8F7",
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
