// MFH-PORTFOLIO-THEME-LAYOUT-V1
// /p/* (공개페이지) 전용 레이아웃 — Airbnb-Style 테마 스코프(.portfolio-theme)와 Inter 폰트 변수를 주입한다.
// RootLayout(app/layout.tsx) 하위에서 동작하며, 이 wrapper 안에서만 테마 토큰이 유효하다.

import type { ReactNode } from 'react';
import { inter } from '@/lib/fonts';
import './portfolio-theme.css';

export default function PortfolioThemeLayout({ children }: { children: ReactNode }) {
  return <div className={`portfolio-theme ${inter.variable}`}>{children}</div>;
}
