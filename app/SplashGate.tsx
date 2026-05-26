'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase-browser'

type Theme = { theme: string; goals: string[] }

export default function SplashGate({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [theme, setTheme] = useState<Theme | null>(null)
  const year = new Date().getFullYear()

  useEffect(() => {
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
      .select('theme, goals')
      .eq('year', year)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        const row = data as { theme: string | null; goals: unknown }
        setTheme({
          theme: row.theme ?? '',
          goals: Array.isArray(row.goals) ? (row.goals as string[]) : [],
        })
      })

    const t = setTimeout(() => setRevealed(true), 6200)
    return () => clearTimeout(t)
  }, [year])

  if (!show) return <>{children}</>

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
            <img src="/intro-white-anim.svg" alt="MFH — Mission for Honduras" />
          </div>
          <div className="mfh-panel">
            {theme?.theme && (
              <>
                <div className="mfh-kicker">{year} · 온두라스</div>
                <div className="mfh-theme">{theme.theme}</div>
                {theme.goals.length > 0 && (
                  <>
                    <div className="mfh-rule" />
                    <ul className="mfh-goals">
                      {theme.goals.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
            <button type="button" className="mfh-start" onClick={() => setShow(false)}>
              시작하기
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .mfh-splash {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: #661f20;
          color: #fff;
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
          width: min(80%, 360px);
          transition: transform 1s cubic-bezier(0.22, 0.61, 0.36, 1);
        }
        .mfh-logo :global(img) {
          width: 100%;
          height: auto;
          display: block;
        }
        .mfh-splash.revealed .mfh-logo {
          transform: translateY(-26vh) scale(0.62);
        }
        .mfh-panel {
          position: absolute;
          left: 32px;
          right: 32px;
          top: 46%;
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
          color: rgba(255, 255, 255, 0.72);
        }
        .mfh-theme {
          font-family: var(--font-montserrat), sans-serif;
          font-weight: 800;
          font-size: 26px;
          line-height: 1.25;
          margin: 12px 0 4px;
        }
        .mfh-rule {
          width: 46px;
          height: 2px;
          background: rgba(255, 255, 255, 0.4);
          margin: 18px auto 16px;
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
          color: rgba(255, 255, 255, 0.9);
          position: relative;
          padding-left: 18px;
        }
        .mfh-goals li::before {
          content: '–';
          position: absolute;
          left: 0;
          color: rgba(255, 255, 255, 0.6);
        }
        .mfh-start {
          margin-top: 26px;
          font-family: var(--font-montserrat), sans-serif;
          font-weight: 700;
          font-size: 14px;
          color: #661f20;
          background: #fff;
          border: 0;
          border-radius: 12px;
          padding: 12px 28px;
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
          color: rgba(255, 255, 255, 0.8);
          background: rgba(255, 255, 255, 0.12);
          border: 0;
          border-radius: 8px;
          padding: 7px 12px;
          cursor: pointer;
        }
      `}</style>
    </>
  )
}
