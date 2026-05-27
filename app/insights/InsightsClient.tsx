'use client'

// MFH-INSIGHTS-CLIENT-V1
// 하이브리드 인사이트 UI.
//  · 도메인 탭(종합/일지/프로젝트/할 일) + 기간 칩(7/30/90)
//  · 수동 경로: [데이터 내보내기](.md 다운로드) → claude.ai(Max) 분석 → [결과 붙여넣어 저장]
//  · 자동 경로: [AI로 생성](API, 종량제) — hasApiKey 일 때만 강조, 아니면 안내
//  · 결과 카드: 별점(1~5) + 메모 저장(피드백 → 선호 프로파일), 삭제
// 색: palette var 매핑이라 색-슬래시 opacity 금지(요소 opacity-* 만). 동적 클래스 금지(정적 분기).

import { useState } from 'react'
import { INSIGHT_PERIODS, DOMAIN_LABEL, type InsightDomain } from '@/lib/insightExport'

export type InsightRow = {
  id: string
  domain: InsightDomain
  period_start: string | null
  period_end: string | null
  content: string | null
  model: string | null
  rating: number | null
  feedback_note: string | null
  created_at: string
}

const DOMAINS: InsightDomain[] = ['overall', 'journal', 'project', 'task']

function periodDaysOf(end: string | null, start: string | null): number {
  if (!end || !start) return 30
  const d = Math.round((+new Date(end) - +new Date(start)) / 86400000)
  return [7, 30, 90].includes(d) ? d : 30
}

