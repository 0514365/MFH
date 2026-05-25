'use client'

import { useEffect, useState, type ReactNode } from 'react'

export default function SplashGate({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let seen = false
    try {
      seen = sessionStorage.getItem('mfh_splash') === '1'
    } catch {
      seen = false
    }
    if (!seen) {
      setShow(true)
      try {
        sessionStorage.setItem('mfh_splash', '1')
      } catch {
        // ignore
      }
      const t = setTimeout(() => setShow(false), 1700)
      return () => clearTimeout(t)
    }
  }, [])

  return (
    <>
      {children}
      {show && (
        <div className="splash-overlay" onClick={() => setShow(false)}>
          <div className="splash-wordmark font-display">MFH</div>
        </div>
      )}
    </>
  )
}
