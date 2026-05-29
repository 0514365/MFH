'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function ThemePage() {
  const router = useRouter()
  const year = new Date().getFullYear()
  const [verseRef, setVerseRef] = useState('')
  const [themeEn, setThemeEn] = useState('')
  const [theme, setTheme] = useState('')
  const [quote, setQuote] = useState('')
  const [goalsText, setGoalsText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void supabase
      .from('year_themes')
      .select('theme, goals, verse_ref, theme_en, quote')
      .eq('year', year)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const row = data as {
            theme: string | null
            goals: unknown
            verse_ref: string | null
            theme_en: string | null
            quote: string | null
          }
          setVerseRef(row.verse_ref ?? '')
          setThemeEn(row.theme_en ?? '')
          setTheme(row.theme ?? '')
          setQuote(row.quote ?? '')
          if (Array.isArray(row.goals)) setGoalsText((row.goals as string[]).join('\n'))
        }
        setLoading(false)
      })
  }, [year])

  async function save() {
    setSaving(true)
    setMsg(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }
    const goals = goalsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    const { error } = await supabase.from('year_themes').upsert(
      {
        user_id: user.id,
        year,
        verse_ref: verseRef.trim() || null,
        theme_en: themeEn.trim() || null,
        theme: theme.trim() || null,
        quote: quote.trim() || null,
        goals,
      },
      { onConflict: 'user_id,year' },
    )
    setSaving(false)
    if (error) {
      setMsg('저장 실패: ' + error.message)
      return
    }
    router.replace('/')
    router.refresh()
  }

  const input =
    'w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-primary'

  if (loading) {
    return <main className="mx-auto max-w-md px-6 py-10 text-sm text-faint">불러오는 중…</main>
  }

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <Link href="/" className="text-xs text-muted underline">
        ← 홈
      </Link>
      <h1 className="mt-2 font-display text-2xl font-extrabold text-primary">{year} 주제·목표</h1>
      <p className="mb-6 mt-1 text-xs text-faint">오프닝(스플래시)과 홈 배너에 표시됩니다.</p>

      <label className="mb-1 block text-xs text-muted">구절 참조 (오프닝 상단)</label>
      <input
        value={verseRef}
        onChange={(e) => setVerseRef(e.target.value)}
        className={input + ' mb-4'}
        placeholder="예: 이사야 43:19"
      />

      <label className="mb-1 block text-xs text-muted">영문 주제 (오프닝)</label>
      <input
        value={themeEn}
        onChange={(e) => setThemeEn(e.target.value)}
        className={input + ' mb-4'}
        placeholder="예: God Will Make a Way"
      />

      <label className="mb-1 block text-xs text-muted">국문 주제</label>
      <input
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className={input + ' mb-4'}
        placeholder="예: 주님이 길을 내십니다"
      />

      <label className="mb-1 block text-xs text-muted">말씀 인용 (오프닝)</label>
      <input
        value={quote}
        onChange={(e) => setQuote(e.target.value)}
        className={input + ' mb-4'}
        placeholder='예: 내가 광야에 길을, 사막에 강을 내리니'
      />

      <label className="mb-1 block text-xs text-muted">목표 (한 줄에 하나)</label>
      <textarea
        value={goalsText}
        onChange={(e) => setGoalsText(e.target.value)}
        rows={5}
        className={input + ' mb-6'}
        placeholder={'예배당 건축 설계 완료\n방과후학교 정착\n동역자 세우기'}
      />

      {msg && <p className="mb-4 text-sm text-danger">{msg}</p>}

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
        <button onClick={() => router.back()} className="rounded-xl border border-line px-5 py-3 text-sm text-muted">
          취소
        </button>
      </div>
    </main>
  )
}
