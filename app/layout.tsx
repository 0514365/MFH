// MFH-LAYOUT-V5 — 성경 본문 명조(Noto Serif KR, --font-serif) 변수 추가.
// MFH-LAYOUT-V4 — 2027 토큰 승격: --b27-* 변수를 :root 로(전 앱에서 b27-* 클래스 사용 가능). 공용 토큰 브릿지는 여전히 .theme-2027 스코프.
// MFH-LAYOUT-V3 — 2027 토큰(.theme-2027 스코프 변수 · Manrope 변수) 선언. 적용은 회계 layout 부터(b 단계).
// MFH-LAYOUT-V2 — 하단 탭바는 app/(app)/layout.tsx 의 AppShell 로 이동(셸 밖 /login /p 는 탭바 없음).
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { montserrat, manrope, notoSerifKr } from '@/lib/fonts'
import { light, tokensToCssVars, brand2027ToCssVars } from '@/lib/palette'
import BadgeSync from '@/components/BadgeSync'
import './globals.css'

export const metadata: Metadata = {
  title: 'MFH · Mission for Honduras',
  description: '선교 활동 기록·인사이트·포트폴리오 플랫폼',
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#661F20',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${montserrat.variable} ${manrope.variable} ${notoSerifKr.variable}`}>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{${tokensToCssVars(light)} ${brand2027ToCssVars()}}`,
          }}
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body>
        {children}
        <BadgeSync />
      </body>
    </html>
  )
}
