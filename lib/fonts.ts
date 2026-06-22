// lib/fonts.ts
// MFH 폰트 — Montserrat(영문·숫자·제목) + Pretendard(한글 본문·UI).
// Montserrat 는 next/font/google 로 빌드 시 셀프호스트(깜빡임·레이아웃 이동 방지).
// Pretendard 는 구글폰트가 아니므로 app/layout.tsx 에서 CDN <link> 로 로드한다.
// 폰트 스택은 tailwind.config 의 fontFamily / globals.css 에서 정의한다.

import { Montserrat, Inter } from "next/font/google";

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

// 참고용 스택 상수 (tailwind/ globals 와 값 일치시킬 것)
// next/font 는 해시된 패밀리명을 var(--font-montserrat) 로 노출하므로 리터럴 "Montserrat" 대신 변수를 쓴다.
export const FONT_STACK = {
  // 제목·영문·숫자: Montserrat 우선, 한글은 Pretendard 폴백
  display:
    'var(--font-montserrat), "Pretendard", -apple-system, BlinkMacSystemFont, sans-serif',
  // 본문·UI(한글 다수): Pretendard 우선
  sans:
    '"Pretendard", var(--font-montserrat), -apple-system, BlinkMacSystemFont, sans-serif',
} as const;
