// MFH-LOGIN-V2 — 2027 Minimal Block: 로고(현재 색) + Manrope 제목 + 연회색 입력 면 + 터키석 알약 로그인(행동색).
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function signIn() {
    const hasEnv =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!hasEnv) {
      setError('환경변수가 설정되지 않았습니다.')
      return
    }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) {
      setError('로그인 실패: ' + (signInError.message || '이메일 또는 비밀번호를 확인해 주세요.'))
      return
    }
    router.replace('/')
    router.refresh()
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-primary.svg" alt="MFH — Mission for Honduras" className="mb-7 h-10 w-auto self-start" />
      <h1 className="mb-6 font-num text-[17px] font-semibold text-b27-ink">로그인</h1>

      <label className="mb-1.5 block text-xs text-b27-muted">이메일</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="honduras0691@gmail.com"
        className="mb-4 w-full rounded-xl bg-b27-card px-4 py-3 text-sm text-b27-ink outline-none placeholder:text-b27-muted focus:ring-2 focus:ring-inset focus:ring-b27-ink"
      />

      <label className="mb-1.5 block text-xs text-b27-muted">비밀번호</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        className="mb-6 w-full rounded-xl bg-b27-card px-4 py-3 text-sm text-b27-ink outline-none placeholder:text-b27-muted focus:ring-2 focus:ring-inset focus:ring-b27-ink"
      />

      {error && <p className="mb-4 text-sm text-b27-expense">{error}</p>}

      <button
        onClick={signIn}
        disabled={loading}
        className="w-full rounded-full bg-b27-plus py-3 font-num text-sm font-semibold text-white transition active:opacity-80 disabled:opacity-50"
      >
        {loading ? '로그인 중…' : '로그인'}
      </button>
    </main>
  )
}
