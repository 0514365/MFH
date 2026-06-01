'use client'

// MFH-INSIGHTS-CLIENT-V2
// 목적 렌즈 구조 — 데이터 출처 4탭 → 선교 목적 렌즈(Prayer/Balance/Fruit/Letter).
//  · 렌즈 홈: 연주제 strip + [전체 분석 일괄 패널] + 렌즈 카드 4 + Raw 도메인 접이식.
//  · 전체 분석: 전체 데이터를 한 번 내보내(?bundle=1) Claude 분석 → 한 번 가져오기로 모든 렌즈에 분배.
//  · 렌즈 상세(범용): 기간칩 + 개별 내보내기/가져오기 + AI생성 + 결과카드(별점·메모·편지에담기·삭제).
//  · 백엔드(insightExport/insightPrompt/api) 재사용. 회수 = /api/insights/import(무료, 멀티렌즈 분배).
// 색: palette var 매핑 → 색-슬래시 opacity 금지(요소 opacity-* 만). 동적 클래스 금지(정적 분기).

import { useEffect, useState } from 'react'
import type { ReactElement, ChangeEvent } from 'react'
import {
  INSIGHT_PERIODS,
  DOMAIN_LABEL,
  LENS_LABEL,
  isLens,
  buildCategoryBreakdown,
  categoryColor,
  periodStart,
  todayStr,
  type InsightDomain,
  type LensKey,
  type CategoryBreakdown,
} from '@/lib/insightExport'
import { createClient } from '@/lib/supabase-browser'

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

type LensMeta = { key: LensKey; desc: string; v3?: boolean }
const LENS_META: LensMeta[] = [
  { key: 'prayer', desc: '기도제목 모으기 (3원칙)' },
  { key: 'balance', desc: '사역·가정 리듬' },
  { key: 'fruit', desc: '간증·응답된 기도' },
  { key: 'letter', desc: '월간 기도편지 초안', v3: true },
]

const RAW_DOMAINS_UI: InsightDomain[] = ['overall', 'journal', 'project', 'task']

