'use client'
// MFH-PRAYER-FORM-V1
// 공개페이지 방문자가 이름+메시지를 남기는 폼(anon insert). 제출 후 감사 화면.
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

export default function PrayerForm({ slug }: { slug: string }) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    const n = name.trim()
    const m = message.trim()
    if (!n || !m) {
      setErr('이름과 메시지를 모두 입력해 주세요.')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('intercessions')
        .insert({ visitor_name: n.slice(0, 50), message: m.slice(0, 2000) })
      if (error) throw error
      setDone(true)
    } catch {
      setErr('전송에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  const input =
    'w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-primary'

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="mt-4 font-display text-xl font-bold text-primary">감사합니다</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          남겨 주신 기도와 응원이 선교사 가정에 큰 힘이 됩니다.
          <br />
          귀한 마음 잊지 않겠습니다.
        </p>
        <Link
          href={`/p/${slug}`}
          className="mt-6 inline-block rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:border-primary"
        >
          ← 포트폴리오로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link href={`/p/${slug}`} className="text-xs font-semibold text-muted underline">
        ← 포트폴리오로
      </Link>
      <h1 className="mt-3 font-display text-2xl font-extrabold text-primary">중보기도</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        선교사 가정을 위한 기도제목이나 응원의 말을 남겨 주세요.
        <br />
        남겨 주신 메시지는 선교사 부부에게 전달됩니다.
      </p>

      <label className="mb-1 mt-6 block text-xs text-muted">이름</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={50}
        className={input}
        placeholder="성함 또는 닉네임"
      />

      <label className="mb-1 mt-4 block text-xs text-muted">기도·응원 메시지</label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={2000}
        rows={6}
        className={`${input} resize-y`}
        placeholder="기도제목, 응원, 축복의 말을 자유롭게 적어 주세요."
      />

      {err && <p className="mt-3 text-sm text-danger">{err}</p>}

      <button
        onClick={submit}
        disabled={saving}
        className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {saving ? '보내는 중…' : '기도·응원 보내기'}
      </button>
    </div>
  )
}
