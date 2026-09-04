'use client'

// MFH-BIBLE-DAY-CARD-V3
// 하루 분량 카드 — 두 모드.
//   · live   (오늘/다음 카드): 큰 읽음 체크 + 방법·은혜·기도제목 즉시 저장(기존 방식).
//   · record (이전 기록, DayRow 에서 펼침): 읽기 전용 요약 → 「수정」 버튼 → 편집 폼(로컬 상태) → 「수정 완료」로 한 번에 저장 / 「취소」로 되돌림.
// 공통 규칙:
//   · 체크 ON 시 최초 기록(읽은 날·시각·분)이 있으면 보존, 없을 때만 자동 입력(lib/bible/checkin).
//   · 기도제목 포함 ON: 일지(분류 '성경통독', 머릿말 '통독 · 범위', prayer=은혜, 기도후보) 생성 후 journal_entry_id 연결.
//     OFF(또는 은혜 비움): 그 자동 일지 삭제 + 연결 해제. 은혜 없이는 ON 불가. 은혜 수정 시 일지 prayer 동기화.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-browser'
import DateField from '@/app/journal/DateField'
import TimeField from '@/components/TimeField'
import { estimateByMethod, hm, methodLabel, READ_METHODS, setDayDone, timeKo, todayHn, type ReadMethod } from '@/lib/bible/checkin'
import { longDate, shortDate } from '@/lib/bible/plan'
import type { ReadingPlanDay } from '@/lib/types'

export const BIBLE_JOURNAL_CATEGORY = '성경통독'

type Props = {
  day: ReadingPlanDay
  heading: string // "오늘" / "다음" / "기록"
  mode?: 'live' | 'record'
}

// 편집 가능한 필드 묶음(record 모드 로컬 상태 / live 모드 즉시 저장 상태 공용).
type Draft = {
  readOn: string
  readTime: string // 'HH:MM'
  minutes: string
  method: ReadMethod | null
  grace: string
  prayer: boolean
}

function draftOf(d: ReadingPlanDay): Draft {
  return {
    readOn: d.read_on ?? '',
    readTime: hm(d.read_time),
    minutes: d.read_minutes != null ? String(d.read_minutes) : '',
    method: d.read_method ?? null,
    grace: d.grace ?? '',
    prayer: d.prayer_candidate,
  }
}

// 기도제목(일지) 동기화 — 목표 상태(prayerOn, grace)에 맞춰 일지 생성/갱신/삭제. 반환 = 새 journal_entry_id(변경 없으면 기존).
async function syncJournal(
  supabase: SupabaseClient,
  day: ReadingPlanDay,
  current: { journalId: string | null; prayerOn: boolean },
  target: { prayerOn: boolean; grace: string; readOn: string },
): Promise<{ journalId: string | null; error: string | null }> {
  const wantOn = target.prayerOn && !!target.grace
  if (!wantOn) {
    if (current.journalId) {
      const { error } = await supabase.from('journal_entries').delete().eq('id', current.journalId)
      if (error) return { journalId: current.journalId, error: error.message }
    }
    return { journalId: null, error: null }
  }
  if (current.journalId) {
    const { error } = await supabase.from('journal_entries').update({ prayer: target.grace, entry_date: target.readOn || todayHn() }).eq('id', current.journalId)
    return { journalId: current.journalId, error: error ? error.message : null }
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { journalId: null, error: '로그인이 필요합니다.' }
  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: user.id,
      entry_date: target.readOn || todayHn(),
      category: BIBLE_JOURNAL_CATEGORY,
      headline: `통독 · ${day.range_label}`,
      prayer: target.grace,
      prayer_candidate: true,
      is_private: false,
      is_secret: false,
    })
    .select('id')
    .single()
  if (error || !data) return { journalId: null, error: error?.message ?? '일지 생성 실패' }
  return { journalId: (data as { id: string }).id, error: null }
}

const PrayerIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M12 4v16" />
    <path d="M5 10h14" />
  </svg>
)

const compactField =
  '[&>div>div]:!rounded-lg [&>div>div]:!px-2 [&>div>div]:!py-1.5 [&>div>div]:!text-[12px] [&_input]:!rounded-lg [&_input]:!px-2 [&_input]:!py-1.5 [&_input]:!text-[12px]'
const chipInput = 'w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-[12px] outline-none focus:border-primary'

export default function DayCard({ day, heading, mode = 'live' }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [done, setDone] = useState(day.done)
  const [draft, setDraft] = useState<Draft>(() => draftOf(day))
  const [saved, setSaved] = useState<Draft>(() => draftOf(day))
  const [journalId, setJournalId] = useState(day.journal_entry_id)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  // 서버 refresh 로 day 가 바뀌면 동기화(편집 중이면 로컬 초안은 유지).
  useEffect(() => {
    setDone(day.done)
    const d = draftOf(day)
    setSaved(d)
    if (!editing) setDraft(d)
    setJournalId(day.journal_entry_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day])

  function flash(text: string) {
    setNote(text)
    window.setTimeout(() => setNote(null), 1800)
  }
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((p) => ({ ...p, [k]: v }))

  async function patch(fields: Partial<ReadingPlanDay>) {
    const { error } = await supabase
      .from('reading_plan_days')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', day.id)
    if (error) alert('저장 실패: ' + error.message)
    else router.refresh()
    return !error
  }

  // ── live 모드: 즉시 저장 ─────────────────────────────────────────────
  async function toggleDone() {
    if (busy) return
    const next = !done
    setBusy(true)
    setDone(next)
    const { payload, error } = await setDayDone(
      supabase,
      { id: day.id, chars: day.chars, read_on: draft.readOn || null, read_time: draft.readTime || null, read_minutes: draft.minutes ? Number(draft.minutes) : null, read_method: draft.method },
      next,
    )
    setBusy(false)
    if (error) {
      setDone(!next)
      alert('변경 실패: ' + error)
      return
    }
    const d: Draft = {
      ...draft,
      readOn: payload.read_on ?? '',
      readTime: payload.read_time ?? '',
      minutes: payload.read_minutes != null ? String(payload.read_minutes) : '',
    }
    setDraft(d)
    setSaved(d)
    router.refresh()
  }

  async function liveMethod(m: ReadMethod) {
    const next = draft.method === m ? null : m
    const fields: Partial<ReadingPlanDay> = { read_method: next }
    const d: Draft = { ...draft, method: next }
    // 읽음 상태에서 소요 분이 이전 자동값 그대로면 새 방법 속도로 재계산.
    if (done && (draft.minutes === '' || Number(draft.minutes) === estimateByMethod(day.chars, draft.method))) {
      const est = estimateByMethod(day.chars, next)
      d.minutes = String(est)
      fields.read_minutes = est
    }
    setDraft(d)
    if (await patch(fields)) setSaved(d)
  }

  async function liveGrace() {
    const text = draft.grace.trim()
    if (text === saved.grace) return
    if (!(await patch({ grace: text || null }))) return
    const r = await syncJournal(supabase, day, { journalId, prayerOn: draft.prayer }, { prayerOn: draft.prayer, grace: text, readOn: draft.readOn })
    if (r.error) alert('일지 동기화 실패: ' + r.error)
    if (r.journalId !== journalId) {
      setJournalId(r.journalId)
      await patch({ prayer_candidate: !!r.journalId, journal_entry_id: r.journalId })
      set('prayer', !!r.journalId)
    }
    setSaved({ ...draft, grace: text })
    flash('저장됨')
  }

  async function livePrayer() {
    if (busy) return
    const text = draft.grace.trim()
    if (!draft.prayer && !text) {
      flash('한 줄 은혜를 먼저 적어 주세요')
      return
    }
    setBusy(true)
    if (text !== saved.grace) await patch({ grace: text })
    const r = await syncJournal(supabase, day, { journalId, prayerOn: draft.prayer }, { prayerOn: !draft.prayer, grace: text, readOn: draft.readOn })
    if (r.error) {
      setBusy(false)
      alert('일지 처리 실패: ' + r.error)
      return
    }
    const on = !!r.journalId
    await patch({ prayer_candidate: on, journal_entry_id: r.journalId })
    setJournalId(r.journalId)
    const d = { ...draft, grace: text, prayer: on }
    setDraft(d)
    setSaved(d)
    setBusy(false)
    flash(on ? '일지에 기도후보로 저장' : '기도제목에서 제외')
  }

  // ── record 모드: 수정 → 수정 완료(일괄 저장) / 취소 ────────────────────
  function startEdit() {
    setDraft(saved)
    setEditing(true)
  }
  function cancelEdit() {
    setDraft(saved)
    setEditing(false)
  }
  async function commitEdit() {
    if (busy) return
    const text = draft.grace.trim()
    const wantPrayer = draft.prayer && !!text
    const min = Number(draft.minutes)
    setBusy(true)
    const r = await syncJournal(supabase, day, { journalId, prayerOn: saved.prayer }, { prayerOn: wantPrayer, grace: text, readOn: draft.readOn })
    if (r.error) {
      setBusy(false)
      alert('일지 처리 실패: ' + r.error)
      return
    }
    const ok = await patch({
      read_on: draft.readOn || null,
      read_time: draft.readTime || null,
      read_minutes: draft.minutes && !Number.isNaN(min) && min > 0 ? Math.round(min) : null,
      read_method: draft.method,
      grace: text || null,
      prayer_candidate: !!r.journalId,
      journal_entry_id: r.journalId,
    })
    setBusy(false)
    if (!ok) return
    setJournalId(r.journalId)
    const d = { ...draft, grace: text, prayer: !!r.journalId }
    setDraft(d)
    setSaved(d)
    setEditing(false)
    flash('수정 완료')
  }

  const isRecord = mode === 'record'
  const editable = !isRecord || editing
  const view = editable ? draft : saved
  const minutesEst = estimateByMethod(day.chars, view.method)

  return (
    <section className={`rounded-3xl border bg-surface p-5 ${isRecord ? 'border-line' : done ? 'border-accent' : 'border-line'}`}>
      {/* 머리 — 범위·분량 (+ live: 큰 체크 / record: 수정 버튼) */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-muted">
            {heading} · {shortDate(day.read_date)} · {day.day_no}일차
          </div>
          <div className="mt-0.5 text-[20px] font-bold leading-tight text-ink">{day.range_label}</div>
          <div className="mt-1 text-[12px] text-muted">
            {day.chapters}장 · {day.chars.toLocaleString()}자 · 약 {minutesEst}분
          </div>
        </div>
        {!isRecord && (
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
        )}
        {isRecord && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="shrink-0 rounded-xl border border-line px-3 py-2 text-[12px] font-semibold text-primary transition hover:border-primary"
          >
            수정
          </button>
        )}
      </div>

      {/* ── 읽기 전용 요약(record·비편집) ── */}
      {isRecord && !editing && (
        <div className="mt-3 space-y-2 text-[13px]">
          <div className="flex flex-wrap gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${done ? 'bg-status-done text-on-status-done' : 'bg-surface-subtle text-muted'}`}>
              {done ? '읽음' : '미완료'}
            </span>
            {saved.readOn && (
              <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-muted">
                {longDate(saved.readOn)}
                {saved.readTime ? ` ${timeKo(saved.readTime)}` : ''}
              </span>
            )}
            {saved.minutes && <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-muted">{saved.minutes}분</span>}
            {saved.method && <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-muted">{methodLabel(saved.method)}</span>}
          </div>
          <div className="text-ink">
            {saved.grace ? (
              <p className="leading-snug">{saved.grace}</p>
            ) : (
              <p className="text-faint">한 줄 은혜 없음</p>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-faint">
            <span className={`inline-flex items-center gap-1 ${saved.prayer ? 'text-accent' : ''}`}>
              <PrayerIcon /> {saved.prayer ? '기도제목 포함' : '기도제목 미포함'}
            </span>
            {note ?? (journalId && (
              <Link href={`/journal/${journalId}`} className="underline">
                일지(성경통독) 보기
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── 편집(live 항상 / record 편집 중) ── */}
      {editable && (
        <>
          {/* 통독 방법 */}
          <div className="mt-3 flex items-center gap-1.5">
            <span className="shrink-0 text-[10px] text-faint">방법</span>
            {READ_METHODS.map((m) => {
              const on = view.method === m.value
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => (isRecord ? set('method', on ? null : m.value) : liveMethod(m.value))}
                  aria-pressed={on}
                  className={`flex-1 rounded-full border px-2 py-1.5 text-[11px] font-semibold transition ${
                    on ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-muted hover:border-primary'
                  }`}
                >
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* 읽은 날·시각·소요 분 — live 는 읽음 상태에서만, record 편집은 항상 */}
          {(isRecord || done) && (
            <div className="mt-3 grid grid-cols-[1.4fr_1.2fr_0.8fr] gap-2">
              <div>
                <div className="mb-1 text-[10px] text-faint">읽은 날</div>
                <div className={compactField}>
                  <DateField
                    value={view.readOn}
                    onChange={(v) => {
                      set('readOn', v)
                      if (!isRecord && v) void patch({ read_on: v })
                    }}
                    placeholder="날짜"
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] text-faint">시각</div>
                <div className={compactField}>
                  <TimeField
                    value={view.readTime}
                    onChange={(v) => {
                      set('readTime', v)
                      if (!isRecord && v) void patch({ read_time: v })
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
                  value={view.minutes}
                  onChange={(e) => set('minutes', e.target.value)}
                  onBlur={() => {
                    const n = Number(draft.minutes)
                    if (!isRecord && draft.minutes && !Number.isNaN(n) && n > 0) void patch({ read_minutes: Math.round(n) })
                  }}
                  className={chipInput}
                />
              </div>
            </div>
          )}

          {/* 한 줄 은혜 + 기도제목 */}
          <div className="mt-4">
            <label className="mb-1 block text-[12px] font-semibold text-muted">
              오늘의 한 줄 은혜 <span className="font-normal text-faint">(선택)</span>
            </label>
            <input
              value={view.grace}
              onChange={(e) => set('grace', e.target.value)}
              onBlur={() => {
                if (!isRecord) void liveGrace()
              }}
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
                onClick={() => {
                  if (isRecord) {
                    if (!draft.prayer && !draft.grace.trim()) {
                      flash('한 줄 은혜를 먼저 적어 주세요')
                      return
                    }
                    set('prayer', !draft.prayer)
                  } else void livePrayer()
                }}
                disabled={busy}
                aria-pressed={view.prayer}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${
                  view.prayer ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:border-primary'
                }`}
              >
                <PrayerIcon />
                기도제목에 포함
              </button>
              <span className="truncate text-[11px] text-faint">
                {note ??
                  (journalId && !isRecord ? (
                    <Link href={`/journal/${journalId}`} className="underline">
                      일지(성경통독) 보기
                    </Link>
                  ) : (
                    '켜면 일지에 기도후보로 저장'
                  ))}
              </span>
            </div>
          </div>

          {/* record 편집 액션 */}
          {isRecord && (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={commitEdit}
                disabled={busy}
                className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? '저장 중…' : '수정 완료'}
              </button>
              <button type="button" onClick={cancelEdit} disabled={busy} className="rounded-xl border border-line px-4 py-2.5 text-sm text-muted">
                취소
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