export default function InsightsClient({
  initial,
  hasApiKey,
}: {
  initial: InsightRow[]
  hasApiKey: boolean
}) {
  const [rows, setRows] = useState<InsightRow[]>(initial)
  const [domain, setDomain] = useState<InsightDomain>('overall')
  const [days, setDays] = useState<number>(30)
  const [busy, setBusy] = useState<'' | 'auto' | 'manual'>('')
  const [err, setErr] = useState<string>('')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')

  const exportHref = `/api/insights/export?domain=${domain}&days=${days}`

  async function genAuto() {
    setErr('')
    setBusy('auto')
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ domain, periodDays: days }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErr(json.error ?? '생성에 실패했습니다.')
        return
      }
      setRows((r) => [json.insight as InsightRow, ...r])
    } catch {
      setErr('네트워크 오류가 발생했습니다.')
    } finally {
      setBusy('')
    }
  }

  async function saveManual() {
    const content = pasteText.trim()
    if (!content) {
      setErr('붙여넣을 내용이 없습니다.')
      return
    }
    setErr('')
    setBusy('manual')
    try {
      const res = await fetch('/api/insights/manual', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ domain, periodDays: days, content }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErr(json.error ?? '저장에 실패했습니다.')
        return
      }
      setRows((r) => [json.insight as InsightRow, ...r])
      setPasteText('')
      setPasteOpen(false)
    } catch {
      setErr('네트워크 오류가 발생했습니다.')
    } finally {
      setBusy('')
    }
  }

  function patchRow(id: string, patch: Partial<InsightRow>) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }

  async function setRating(id: string, rating: number) {
    patchRow(id, { rating })
    await fetch(`/api/insights/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rating }),
    }).catch(() => {})
  }

  async function saveNote(id: string, note: string) {
    await fetch(`/api/insights/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ feedback_note: note }),
    }).catch(() => {})
  }

  async function remove(id: string) {
    const res = await fetch(`/api/insights/${id}`, { method: 'DELETE' })
    if (res.ok) setRows((r) => r.filter((x) => x.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* 도메인 탭 */}
      <div className="flex flex-wrap gap-2">
        {DOMAINS.map((d) => {
          const active = d === domain
          return (
            <button
              key={d}
              onClick={() => setDomain(d)}
              className={
                active
                  ? 'rounded-full border-2 border-primary bg-primary-soft px-3 py-1 text-sm font-semibold text-primary'
                  : 'rounded-full border border-line px-3 py-1 text-sm text-muted transition hover:border-primary'
              }
            >
              {DOMAIN_LABEL[d]}
            </button>
          )
        })}
      </div>

      {/* 기간 칩 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-faint">기간</span>
        {INSIGHT_PERIODS.map((p) => {
          const active = p.value === days
          return (
            <button
              key={p.value}
              onClick={() => setDays(p.value)}
              className={
                active
                  ? 'rounded-full border-2 border-primary px-3 py-1 text-sm font-semibold text-primary'
                  : 'rounded-full border border-line px-3 py-1 text-sm text-muted transition hover:border-primary'
              }
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {/* 액션 패널 */}
      <div className="space-y-3 rounded-2xl border border-line bg-surface p-5">
        <div className="text-sm font-semibold text-primary">새 인사이트</div>

        {/* 수동(무료) */}
        <div className="rounded-xl bg-surface-subtle p-4">
          <div className="text-xs font-semibold text-ink">수동 (Max 구독 · 무료)</div>
          <p className="mt-1 text-[11px] leading-snug text-faint">
            데이터를 내려받아 claude.ai 프로젝트에 올려 분석한 뒤, 결과를 붙여넣어 저장합니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={exportHref}
              className="rounded-xl border border-primary px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary-soft"
            >
              데이터 내보내기
            </a>
            <button
              onClick={() => {
                setErr('')
                setPasteOpen((v) => !v)
              }}
              className="rounded-xl border border-line px-3 py-2 text-sm text-muted transition hover:border-primary"
            >
              {pasteOpen ? '붙여넣기 닫기' : '결과 붙여넣어 저장'}
            </button>
          </div>
          {pasteOpen && (
            <div className="mt-3 space-y-2">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={8}
                placeholder="claude.ai 에서 받은 인사이트 전문을 붙여넣으세요."
                className="w-full rounded-xl border border-line bg-surface p-3 text-sm text-ink outline-none focus:border-primary"
              />
              <button
                onClick={saveManual}
                disabled={busy !== ''}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {busy === 'manual' ? '저장 중…' : `${DOMAIN_LABEL[domain]} 저장`}
              </button>
            </div>
          )}
        </div>

        {/* 자동(종량제) */}
        <div className="rounded-xl bg-surface-subtle p-4">
          <div className="text-xs font-semibold text-ink">자동 (API · 종량제)</div>
          <p className="mt-1 text-[11px] leading-snug text-faint">
            {hasApiKey
              ? '앱이 직접 분석합니다. 호출당 소액(약 수십 원)이 과금됩니다.'
              : 'API 키·결제수단이 준비되면 활성화됩니다. 현재는 수동 방식을 사용하세요.'}
          </p>
          <button
            onClick={genAuto}
            disabled={!hasApiKey || busy !== ''}
            className="mt-3 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy === 'auto' ? '생성 중…' : 'AI로 생성'}
          </button>
        </div>

        {err && <p className="text-sm text-danger">{err}</p>}
      </div>

      {/* 결과 목록 */}
      <div className="space-y-4">
        <div className="text-sm font-semibold text-primary">저장된 인사이트</div>
        {rows.length === 0 ? (
          <p className="text-sm text-faint">아직 저장된 인사이트가 없습니다.</p>
        ) : (
          rows.map((row) => (
            <InsightCard
              key={row.id}
              row={row}
              onRate={(r) => setRating(row.id, r)}
              onNote={(n) => {
                patchRow(row.id, { feedback_note: n })
                saveNote(row.id, n)
              }}
              onDelete={() => remove(row.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function InsightCard({
  row,
  onRate,
  onNote,
  onDelete,
}: {
  row: InsightRow
  onRate: (rating: number) => void
  onNote: (note: string) => void
  onDelete: () => void
}) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState(row.feedback_note ?? '')
  const created = row.created_at?.slice(0, 10) ?? ''
  const isManual = row.model === 'manual'

  return (
    <article className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-primary">{DOMAIN_LABEL[row.domain]}</div>
        <div className="text-[11px] text-faint">
          {created} · {isManual ? '수동' : 'AI'}
        </div>
      </div>
      <div className="mt-1 text-[11px] text-faint">
        {row.period_start} ~ {row.period_end}
      </div>

      <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
        {row.content}
      </div>

      {/* 별점 */}
      <div className="mt-4 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = (row.rating ?? 0) >= n
          return (
            <button
              key={n}
              aria-label={`${n}점`}
              onClick={() => onRate(n)}
              className={on ? 'text-lg text-accent' : 'text-lg text-faint'}
            >
              ★
            </button>
          )
        })}
        <button
          onClick={() => setNoteOpen((v) => !v)}
          className="ml-3 text-xs text-muted underline"
        >
          {noteOpen ? '메모 닫기' : '메모'}
        </button>
        <button onClick={onDelete} className="ml-auto text-xs text-faint underline">
          삭제
        </button>
      </div>

      {noteOpen && (
        <div className="mt-3 space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="이 인사이트에 대한 메모(다음 분석 개선에 반영)"
            className="w-full rounded-xl border border-line bg-surface p-3 text-sm text-ink outline-none focus:border-primary"
          />
          <button
            onClick={() => {
              onNote(note.trim())
              setNoteOpen(false)
            }}
            className="rounded-xl border border-primary px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary-soft"
          >
            메모 저장
          </button>
        </div>
      )}
    </article>
  )
}
