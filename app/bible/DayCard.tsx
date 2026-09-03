'use client'

// MFH-BIBLE-DAY-CARD-V1
// 오늘(또는 다음) 읽을 분량 카드 — 큰 읽음 체크 + 읽은 날/시각/소요 분(자동 입력·수동 수정) + 한 줄 은혜 + 기도제목 포함.
//   · 체크: lib/bible/checkin 규칙(즉시 저장).
//   · 은혜: blur/Enter 시 저장. 기도제목 연결 중이면 일지의 prayer 도 함께 갱신.
//   · 기도제목 포함 ON: 일지(분류 '성경통독', 머릿말 '통독 · 범위', prayer=은혜, 기도후보) 생성 후 journal_entry_id 연결.
//     OFF: 그 자동 일지 삭제 + 연결 해제. 은혜가 비어 있으면 ON 불가.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import DateField from '@/app/journal/DateField'
import TimeField from '@/components/TimeField'
import { hm, setDayDone, todayHn } from '@/lib/bible/checkin'
import { estimateMinutes, shortDate } from '@/lib/bible/plan'
import type { ReadingPlanDay } from '@/lib/types'

export const BIBLE_JOURNAL_CATEGORY = '성경통독'

type Props = {
  day: ReadingPlanDay
  heading: string // "오늘" / "다음" / "밀림"
}

