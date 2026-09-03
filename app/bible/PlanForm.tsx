'use client'

// MFH-BIBLE-PLAN-FORM-V1
// 통독 계획 수립 폼 — 타이틀·기간·제외 요일·읽기 순서·배분 방식 + 실시간 미리보기(buildSchedule).
// 저장: 기존 활성 계획 비활성화 → reading_plans insert → reading_plan_days 일괄 insert(200행 단위) → /bible.
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import DateField from '@/app/journal/DateField'
import {
  addDays,
  buildSchedule,
  longDate,
  READ_ORDER_LABEL,
  SPLIT_MODE_LABEL,
  WEEKDAY_KR,
  weekdayOf,
  type ReadOrder,
  type SplitMode,
} from '@/lib/bible/plan'
import { TOTAL_CHAPTERS, TOTAL_CHARS } from '@/lib/bible/data'

const input = 'w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-primary'
const label = 'mb-1 mt-4 block text-xs font-semibold text-muted'

// 요일 칩 표시 순서(월~일). 값은 JS getDay(0=일).
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-full border py-2 text-[13px] transition ${
              on ? 'border-accent bg-accent font-semibold text-white' : 'border-line bg-surface text-muted hover:border-primary'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export default function PlanForm({ today }: { today: string }) {
  const router = useRouter()
  const [title, setTitle] = useState(`${today.slice(0, 4)} 성경 1독`)
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(addDays(today, 364))
  const [exclude, setExclude] = useState<number[]>([])
  const [order, setOrder] = useState<ReadOrder>('ot_first')
  const [mode, setMode] = useState<SplitMode>('chars')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const preview = useMemo(
    () => buildSchedule({ start, end, excludeWeekdays: exclude, order, mode }),
    [start, end, exclude, order, mode],
  )

  function toggleDay(d: number) {
    setExclude((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))
  }

  async function save() {
    if (saving) return
    if (!title.trim()) {
      setMsg('타이틀을 입력해 주세요.')
      return
    }
    if (!preview.ok) {
      setMsg(preview.error)
      return
    }
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

    // 1) 기존 활성 계획 → 보관(대기). 활성은 계정당 1개(DB partial unique).
    const { error: deactErr } = await supabase
      .from('reading_plans')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_active', true)
    if (deactErr) {
      setSaving(false)
      setMsg('기존 계획 정리 실패: ' + deactErr.message)
      return
    }

    // 2) 계획 insert
    const { data: plan, error: planErr } = await supabase
      .from('reading_plans')
      .insert({
        user_id: user.id,
        title: title.trim(),
        start_date: start,
        end_date: end,
        exclude_weekdays: exclude,
        read_order: order,
        split_mode: mode,
        total_days: preview.stats.readingDays,
        total_chapters: TOTAL_CHAPTERS,
        total_chars: TOTAL_CHARS,
        is_active: true,
      })
      .select('id')
      .single()
    if (planErr || !plan) {
      setSaving(false)
      setMsg('계획 저장 실패: ' + (planErr?.message ?? ''))
      return
    }
    const planId = (plan as { id: string }).id

    // 3) 일정 행 일괄 insert(200행 단위). 실패 시 계획 삭제(cascade)로 원복.
    const rows = preview.days.map((d) => ({
      plan_id: planId,
      user_id: user.id,
      day_no: d.dayNo,
      read_date: d.readDate,
      start_seq: d.startSeq,
      end_seq: d.endSeq,
      chapters: d.chapters,
      chars: d.chars,
      range_label: d.label,
    }))
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from('reading_plan_days').insert(rows.slice(i, i + 200))
      if (error) {
        await supabase.from('reading_plans').delete().eq('id', planId)
        setSaving(false)
        setMsg('일정 생성 실패: ' + error.message)
        return
      }
    }
    router.replace('/bible')
    router.refresh()
  }

  const excludedLabel = WEEKDAY_ORDER.filter((d) => exclude.includes(d)).map((d) => WEEKDAY_KR[d])

  return (
    <div>
      <label className={label + ' mt-0'}>타이틀</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="예: 2027 성경 1독" />

      <label className={label}>기간 (시작일 ~ 완료 목표일)</label>
      <div className="flex items-center gap-2">
        <DateField value={start} onChange={setStart} placeholder="시작일" />
        <span className="shrink-0 text-faint">~</span>
        <DateField value={end} onChange={setEnd} placeholder="완료 목표일" />
      </div>

      <label className={label}>
        읽기 제외 요일 <span className="font-normal text-faint">(탭해서 끄기)</span>
      </label>
      <div className="flex gap-1.5">
        {WEEKDAY_ORDER.map((d) => {
          const off = exclude.includes(d)
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              aria-pressed={off}
              className={`flex-1 rounded-xl border py-2 text-[13px] transition ${
                off
                  ? 'border-line bg-surface-subtle text-faint line-through'
                  : `border-line bg-surface hover:border-primary ${d === 0 ? 'text-accent' : 'text-ink'}`
              }`}
            >
              {WEEKDAY_KR[d]}
            </button>
          )
        })}
      </div>

      <label className={label}>읽기 순서</label>
      <Segmented
        value={order}
        onChange={setOrder}
        options={(Object.keys(READ_ORDER_LABEL) as ReadOrder[]).map((v) => ({ value: v, label: READ_ORDER_LABEL[v] }))}
      />

      <label className={label}>배분 방식</label>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'chapters' as SplitMode, label: SPLIT_MODE_LABEL.chapters },
          { value: 'chars' as SplitMode, label: `${SPLIT_MODE_LABEL.chars} (권장)` },
        ]}
      />
      <p className="mt-1.5 text-[11px] leading-snug text-faint">
        장 균등은 하루 글자수 편차가 최대 5배(시편 117편 70자 ~ 119편 5,198자). 글자 균등은 장 단위를 유지하며 하루 분량을 고르게 맞춥니다.
      </p>

      {/* 미리보기 */}
      <section className="mt-5 rounded-3xl bg-primary-soft p-5">
        <div className="font-display text-[10px] font-bold uppercase tracking-[0.15em] text-accent">미리보기</div>
        {preview.ok ? (
          <>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
              <div>
                <dt className="text-[11px] text-muted">읽는 날</dt>
                <dd className="font-bold text-primary">
                  {preview.stats.readingDays}일 <span className="font-normal text-muted">/ {preview.stats.calendarDays}일</span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted">완독일</dt>
                <dd className="font-bold text-primary">
                  {longDate(preview.stats.lastDate)} ({WEEKDAY_KR[weekdayOf(preview.stats.lastDate)]})
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted">하루 평균</dt>
                <dd className="font-bold text-primary">
                  {preview.stats.avgChapters}장 · {preview.stats.avgChars.toLocaleString()}자
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted">예상 시간</dt>
                <dd className="font-bold text-primary">
                  약 {preview.stats.avgMinutes}분 <span className="font-normal text-muted">(500자/분)</span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted">하루 장수</dt>
                <dd className="font-bold text-primary">
                  {preview.stats.minChapters}~{preview.stats.maxChapters}장
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted">하루 글자수</dt>
                <dd className="font-bold text-primary">
                  {preview.stats.minChars.toLocaleString()}~{preview.stats.maxChars.toLocaleString()}자
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[12px] text-muted">
              첫날 {preview.stats.firstLabel} · 마지막날 {preview.stats.lastLabel}
              {excludedLabel.length > 0 && ` · ${excludedLabel.join('·')} 제외`}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-danger">{preview.error}</p>
        )}
      </section>

      {msg && <p className="mt-4 text-sm text-danger">{msg}</p>}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving || !preview.ok}
          className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? '일정 생성 중…' : '계획 저장 · 일정 생성'}
        </button>
        <button type="button" onClick={() => router.back()} className="rounded-xl border border-line px-5 py-3 text-sm text-muted">
          취소
        </button>
      </div>
      {preview.ok && (
        <p className="mt-3 text-[11px] text-faint">
          저장하면 {preview.stats.readingDays}일치 일정이 생성되고 활성 계획으로 지정됩니다. 기존 활성 계획은 보관(대기)됩니다.
        </p>
      )}
    </div>
  )
}
