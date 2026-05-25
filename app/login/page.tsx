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
      setError('로그인 실패: 이메일 또는 비밀번호를 확인해 주세요.')
      return
    }
    router.replace('/')
    router.refresh()
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="font-display text-xs font-semibold tracking-[0.25em] text-accent">
        MISSION FOR HONDURAS
      </p>
      <h1 className="font-display text-4xl font-extrabold text-primary">MFH</h1>
      <p className="mb-8 mt-1 text-sm text-muted">로그인</p>

      <label className="mb-1 block text-xs text-muted">이메일</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="honduras0691@gmail.com"
        className="mb-4 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
      />

      <label className="mb-1 block text-xs text-muted">비밀번호</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        className="mb-6 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
      />

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      <button
        onClick={signIn}
        disabled={loading}
        className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? '로그인 중…' : '로그인'}
      </button>
    </main>
  )
}