export default function DayCard({ day, heading }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [done, setDone] = useState(day.done)
  const [readOn, setReadOn] = useState(day.read_on ?? '')
  const [readTime, setReadTime] = useState(hm(day.read_time))
  const [minutes, setMinutes] = useState(day.read_minutes != null ? String(day.read_minutes) : '')
  const [grace, setGrace] = useState(day.grace ?? '')
  const [savedGrace, setSavedGrace] = useState(day.grace ?? '')
  const [prayer, setPrayer] = useState(day.prayer_candidate)
  const [journalId, setJournalId] = useState(day.journal_entry_id)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  // 서버 refresh 로 day 가 바뀌면(다른 곳에서 체크 등) 동기화.
  useEffect(() => {
    setDone(day.done)
    setReadOn(day.read_on ?? '')
    setReadTime(hm(day.read_time))
    setMinutes(day.read_minutes != null ? String(day.read_minutes) : '')
    setPrayer(day.prayer_candidate)
    setJournalId(day.journal_entry_id)
  }, [day])

  function flash(text: string) {
    setNote(text)
    window.setTimeout(() => setNote(null), 1800)
  }

  async function toggleDone() {
    if (busy) return
    const next = !done
    setBusy(true)
    setDone(next)
    const { payload, error } = await setDayDone(supabase, day.id, next, day.chars)
    setBusy(false)
    if (error) {
      setDone(!next)
      alert('변경 실패: ' + error)
      return
    }
    setReadOn(payload.read_on ?? '')
    setReadTime(payload.read_time ?? '')
    setMinutes(payload.read_minutes != null ? String(payload.read_minutes) : '')
    router.refresh()
  }

  async function patch(fields: Partial<ReadingPlanDay>) {
    const { error } = await supabase
      .from('reading_plan_days')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', day.id)
    if (error) alert('저장 실패: ' + error.message)
    else router.refresh()
    return !error
  }

  async function saveGrace() {
    const text = grace.trim()
    if (text === savedGrace) return
    const ok = await patch({ grace: text || null })
    if (!ok) return
    setSavedGrace(text)
    // 기도제목 연결 중이면 일지 prayer 도 갱신(비우면 연결 해제까지).
    if (journalId) {
      if (text) {
        await supabase.from('journal_entries').update({ prayer: text }).eq('id', journalId)
      } else {
        await unlinkJournal()
      }
    }
    flash('저장됨')
  }

  async function unlinkJournal() {
    if (journalId) await supabase.from('journal_entries').delete().eq('id', journalId)
    await patch({ prayer_candidate: false, journal_entry_id: null })
    setPrayer(false)
    setJournalId(null)
  }

  async function togglePrayer() {
    if (busy) return
    if (prayer) {
      setBusy(true)
      await unlinkJournal()
      setBusy(false)
      flash('기도제목에서 제외')
      return
    }
    const text = grace.trim()
    if (!text) {
      flash('한 줄 은혜를 먼저 적어 주세요')
      return
    }
    setBusy(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }
    if (text !== savedGrace) {
      await patch({ grace: text })
      setSavedGrace(text)
    }
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        user_id: user.id,
        entry_date: readOn || todayHn(),
        category: BIBLE_JOURNAL_CATEGORY,
        headline: `통독 · ${day.range_label}`,
        prayer: text,
        prayer_candidate: true,
        is_private: false,
        is_secret: false,
      })
      .select('id')
      .single()
    if (error || !data) {
      setBusy(false)
      alert('일지 생성 실패: ' + (error?.message ?? ''))
      return
    }
    const jid = (data as { id: string }).id
    const ok = await patch({ prayer_candidate: true, journal_entry_id: jid })
    setBusy(false)
    if (!ok) {
      await supabase.from('journal_entries').delete().eq('id', jid)
      return
    }
    setPrayer(true)
    setJournalId(jid)
    flash('일지에 기도후보로 저장')
  }

  const minutesNum = Number(minutes)
  const chipInput = 'w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-[12px] outline-none focus:border-primary'

  return (
    <section className={`rounded-3xl border bg-surface p-5 ${done ? 'border-accent' : 'border-line'}`}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-muted">
            {heading} · {shortDate(day.read_date)} · {day.day_no}일차
          </div>
          <div className="mt-0.5 text-[20px] font-bold leading-tight text-ink">{day.range_label}</div>
          <div className="mt-1 text-[12px] text-muted">
            {day.chapters}장 · {day.chars.toLocaleString()}자 · 약 {estimateMinutes(day.chars)}분
          </div>
        </div>
        <button
          type="button"
          onClick={toggleDone}
          disabled={busy}
          aria-pressed={done}
          aria-label={done ? '읽음 취소' : '읽음 체크'}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-2xl font-extrabold transition-colors ${
            done ? 'border-accent bg-accent text-white' : 'border-[#e6c9cb] text-transparent hover:border-accent'
          }`}
        >
          ✓
        </button>
      </div>

      {done && (
        <div className="mt-3 grid grid-cols-[1.4fr_1.2fr_0.8fr] gap-2">
          <div>
            <div className="mb-1 text-[10px] text-faint">읽은 날</div>
            <div className="[&>div>div]:!rounded-lg [&>div>div]:!px-2 [&>div>div]:!py-1.5 [&>div>div]:!text-[12px] [&_input]:!rounded-lg [&_input]:!px-2 [&_input]:!py-1.5 [&_input]:!text-[12px]">
              <DateField
                value={readOn}
                onChange={(v) => {
                  setReadOn(v)
                  if (v) void patch({ read_on: v })
                }}
                placeholder="날짜"
              />
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] text-faint">시각</div>
            <div className="[&>div>div]:!rounded-lg [&>div>div]:!px-2 [&>div>div]:!py-1.5 [&>div>div]:!text-[12px] [&_input]:!rounded-lg [&_input]:!px-2 [&_input]:!py-1.5 [&_input]:!text-[12px]">
              <TimeField
                value={readTime}
                onChange={(v) => {
                  setReadTime(v)
                  if (v) void patch({ read_time: v })
                }}
                placeholder="시각"
              />
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] text-faint">소요(분)</div>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              onBlur={() => {
                if (minutes && !Number.isNaN(minutesNum) && minutesNum > 0) void patch({ read_minutes: Math.round(minutesNum) })
              }}
              className={chipInput}
            />
          </div>
        </div>
      )}

      <div className="mt-4">
        <label className="mb-1 block text-[12px] font-semibold text-muted">
          오늘의 한 줄 은혜 <span className="font-normal text-faint">(선택)</span>
        </label>
        <input
          value={grace}
          onChange={(e) => setGrace(e.target.value)}
          onBlur={saveGrace}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          maxLength={200}
          placeholder="읽으며 마음에 남은 한 구절·한 생각"
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={togglePrayer}
            disabled={busy}
            aria-pressed={prayer}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${
              prayer ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:border-primary'
            }`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M12 4v16" />
              <path d="M5 10h14" />
            </svg>
            기도제목에 포함
          </button>
          <span className="truncate text-[11px] text-faint">
            {note ??
              (journalId ? (
                <Link href={`/journal/${journalId}`} className="underline">
                  일지(성경통독) 보기
                </Link>
              ) : (
                '켜면 일지에 기도후보로 저장'
              ))}
          </span>
        </div>
      </div>
    </section>
  )
}
