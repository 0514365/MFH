// lib/fonts.ts
// MFH 폰트 — Montserrat(영문·숫자·제목) + Pretendard(한글 본문·UI).
// Montserrat 는 next/font/google 로 빌드 시 셀프호스트(깜빡임·레이아웃 이동 방지).
// Pretendard 는 구글폰트가 아니므로 app/layout.tsx 에서 CDN <link> 로 로드한다.
// 폰트 스택은 tailwind.config 의 fontFamily / globals.css 에서 정의한다.

import { Montserrat, Inter, Manrope, Noto_Serif_KR } from "next/font/google";

export const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

// Inter — 공개페이지(/p/*) Airbnb-Style 테마의 라틴 본문 폰트.
// Airbnb Cereal(라이선스 폰트) 대체. 한글은 Pretendard 로 폴백(portfolio-theme.css 의 --font-sans).
export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

// Manrope — MFH 2027(Minimal Block) 숫자·제목 폰트. 회계부터 적용, 2027 전체 확장.
// 숫자 폭이 일정해 좁은 블록·키패드에서도 정렬이 흔들리지 않는다. 한글은 Pretendard 폴백.
export const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-manrope",
  display: "swap",
});

// Noto Serif KR — 2027(4-5) 성경 본문 명조(QT 핵심절 · 성경 읽기 · 성경 검색 본문). 긴 본문 가독성.
// 한글 폰트라 latin 서브셋만 선언하고 preload 끄기(next/font 가 유니코드 범위 조각으로 셀프호스트).
export const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-serif",
  display: "swap",
  preload: false,
});

// 참고용 스택 상수 (tailwind/ globals 와 값 일치시킬 것)
// next/font 는 해시된 패밀리명을 var(--font-montserrat) 로 노출하므로 리터럴 "Montserrat" 대신 변수를 쓴다.
export const FONT_STACK = {
  // 제목·영문·숫자: Montserrat 우선, 한글은 Pretendard 폴백
  display:
    'var(--font-montserrat), "Pretendard", -apple-system, BlinkMacSystemFont, sans-serif',
  // 본문·UI(한글 다수): Pretendard 우선
  sans:
    '"Pretendard", var(--font-montserrat), -apple-system, BlinkMacSystemFont, sans-serif',
  // 2027 숫자·제목: Manrope 우선, 한글은 Pretendard 폴백
  num: 'var(--font-manrope), "Pretendard", -apple-system, BlinkMacSystemFont, sans-serif',
  // 2027 성경 본문: Noto Serif KR
  serif: 'var(--font-serif), "Noto Serif KR", serif',
} as const;
