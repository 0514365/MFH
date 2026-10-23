// MFH-PORTFOLIO-THEME-LAYOUT-V2 — 2027: Inter → Manrope 변수(제목·숫자), 본문은 Pretendard(portfolio-theme.css).
// /p/* (공개페이지) 전용 레이아웃 — 2027 테마 스코프(.portfolio-theme)와 Manrope 폰트 변수를 주입한다.
// RootLayout(app/layout.tsx) 하위에서 동작하며, 이 wrapper 안에서만 테마 토큰이 유효하다.

import type { ReactNode } from 'react';
import { manrope } from '@/lib/fonts';
import './portfolio-theme.css';

export default function PortfolioThemeLayout({ children }: { children: ReactNode }) {
  return <div className={`portfolio-theme ${manrope.variable}`}>{children}</div>;
}
