// lib/palette.ts
// MFH 2026 Brand Kit — 팔레트 토큰 (라이트 / 다크)
// 기본 테마: 시스템 자동(prefers-color-scheme). 수동 전환은 <html data-theme="light|dark">.
// 토큰 이름은 두 테마 공통이며, CSS 변수(--kebab-case)로 주입해 사용한다.

export type ThemeName = "light" | "dark";

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
};

export const dark: PaletteTokens = {
  primary: "#6E2425",
  primaryHover: "#5A1C1D",
  accent: "#E0474F",
  accentHover: "#C93840",
  danger: "#E0474F",
  primarySoft: "#3A2627",
  accentSoft: "#3C2122",
  onPrimarySoft: "#E6B7B8",
  onAccentSoft: "#F4A6AA",
  paper: "#161110",
  surface: "#1F1817",
  surfaceSubtle: "#2A2120",
  line: "#382E2C",
  text: "#F1EBE9",
  textMuted: "#A6A2A0",
  textFaint: "#726D6B",
  onPrimary: "#FFFFFF",
  onAccent: "#FFFFFF",
};

export const themes: Record<ThemeName, PaletteTokens> = { light, dark };

// camelCase 토큰 키 → --kebab-case CSS 변수명
const toCssVar = (key: string): string =>
  "--" + key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

// 토큰 한 세트를 ":root{...}" 내부에 넣을 선언 문자열로 변환
export function tokensToCssVars(tokens: PaletteTokens): string {
  return (Object.keys(tokens) as (keyof PaletteTokens)[])
    .map((k) => `${toCssVar(k as string)}: ${tokens[k]};`)
    .join(" ");
}

// 전체 테마 CSS — 시스템 자동 기본 + data-theme 수동 오버라이드.
// app/globals.css 에 붙이거나, 루트 레이아웃의 <style>로 주입한다.
export function paletteCss(): string {
  const lightVars = tokensToCssVars(light);
  const darkVars = tokensToCssVars(dark);
  return [
    `:root{${lightVars}}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${darkVars}}}`,
    `[data-theme="dark"]{${darkVars}}`,
    `[data-theme="light"]{${lightVars}}`,
  ].join("\n");
}
