import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { montserrat } from '@/lib/fonts'
import { light, tokensToCssVars } from '@/lib/palette'
import BottomNav from '@/components/BottomNav'
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
    <html lang="ko" className={montserrat.variable}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `:root{${tokensToCssVars(light)}}` }} />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body>
        {children}
        <BottomNav />
      </body>
    </html>
  )
}
