'use client'
// MFH-CAL-SUBSCRIBE-2027 — 4-4: 연회색 면 한 줄(접힘) · 구독 = 터키석 행동 알약 · 링크 복사·재발급 = 흰/글자 알약.
// MFH-ICS-SUBSCRIBE-V1
// "아이폰 캘린더에 추가" — 구독형 ICS 피드 링크 발급/복사/재발급.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

export default function CalendarSubscribe() {
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.rpc('ensure_calendar_token')
        if (alive && !error && data) setToken(data as string)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const host = typeof window !== 'undefined' ? window.location.host : ''
  const httpsUrl = token ? `https://${host}/api/calendar/${token}` : ''
  const webcalUrl = token ? `webcal://${host}/api/calendar/${token}` : ''

  async function copy() {
    try {
      await navigator.clipboard.writeText(httpsUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* 클립보드 미지원 시 무시 */
    }
  }

  async function regenerate() {
    if (!confirm('새 구독 링크를 만들면 기존 링크는 즉시 끊깁니다. 진행할까요?')) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('regenerate_calendar_token')
      if (!error && data) setToken(data as string)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-2xl bg-b27-card px-4 py-3 text-left text-[13px] text-b27-ink transition active:opacity-70"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
        </svg>
        <span className="flex-1">캘린더 구독 (아이폰·구글)</span>
        <span className={`text-b27-muted transition ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="mt-2 rounded-2xl bg-b27-card p-4 text-xs">
          {loading && !token ? (
            <p className="text-b27-muted">구독 링크 준비 중…</p>
          ) : token ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={webcalUrl}
                  className="inline-flex items-center gap-1.5 rounded-full bg-b27-plus px-3.5 py-1.5 font-medium text-white transition active:opacity-80"
                >
                  캘린더에 바로 구독
                </a>
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 rounded-full bg-b27-paper px-3.5 py-1.5 font-medium text-b27-ink transition active:opacity-70"
                >
                  {copied ? '복사됨 ✓' : '링크 복사'}
                </button>
                <button
                  type="button"
                  onClick={regenerate}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-b27-muted transition active:opacity-70"
                >
                  링크 재발급
                </button>
              </div>

              <div className="rounded-xl bg-b27-paper px-3 py-2 font-mono text-[11px] text-b27-muted break-all">
                {httpsUrl}
              </div>

              <div className="space-y-1 text-[11px] leading-relaxed text-b27-muted">
                <p className="font-medium text-b27-ink">아이폰에서 등록</p>
                <p>· 위 <span className="font-medium text-b27-ink">캘린더에 바로 구독</span> 을 누르면 구독 창이 열립니다.</p>
                <p>· 또는 설정 → 캘린더 → 계정 → 계정 추가 → 기타 → <span className="font-medium text-b27-ink">구독 캘린더 추가</span> 에 복사한 링크를 붙여넣습니다.</p>
                <p className="pt-1 text-b27-expense">링크에는 비밀 토큰이 들어 있습니다. 외부에 공유하지 마세요.</p>
              </div>
            </div>
          ) : (
            <p className="text-b27-muted">구독 링크를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.</p>
          )}
        </div>
      )}
    </div>
  )
}