// 렌즈 아이콘(인라인 SVG, 24x24, currentColor 상속 — ModuleIcon 스타일).
function LensIcon({ name, size = 20 }: { name: LensKey; size?: number }) {
  const paths: Record<LensKey, ReactElement> = {
    prayer: (
      <path d="M12 20.5s-6.5-4-9-7.8C1.4 9.6 2.6 6 6 6c1.9 0 3.2 1.2 4 2.6C10.8 7.2 12.1 6 14 6c3.4 0 4.6 3.6 3 6.7-2.5 3.8-9 7.8-9 7.8z" />
    ),
    balance: (
      <>
        <path d="M12 4 V20" />
        <path d="M7 20 H17" />
        <path d="M4 8 H20" />
        <path d="M4 8 l-2 5 h4 z" />
        <path d="M20 8 l-2 5 h4 z" />
        <circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none" />
      </>
    ),
    fruit: (
      <>
        <path d="M12 21 V12" />
        <path d="M12 14 c-3 0 -5 -2 -5 -5 c3 0 5 2 5 5 z" />
        <path d="M12 12 c3 0 5 -2 5 -5 c-3 0 -5 2 -5 5 z" />
      </>
    ),
    letter: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3.5 7.5 L12 13 L20.5 7.5" />
      </>
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

// Balance 렌즈: 기간 내 일지 분류를 클라에서 직접 집계(API 호출 없음 = 무료).
// journal_entries RLS 가 멤버 공유(is_member)라 user_id 필터를 일부러 걸지 않는다
// → 부부(우진+서진아) 일지를 함께 합산. 필터 추가 금지(insights 의 두 사람 종합 방침).
function useBalance(days: number, enabled: boolean) {
  const [data, setData] = useState<CategoryBreakdown | null>(null)
  const [loading, setLoading] = useState(enabled)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    setLoading(true)
    const supabase = createClient()
    void supabase
      .from('journal_entries')
      .select('category')
      .gte('entry_date', periodStart(days))
      .lte('entry_date', todayStr())
      .then(({ data: rows }) => {
        if (!alive) return
        const cats = ((rows ?? []) as { category: string | null }[]).map((r) => r.category)
        setData(buildCategoryBreakdown(cats))
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [days, enabled])
  return { data, loading }
}

// 분류 비중 막대(홈 미니 / 상세 공용). 색-슬래시 금지 → 인라인 style 로 분류색·너비.
// span 기반(+w-full) — 홈 카드 button 안에 들어가도 HTML 유효(div-in-span 회피).
function BalanceBar({ data, height = 8 }: { data: CategoryBreakdown; height?: number }) {
  return (
    <span
      className="flex w-full overflow-hidden rounded-full bg-surface-subtle"
      style={{ height }}
    >
      {data.items.map((it) => (
        <span
          key={it.category}
          title={`${it.category} ${Math.round(it.ratio * 100)}%`}
          style={{ width: `${it.ratio * 100}%`, background: categoryColor(it.category) }}
        />
      ))}
    </span>
  )
}

// 렌즈 상세 상단 비중 섹션(막대 + 범례). 죄책감 아닌 균형 관찰용.
function BalanceSection({ loading, data }: { loading: boolean; data: CategoryBreakdown | null }) {
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-primary">분류 비중</div>
        {data && data.total > 0 && <div className="text-[11px] text-faint">일지 {data.total}건</div>}
      </div>
      {loading ? (
        <p className="text-sm text-faint">집계 중…</p>
      ) : !data || data.total === 0 ? (
        <p className="text-sm text-faint">기간 내 일지 기록이 없습니다.</p>
      ) : (
        <>
          <BalanceBar data={data} height={10} />
          <ul className="space-y-1.5">
            {data.items.map((it) => (
              <li key={it.category} className="flex items-center gap-2 text-xs text-ink">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ background: categoryColor(it.category) }}
                />
                <span className="flex-1 truncate">{it.category}</span>
                <span className="text-muted">{it.count}건</span>
                <span className="w-9 text-right font-display text-faint">
                  {Math.round(it.ratio * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

// 내보내기 + 결과 가져오기(공용). 홈 전체 패널 / 렌즈 상세 모두 사용.
function ImportPanel({
  title,
  desc,
  exportHref,
  fallbackDomain,
  days,
  onAdd,
}: {
  title: string
  desc: string
  exportHref: string
  fallbackDomain: InsightDomain
  days: number
  onAdd: (added: InsightRow[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function doImport() {
    const content = text.trim()
    if (!content) {
      setErr('가져올 내용이 없습니다.')
      return
    }
    setErr('')
    setBusy(true)
    try {
      const res = await fetch('/api/insights/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ domain: fallbackDomain, periodDays: days, content }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErr(json.error ?? '가져오기에 실패했습니다.')
        return
      }
      onAdd((json.insights ?? []) as InsightRow[])
      setText('')
      setOpen(false)
    } catch {
      setErr('네트워크 오류가 발생했습니다.')
    } finally {
      setBusy(false)
    }
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result ?? ''))
    reader.readAsText(f)
  }

  return (
    <div className="rounded-xl bg-surface-subtle p-4">
      <div className="text-xs font-semibold text-ink">{title}</div>
      <p className="mt-1 text-[11px] leading-snug text-faint">{desc}</p>
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
            setOpen((v) => !v)
          }}
          className="rounded-xl border border-line px-3 py-2 text-sm text-muted transition hover:border-primary"
        >
          {open ? '가져오기 닫기' : '결과 가져오기'}
        </button>
      </div>
      {open && (
        <div className="mt-3 space-y-2">
          <label className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span className="cursor-pointer rounded-lg border border-line px-2 py-1 transition hover:border-primary">
              파일 선택 (.md/.txt)
            </span>
            <input
              type="file"
              accept=".md,.txt,text/markdown,text/plain"
              onChange={onFile}
              className="hidden"
            />
            <span className="text-faint">또는 아래에 붙여넣기</span>
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Claude 에서 받은 양식 결과를 붙여넣으세요. (===MFH-INSIGHT=== 블록)"
            className="w-full rounded-xl border border-line bg-surface p-3 text-sm text-ink outline-none focus:border-primary"
          />
          <button
            onClick={doImport}
            disabled={busy}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? '가져오는 중…' : '가져오기'}
          </button>
        </div>
      )}
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
    </div>
  )
}

// 기간 칩(공용).
function PeriodChips({
  days,
  onChange,
  small,
}: {
  days: number
  onChange: (d: number) => void
  small?: boolean
}) {
  return (
    <>
      {INSIGHT_PERIODS.map((p) => {
        const active = p.value === days
        const pad = small ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
        return (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className={
              active
                ? `rounded-full border-2 border-primary font-semibold text-primary ${pad}`
                : `rounded-full border border-line text-muted transition hover:border-primary ${pad}`
            }
          >
            {p.label}
          </button>
        )
      })}
    </>
  )
}

export default function InsightsClient({
  initial,
  hasApiKey,
  year,
  themeName,
}: {
  initial: InsightRow[]
  hasApiKey: boolean
  year: number
  themeName: string | null
}) {
  const [rows, setRows] = useState<InsightRow[]>(initial)
  const [view, setView] = useState<'home' | InsightDomain>('home')
  const [bundleDays, setBundleDays] = useState<number>(30)
  const homeBalance = useBalance(bundleDays, view === 'home')

  const addRows = (added: InsightRow[]) => setRows((r) => [...added, ...r])
  const patchRow = (id: string, patch: Partial<InsightRow>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const removeRow = (id: string) => setRows((r) => r.filter((x) => x.id !== id))
  const countOf = (d: InsightDomain) => rows.filter((r) => r.domain === d).length

  if (view !== 'home') {
    return (
      <LensDetail
        domain={view}
        rows={rows.filter((r) => r.domain === view)}
        hasApiKey={hasApiKey}
        onBack={() => setView('home')}
        onAdd={addRows}
        onPatch={patchRow}
        onRemove={removeRow}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* 연 주제 strip */}
      {themeName && (
        <div className="rounded-xl border border-line bg-surface-subtle px-4 py-2 text-xs text-muted">
          {year} · {themeName}
        </div>
      )}

      {/* 전체 분석 — 한 번에 내보내고 한 번에 가져오기 */}
      <div className="space-y-3 rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-primary">전체 분석</div>
          <div className="flex items-center gap-1">
            <PeriodChips days={bundleDays} onChange={setBundleDays} small />
          </div>
        </div>
        <ImportPanel
          title="전체 데이터 → 모든 렌즈 (무료)"
          desc="전체 데이터를 한 번에 내보내 Claude 에서 분석한 뒤, 결과를 가져오면 Prayer·Fruit 등 모든 렌즈에 자동 분배됩니다."
          exportHref={`/api/insights/export?bundle=1&days=${bundleDays}`}
          fallbackDomain="overall"
          days={bundleDays}
          onAdd={addRows}
        />
      </div>

      {/* 렌즈 카드 */}
      <div className="space-y-3">
        {LENS_META.map((m) => {
          const mini =
            m.key === 'balance' && homeBalance.data && homeBalance.data.total > 0
              ? homeBalance.data
              : null
          return (
            <button
              key={m.key}
              onClick={() => {
                if (!m.v3) setView(m.key)
              }}
              disabled={m.v3}
              className={
                m.v3
                  ? 'block w-full rounded-2xl border-2 border-primary bg-surface p-4 text-left opacity-70'
                  : 'block w-full rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-primary'
              }
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <LensIcon name={m.key} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base font-bold text-primary">
                    {LENS_LABEL[m.key]}
                  </span>
                  <span className="block text-xs text-muted">{m.desc}</span>
                </span>
                {m.v3 ? (
                  <span className="rounded-md bg-primary-soft px-2 py-0.5 font-display text-[10px] font-bold text-primary">
                    v3
                  </span>
                ) : (
                  <span className="text-xs text-faint">
                    {countOf(m.key) > 0 ? `${countOf(m.key)}개` : ''}
                  </span>
                )}
              </span>
              {mini && (
                <span className="mt-3 block">
                  <BalanceBar data={mini} height={6} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Raw 도메인 접이식 */}
      <RawSection onOpen={(d) => setView(d)} countOf={countOf} />
    </div>
  )
}

function RawSection({
  onOpen,
  countOf,
}: {
  onOpen: (d: InsightDomain) => void
  countOf: (d: InsightDomain) => number
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-line bg-surface">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-xs text-muted"
      >
        <span>Raw domain analysis</span>
        <span className="text-faint">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
          {RAW_DOMAINS_UI.map((d) => (
            <button
              key={d}
              onClick={() => onOpen(d)}
              className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:border-primary"
            >
              {DOMAIN_LABEL[d]}
              {countOf(d) > 0 ? ` (${countOf(d)})` : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LensDetail({
  domain,
  rows,
  hasApiKey,
  onBack,
  onAdd,
  onPatch,
  onRemove,
}: {
  domain: InsightDomain
  rows: InsightRow[]
  hasApiKey: boolean
  onBack: () => void
  onAdd: (added: InsightRow[]) => void
  onPatch: (id: string, patch: Partial<InsightRow>) => void
  onRemove: (id: string) => void
}) {
  const [days, setDays] = useState<number>(30)
  const [busy, setBusy] = useState<'' | 'auto'>('')
  const [err, setErr] = useState<string>('')

  const isBalance = domain === 'balance'
  const balance = useBalance(days, isBalance)
  const title = isLens(domain) ? LENS_LABEL[domain] : DOMAIN_LABEL[domain]

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
      onAdd([json.insight as InsightRow])
    } catch {
      setErr('네트워크 오류가 발생했습니다.')
    } finally {
      setBusy('')
    }
  }

  async function setRating(id: string, rating: number) {
    onPatch(id, { rating })
    await fetch(`/api/insights/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rating }),
    }).catch(() => {})
  }

  async function saveNote(id: string, note: string) {
    onPatch(id, { feedback_note: note })
    await fetch(`/api/insights/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ feedback_note: note }),
    }).catch(() => {})
  }

  async function remove(id: string) {
    const res = await fetch(`/api/insights/${id}`, { method: 'DELETE' })
    if (res.ok) onRemove(id)
  }

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          aria-label="뒤로"
          className="rounded-xl border border-line p-2 text-muted transition hover:border-primary"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        {isLens(domain) && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <LensIcon name={domain} size={18} />
          </span>
        )}
        <h2 className="font-display text-lg font-bold text-primary">{title}</h2>
      </div>

      {/* 기간 칩 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-faint">기간</span>
        <PeriodChips days={days} onChange={setDays} />
      </div>

      {/* Balance: 분류 비중 막대(무료 집계) */}
      {isBalance && <BalanceSection loading={balance.loading} data={balance.data} />}

      {/* 액션 패널 */}
      <div className="space-y-3 rounded-2xl border border-line bg-surface p-5">
        <ImportPanel
          title="수동 (Max 구독 · 무료)"
          desc="데이터를 내려받아 Claude 에서 분석한 뒤, 양식 결과를 가져오면 렌즈별로 저장됩니다."
          exportHref={`/api/insights/export?domain=${domain}&days=${days}`}
          fallbackDomain={domain}
          days={days}
          onAdd={onAdd}
        />

        {/* 자동(종량제) — Letter(v3) 제외 */}
        {domain !== 'letter' && (
          <div className="rounded-xl bg-surface-subtle p-4">
            <div className="text-xs font-semibold text-ink">자동 (API · 종량제)</div>
            <p className="mt-1 text-[11px] leading-snug text-faint">
              {hasApiKey
                ? '앱이 직접 분석합니다. 호출당 소액이 과금됩니다.'
                : 'API 키가 준비되면 활성화됩니다. 현재는 수동(가져오기)을 사용하세요.'}
            </p>
            <button
              onClick={genAuto}
              disabled={!hasApiKey || busy !== ''}
              className="mt-3 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {busy === 'auto' ? '생성 중…' : 'AI로 생성'}
            </button>
          </div>
        )}

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
              showLetter={domain === 'prayer' || domain === 'fruit'}
              onRate={(r) => setRating(row.id, r)}
              onNote={(n) => saveNote(row.id, n)}
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
  showLetter,
  onRate,
  onNote,
  onDelete,
}: {
  row: InsightRow
  showLetter: boolean
  onRate: (rating: number) => void
  onNote: (note: string) => void
  onDelete: () => void
}) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState(row.feedback_note ?? '')
  const [inLetter, setInLetter] = useState(false)
  const created = row.created_at?.slice(0, 10) ?? ''
  const isManual = row.model === 'manual'

  return (
    <article className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-faint">
          {row.period_start} ~ {row.period_end}
        </div>
        <div className="text-[11px] text-faint">
          {created} · {isManual ? '수동' : 'AI'}
        </div>
      </div>

      <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">{row.content}</div>

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
        <button onClick={() => setNoteOpen((v) => !v)} className="ml-3 text-xs text-muted underline">
          {noteOpen ? '메모 닫기' : '메모'}
        </button>
        {showLetter && (
          <button
            onClick={() => setInLetter((v) => !v)}
            className={inLetter ? 'ml-2 text-xs text-primary underline' : 'ml-2 text-xs text-muted underline'}
          >
            {inLetter ? '편지에 담김' : '편지에 담기'}
          </button>
        )}
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
