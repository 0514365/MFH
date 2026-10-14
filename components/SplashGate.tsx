'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase-browser'

type Theme = {
  verse_ref: string
  theme_en: string
  theme: string
  quote: string
  goals: string[]
}

export default function SplashGate({
  children,
  skip = false,
}: {
  children: ReactNode
  skip?: boolean
}) {
  const [show, setShow] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [theme, setTheme] = useState<Theme | null>(null)
  const year = new Date().getFullYear()

  useEffect(() => {
    if (skip) return

    let seen = false
    try {
      seen = sessionStorage.getItem('mfh_splash') === '1'
    } catch {
      seen = false
    }
    if (seen) return

    setShow(true)
    try {
      sessionStorage.setItem('mfh_splash', '1')
    } catch {
      // ignore
    }

    const supabase = createClient()
    void supabase
      .from('year_themes')
      .select('theme, goals, verse_ref, theme_en, quote')
      .eq('year', year)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        const row = data as {
          theme: string | null
          goals: unknown
          verse_ref: string | null
          theme_en: string | null
          quote: string | null
        }
        setTheme({
          verse_ref: row.verse_ref ?? '',
          theme_en: row.theme_en ?? '',
          theme: row.theme ?? '',
          quote: row.quote ?? '',
          goals: Array.isArray(row.goals) ? (row.goals as string[]) : [],
        })
      })

    // 3초 이내 정착: 로고 페이드(~0.6s) 후 1.4s 에 패널 reveal → 패널 페이드 0.8s → ~2.2s 정착
    const t = setTimeout(() => setRevealed(true), 1400)
    return () => clearTimeout(t)
  }, [year, skip])

  if (skip || !show) return <>{children}</>

  const hasTheme = !!(theme && (theme.theme || theme.theme_en))

  return (
    <>
      {children}
      <div className={`mfh-splash ${revealed ? 'revealed' : ''}`}>
        <button type="button" className="mfh-skip" onClick={() => setShow(false)}>
          건너뛰기
        </button>
        <div className="mfh-stage">
          <div className="mfh-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-primary.svg" alt="MFH — Mission for Honduras" />
          </div>
          <div className="mfh-panel">
            {hasTheme && (
              <>
                <div className="mfh-kicker">{theme!.verse_ref || `${year} · 온두라스`}</div>
                <div className="mfh-theme">
                  {theme!.theme_en && <span className="mfh-theme-en">{theme!.theme_en}</span>}
                  {theme!.theme && <span className="mfh-theme-ko">{theme!.theme}</span>}
                </div>
                {theme!.quote && <div className="mfh-quote">&ldquo;{theme!.quote}&rdquo;</div>}
                {theme!.goals.length > 0 && (
                  <>
                    <div className="mfh-rule" />
                    <ul className="mfh-goals">
                      {theme!.goals.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
            <div>
              <button type="button" className="mfh-start" onClick={() => setShow(false)}>
                시작하기
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .mfh-splash {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: #fff;
          color: #222;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          -webkit-font-smoothing: antialiased;
        }
        .mfh-stage {
          position: relative;
          width: 100%;
          max-width: 430px;
          height: 100%;
          max-height: 860px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
        }
        .mfh-logo {
          width: min(78%, 340px);
          opacity: 0;
          animation: mfhFade 0.55s ease 0.1s forwards;
          transition: transform 0.7s cubic-bezier(0.22, 0.61, 0.36, 1);
        }
        .mfh-logo :global(img) {
          width: 100%;
          height: auto;
          display: block;
        }
        .mfh-splash.revealed .mfh-logo {
          transform: translateY(-23vh) scale(0.62);
        }
        @keyframes mfhFade {
          to {
            opacity: 1;
          }
        }
        .mfh-panel {
          position: absolute;
          left: 32px;
          right: 32px;
          top: 44%;
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.8s ease, transform 0.8s ease;
          text-align: center;
        }
        .mfh-splash.revealed .mfh-panel {
          opacity: 1;
          transform: translateY(0);
        }
        .mfh-kicker {
          font-family: var(--font-montserrat), sans-serif;
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #717171;
        }
        .mfh-theme {
          margin: 12px 0 8px;
          line-height: 1.25;
        }
        .mfh-theme-en {
          display: block;
          font-family: var(--font-montserrat), sans-serif;
          font-weight: 800;
          font-size: 27px;
        }
        .mfh-theme-ko {
          display: block;
          font-family: 'Pretendard', var(--font-montserrat), sans-serif;
          font-weight: 700;
          font-size: 19px;
          margin-top: 4px;
        }
        .mfh-quote {
          font-style: italic;
          font-size: 13.5px;
          line-height: 1.55;
          color: #717171;
          max-width: 300px;
          margin: 0 auto;
        }
        .mfh-rule {
          width: 46px;
          height: 2px;
          background: #b61821;
          margin: 16px auto 14px;
          border-radius: 2px;
        }
        .mfh-goals {
          list-style: none;
          display: inline-block;
          text-align: left;
          padding: 0;
          margin: 0;
        }
        .mfh-goals li {
          font-size: 14.5px;
          line-height: 1.9;
          color: #3f3f3f;
          position: relative;
          padding-left: 18px;
        }
        .mfh-goals li::before {
          content: '–';
          position: absolute;
          left: 0;
          color: #b61821;
        }
        .mfh-start {
          margin-top: 28px;
          font-family: var(--font-montserrat), sans-serif;
          font-weight: 700;
          font-size: 14px;
          color: #fff;
          background: #b61821;
          border: 0;
          border-radius: 12px;
          padding: 12px 30px;
          cursor: pointer;
        }
        .mfh-skip {
          position: absolute;
          top: 16px;
          right: 16px;
          z-index: 5;
          font-family: var(--font-montserrat), sans-serif;
          font-weight: 600;
          font-size: 12px;
          color: #717171;
          background: #f2f2f2;
          border: 0;
          border-radius: 8px;
          padding: 7px 12px;
          cursor: pointer;
        }
        /* 데스크탑: 무대·로고 확대 */
        @media (min-width: 768px) {
          .mfh-stage {
            max-width: 760px;
            max-height: none;
          }
          .mfh-logo {
            width: min(54%, 560px);
          }
          .mfh-kicker {
            font-size: 14px;
          }
          .mfh-theme-en {
            font-size: 34px;
          }
          .mfh-theme-ko {
            font-size: 22px;
          }
          .mfh-quote {
            font-size: 15px;
            max-width: 360px;
          }
          .mfh-goals li {
            font-size: 16px;
          }
        }
      `}</style>
    </>
  )
}
