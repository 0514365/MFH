'use client'
// MFH-THEME-PAGE-V2 — 2027(4-8): 빨간 ‹ 헤더 · [올해|내년] 연도 알약(연말에 다음 해 주제를 미리 입력 — 홈은 그해 1/1부터 자동 전환)
//   · 맨 위 홈 주제 카드 실시간 미리보기(살구 중간 톤) · 「홈」/「오프닝」 두 묶음 · 목표 = 한 줄씩 입력칸 + 터키석 ＋ · 저장 = 남색.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { brand2027 } from '@/lib/palette'
import BackButton from '@/components/BackButton'

const THEME_FACE = '#FDE6C1' // 홈 주제 카드와 동일(app/(app)/page.tsx)

export default function ThemePage() {
  const router = useRouter()
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear)
  const [verseRef, setVerseRef] = useState('')
  const [themeEn, setThemeEn] = useState('')
  const [theme, setTheme] = useState('')
  const [quote, setQuote] = useState('')
  const [goals, setGoals] = useState<string[]>([''])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setMsg(null)
    setSaved(false)
    const supabase = createClient()
    void supabase
      .from('year_themes')
      .select('theme, goals, verse_ref, theme_en, quote')
      .eq('year', year)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return
        const row = data as {
          theme: string | null
          goals: unknown
          verse_ref: string | null
          theme_en: string | null
          quote: string | null
        } | null
        setVerseRef(row?.verse_ref ?? '')
        setThemeEn(row?.theme_en ?? '')
        setTheme(row?.theme ?? '')
        setQuote(row?.quote ?? '')
        const g = Array.isArray(row?.goals) ? (row?.goals as string[]) : []
        setGoals(g.length > 0 ? g : [''])
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [year])

  function setGoal(i: number, v: string) {
    setGoals((prev) => prev.map((g, j) => (j === i ? v : g)))
  }

  function removeGoal(i: number) {
    setGoals((prev) => (prev.length <= 1 ? [''] : prev.filter((_, j) => j !== i)))
  }

  async function save() {
    setSaving(true)
    setMsg(null)
    setSaved(false)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }
    const cleanGoals = goals.map((s) => s.trim()).filter(Boolean)
    const { error } = await supabase.from('year_themes').upsert(
      {
        user_id: user.id,
        year,
        verse_ref: verseRef.trim() || null,
        theme_en: themeEn.trim() || null,
        theme: theme.trim() || null,
        quote: quote.trim() || null,
        goals: cleanGoals,
      },
      { onConflict: 'user_id,year' },
    )
    setSaving(false)
    if (error) {
      setMsg('저장 실패: ' + error.message)
      return
    }
    // 올해 = 홈으로(배너 즉시 반영) · 내년 = 이 화면에 머묾(홈은 1/1부터 표시)
    if (year === thisYear) {
      router.replace('/')
      router.refresh()
    } else {
      setSaved(true)
    }
  }

  const input =
    'w-full rounded-xl bg-b27-card px-4 py-3 text-sm text-b27-ink outline-none placeholder:text-b27-muted focus:ring-2 focus:ring-b27-ink/15'
  const label = 'mb-1.5 block font-num text-[12px] font-medium text-b27-muted'
  const previewGoals = goals.map((g) => g.trim()).filter(Boolean)

  return (
    <main className="mx-auto max-w-md px-4 pb-10 @xl:max-w-2xl">
      {/* 상단바 — 빨간 ‹ + 제목 */}
      <header className="sticky top-0 z-30 -mx-4 mb-2 flex h-[52px] items-center bg-b27-paper pl-3 pr-4">
        <BackButton href="/" label="주제·목표" variant="text" />
      </header>

      {/* 연도 — 올해 / 내년 */}
      <div role="group" aria-label="연도" className="mb-3 inline-flex rounded-full bg-b27-card p-[3px]">
        {[thisYear, thisYear + 1].map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => setYear(y)}
            aria-pressed={year === y}
            className={`rounded-full px-4 py-1.5 font-num text-[13px] font-medium transition ${
              year === y ? 'bg-b27-ink text-white' : 'text-b27-muted'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* 홈 주제 카드 미리보기 */}
      <section className="mb-5 rounded-2xl p-5" style={{ background: THEME_FACE }} aria-label="홈 카드 미리보기">
        <div className="flex items-center gap-1.5 font-num text-[12px] font-medium tracking-[0.08em]" style={{ color: brand2027.deep3 }}>
          <i className="inline-block h-2 w-2 rounded-[2px]" style={{ background: brand2027.deep3 }} aria-hidden="true" />
          {year} THEME
        </div>
        <h1 className="mt-1.5 text-[20px] font-semibold leading-snug text-b27-ink">
          {theme.trim() || <span className="text-b27-muted">국문 주제</span>}
        </h1>
        {previewGoals.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {previewGoals.map((g, i) => (
              <li key={i} className="text-[13.5px] leading-snug text-b27-ink">
                {g}
              </li>
            ))}
          </ul>
        )}
        {(verseRef.trim() || themeEn.trim()) && (
          <p className="mt-3 truncate text-[11px]" style={{ color: brand2027.deep3 }}>
            오프닝 · {[verseRef.trim(), themeEn.trim()].filter(Boolean).join(' · ')}
          </p>
        )}
      </section>

      {loading ? (
        <p className="text-sm text-b27-muted">불러오는 중…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <GroupHead>홈</GroupHead>
          <div>
            <label className={label} htmlFor="theme-ko">국문 주제</label>
            <input id="theme-ko" value={theme} onChange={(e) => setTheme(e.target.value)} className={input} placeholder="예: 주님이 길을 내십니다" />
          </div>
          <div>
            <span className={label}>목표 · 한 줄에 하나</span>
            <div className="flex flex-col gap-2">
              {goals.map((g, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input
                    value={g}
                    onChange={(e) => setGoal(i, e.target.value)}
                    aria-label={`목표 ${i + 1}`}
                    className={input}
                    placeholder={i === 0 ? '예: 예배당 건축 설계 완료' : '목표'}
                  />
                  <button
                    type="button"
                    onClick={() => removeGoal(i)}
                    aria-label="목표 삭제"
                    className="flex h-10 w-9 shrink-0 items-center justify-center text-[18px] text-b27-muted active:opacity-70"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setGoals((prev) => [...prev, ''])}
              className="mt-2 rounded-full bg-b27-plus px-3.5 py-1.5 text-[12.5px] font-medium text-white transition active:opacity-80"
            >
              ＋ 목표
            </button>
          </div>

          <GroupHead>오프닝(스플래시)</GroupHead>
          <div>
            <label className={label} htmlFor="theme-verse">구절 참조</label>
            <input id="theme-verse" value={verseRef} onChange={(e) => setVerseRef(e.target.value)} className={input} placeholder="예: 이사야 43:19" />
          </div>
          <div>
            <label className={label} htmlFor="theme-en">영문 주제</label>
            <input id="theme-en" value={themeEn} onChange={(e) => setThemeEn(e.target.value)} className={input} placeholder="예: God Will Make a Way" />
          </div>
          <div>
            <label className={label} htmlFor="theme-quote">말씀 인용</label>
            <input id="theme-quote" value={quote} onChange={(e) => setQuote(e.target.value)} className={input} placeholder="예: 내가 광야에 길을, 사막에 강을 내리니" />
          </div>

          {msg && <p className="text-sm text-b27-expense">{msg}</p>}
          {saved && <p className="text-sm text-[#226C5A]">{year} 주제를 저장했습니다. 홈에는 {year}년 1월 1일부터 표시됩니다.</p>}

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="mt-2 w-full rounded-2xl bg-b27-ink py-4 text-[15px] font-medium text-white transition active:opacity-80 disabled:opacity-50"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      )}
    </main>
  )
}

function GroupHead({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-1.5 text-[13px] font-medium text-b27-ink">
      <i className="inline-block h-2 w-2 shrink-0 rounded-[2px]" style={{ background: brand2027.deep3 }} aria-hidden="true" />
      {children}
    </h2>
  )
}
