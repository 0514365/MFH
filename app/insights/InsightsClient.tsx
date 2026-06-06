'use client'

// MFH-INSIGHTS-CLIENT-V3
// 목적 렌즈 구조(읽기 전용) — 연주제 strip + 렌즈 카드(Prayer/Balance/Fruit/Letter) + 분야별(Raw) 카드.
//  · 인사이트 생성은 Claude Code Local 루틴(데스크톱·외부)에서 수행 → 앱은 결과 표시·별점·메모·삭제만.
//  · Balance/Fruit 는 클라에서 직접 집계(무료, Anthropic 미사용).
//  · 색: palette var 매핑 → 색-슬래시 opacity 금지(요소 opacity-* 만). 동적 클래스 금지(정적 분기).

import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import {
  INSIGHT_PERIODS,
  DOMAIN_LABEL,
  LENS_LABEL,
  isLens,
  buildCategoryBreakdown,
  buildFruitTimeline,
  categoryColor,
  periodStart,
  todayStr,
  UNCATEGORIZED,
  type InsightDomain,
  type LensKey,
  type CategoryBreakdown,
  type FruitItem,
} from '@/lib/insightExport'
import { createClient } from '@/lib/supabase-browser'
import { getMembersMap, PORTFOLIO_OWNER_ID } from '@/lib/members'

export type InsightRow = {
  id: string
  domain: InsightDomain
  period_start: string | null
  period_end: string | null
  content: string | null
  model: string | null
  rating: number | null
  feedback_note: string | null
  in_letter: boolean
  created_at: string
}

type LensMeta = { key: LensKey; desc: string }
const LENS_META: LensMeta[] = [
  { key: 'prayer', desc: '기도제목 모으기 (3원칙)' },
  { key: 'balance', desc: '사역·가정 리듬' },
  { key: 'fruit', desc: '간증·응답된 기도' },
  { key: 'letter', desc: '월간 기도편지 초안' },
]


// 렌즈 아이콘(인라인 SVG, 24x24, currentColor 상속 — ModuleIcon 스타일).
// 홈 렌즈 카드(LENS_META)인 prayer/balance/fruit/letter 만 아이콘이 있다.
// 비서(project_assist·task_assist)는 홈에 노출되지 않으므로 아이콘 없음 → Partial.
function LensIcon({ name, size = 20 }: { name: LensKey; size?: number }) {
  const paths: Partial<Record<LensKey, ReactElement>> = {
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
      {paths[name] ?? null}
    </svg>
  )
}

// 작성자별 분류 비중(우진/서진아) + 전체 합산.
type MemberBalance = { userId: string; name: string; data: CategoryBreakdown }
type BalanceResult = { all: CategoryBreakdown; byMember: MemberBalance[] }

// Balance 렌즈: 기간 내 활동(일지 + 완료 할일 + 착수 프로젝트) 분류를 클라에서 직접 집계.
// API 호출 없음 = 무료. 세 소스 모두 RLS 멤버 공유 → 부부(우진+서진아) 합산 + 작성자별 분해.
// 날짜 기준: 일지 entry_date / 할일 completed_at(완료분만) / 프로젝트 created_at(착수).
//   타임스탬프 소스는 미래 데이터가 없어 상한 없이 gte(start)만으로 "최근 N일"을 만족.
function useBalance(days: number, enabled: boolean) {
  const [data, setData] = useState<BalanceResult | null>(null)
  const [loading, setLoading] = useState(enabled)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    setLoading(true)
    const supabase = createClient()
    void (async () => {
      const start = periodStart(days)
      const end = todayStr()
      type CatRow = { category: string | null; user_id: string }
      const [jRes, tRes, pRes, membersMap] = await Promise.all([
        supabase
          .from('journal_entries')
          .select('category, user_id')
          .gte('entry_date', start)
          .lte('entry_date', end),
        supabase
          .from('tasks')
          .select('category, user_id')
          .not('completed_at', 'is', null)
          .gte('completed_at', start),
        supabase.from('projects').select('category, user_id').gte('created_at', start),
        getMembersMap(supabase),
      ])
      if (!alive) return
      const rows: CatRow[] = [
        ...((jRes.data ?? []) as CatRow[]),
        ...((tRes.data ?? []) as CatRow[]),
        ...((pRes.data ?? []) as CatRow[]),
      ]
      const all = buildCategoryBreakdown(rows.map((r) => r.category))
      const groups = new Map<string, (string | null)[]>()
      for (const r of rows) {
        const arr = groups.get(r.user_id) ?? []
        arr.push(r.category)
        groups.set(r.user_id, arr)
      }
      const byMember: MemberBalance[] = Array.from(groups.entries())
        .map(([userId, cats]) => ({
          userId,
          name: membersMap[userId] ?? '알 수 없음',
          data: buildCategoryBreakdown(cats),
        }))
        .sort((a, b) => {
          // 소유자(우진) 먼저, 그다음 건수 많은 순.
          if (a.userId === PORTFOLIO_OWNER_ID) return -1
          if (b.userId === PORTFOLIO_OWNER_ID) return 1
          return b.data.total - a.data.total
        })
      setData({ all, byMember })
      setLoading(false)
    })()
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

// 렌즈 상세 상단 비중 섹션(합산 막대 + 범례 + 작성자별). 죄책감 아닌 균형 관찰용.
function BalanceSection({ loading, data }: { loading: boolean; data: BalanceResult | null }) {
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-primary">분류 비중</div>
        {data && data.all.total > 0 && (
          <div className="text-[11px] text-faint">활동 {data.all.total}건</div>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-faint">집계 중…</p>
      ) : !data || data.all.total === 0 ? (
        <p className="text-sm text-faint">기간 내 활동 기록이 없습니다.</p>
      ) : (
        <>
          <BalanceBar data={data.all} height={10} />
          <ul className="space-y-1.5">
            {data.all.items.map((it) => (
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

          {/* 작성자별(우진/서진아) — 2명 이상일 때만 */}
          {data.byMember.length > 1 && (
            <div className="space-y-2.5 border-t border-line pt-3">
              <div className="text-[11px] font-semibold text-muted">작성자별</div>
              {data.byMember.map((m) => (
                <div key={m.userId} className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-ink">{m.name}</span>
                    <span className="text-[11px] text-faint">{m.data.total}건</span>
                  </div>
                  <BalanceBar data={m.data} height={7} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Fruit 렌즈: 기간 내 thanks(감사·응답) 있는 일지를 클라에서 직접 조회(API 없음 = 무료).
// journal_entries RLS 가 멤버 공유라 부부(우진+서진아) 기록을 함께 모은다.
function useFruit(days: number, enabled: boolean) {
  const [items, setItems] = useState<FruitItem[] | null>(null)
  const [loading, setLoading] = useState(enabled)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    setLoading(true)
    const supabase = createClient()
    void supabase
      .from('journal_entries')
      .select('entry_date, headline, thanks, category')
      .gte('entry_date', periodStart(days))
      .lte('entry_date', todayStr())
      .not('thanks', 'is', null)
      .then(({ data: rows }) => {
        if (!alive) return
        setItems(buildFruitTimeline(rows ?? []))
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [days, enabled])
  return { items, loading }
}

// 감사·응답 세로 타임라인(점·연결선 + 날짜·제목·요약).
function FruitTimeline({ items }: { items: FruitItem[] }) {
  return (
    <ol className="space-y-0">
      {items.map((it, i) => (
        <li key={`${it.date}-${i}`} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: categoryColor(it.category || UNCATEGORIZED) }}
            />
            {i < items.length - 1 && <span className="w-px flex-1 bg-line" />}
          </div>
          <div className="min-w-0 flex-1 pb-4">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-xs text-faint">{it.date}</span>
              {it.category && <span className="text-[11px] text-muted">{it.category}</span>}
            </div>
            {it.headline && (
              <div className="mt-0.5 text-sm font-semibold text-ink">{it.headline}</div>
            )}
            <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-muted">
              {it.thanks}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

// 렌즈 상세 상단 타임라인 섹션(로딩·빈 처리 래퍼).
function FruitSection({ loading, items }: { loading: boolean; items: FruitItem[] | null }) {
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-primary">감사·응답 타임라인</div>
        {items && items.length > 0 && <div className="text-[11px] text-faint">{items.length}건</div>}
      </div>
      {loading ? (
        <p className="text-sm text-faint">불러오는 중…</p>
      ) : !items || items.length === 0 ? (
        <p className="text-sm text-faint">기간 내 감사·응답 기록이 없습니다.</p>
      ) : (
        <FruitTimeline items={items} />
      )}
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
  year,
  themeName,
  scrappedIds,
}: {
  initial: InsightRow[]
  year: number
  themeName: string | null
  scrappedIds: string[]
}) {
  const [rows, setRows] = useState<InsightRow[]>(initial)
  const [view, setView] = useState<'home' | InsightDomain>('home')
  const [scrapped, setScrapped] = useState<Set<string>>(new Set(scrappedIds))
  const homeBalance = useBalance(30, view === 'home')
  const homeFruit = useFruit(30, view === 'home')

  const patchRow = (id: string, patch: Partial<InsightRow>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const removeRow = (id: string) => setRows((r) => r.filter((x) => x.id !== id))
  const markScrapped = (id: string) => setScrapped((s) => new Set(s).add(id))
  const unmarkScrapped = (id: string) =>
    setScrapped((s) => {
      const n = new Set(s)
      n.delete(id)
      return n
    })
  const countOf = (d: InsightDomain) => rows.filter((r) => r.domain === d).length

  if (view !== 'home') {
    return (
      <LensDetail
        domain={view}
        rows={rows.filter((r) => r.domain === view)}
        scrapped={scrapped}
        onBack={() => setView('home')}
        onPatch={patchRow}
        onRemove={removeRow}
        onScrap={markScrapped}
        onUnscrap={unmarkScrapped}
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

      {/* 렌즈 카드 */}
      <div className="space-y-3">
        {LENS_META.map((m) => {
          const mini =
            m.key === 'balance' && homeBalance.data && homeBalance.data.all.total > 0
              ? homeBalance.data.all
              : null
          const fruitN = m.key === 'fruit' && homeFruit.items ? homeFruit.items.length : 0
          return (
            <button
              key={m.key}
              onClick={() => setView(m.key)}
              className="block w-full rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-primary"
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
                <span className="text-xs text-faint">
                  {countOf(m.key) > 0 ? `${countOf(m.key)}개` : ''}
                </span>
              </span>
              {mini && (
                <span className="mt-3 block">
                  <BalanceBar data={mini} height={6} />
                </span>
              )}
              {fruitN > 0 && (
                <span className="mt-2 block text-xs text-muted">최근 감사·응답 {fruitN}건</span>
              )}
            </button>
          )
        })}

        {/* 종합(overall) */}
        <button
          onClick={() => setView('overall')}
          className="block w-full rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-primary"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18" />
                <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-base font-bold text-primary">Overall</span>
              <span className="block text-xs text-muted">일지·프로젝트·할일 종합</span>
            </span>
            <span className="text-xs text-faint">
              {countOf('overall') > 0 ? `${countOf('overall')}개` : ''}
            </span>
          </span>
        </button>

        {/* 분야별 분석 (전체 히스토리) */}
        <div className="px-1 pt-2 text-xs font-semibold text-muted">분야별 분석</div>
        {(['journal', 'project', 'task'] as InsightDomain[]).map((d) => (
          <button
            key={d}
            onClick={() => setView(d)}
            className="block w-full rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-primary"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-subtle text-muted">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h10" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-base font-bold text-primary">
                  {DOMAIN_LABEL[d]}
                </span>
              </span>
              <span className="text-xs text-faint">
                {countOf(d) > 0 ? `${countOf(d)}개` : ''}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function LensDetail({
  domain,
  rows,
  scrapped,
  onBack,
  onPatch,
  onRemove,
  onScrap,
  onUnscrap,
}: {
  domain: InsightDomain
  rows: InsightRow[]
  scrapped: Set<string>
  onBack: () => void
  onPatch: (id: string, patch: Partial<InsightRow>) => void
  onRemove: (id: string) => void
  onScrap: (id: string) => void
  onUnscrap: (id: string) => void
}) {
  const title = isLens(domain) ? LENS_LABEL[domain] : DOMAIN_LABEL[domain]
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

      <DomainInsightBody
        domain={domain}
        rows={rows}
        scrapped={scrapped}
        onPatch={onPatch}
        onRemove={onRemove}
        onScrap={onScrap}
        onUnscrap={onUnscrap}
      />
    </div>
  )
}

// 한 도메인(렌즈/분야)의 인사이트 본문 — (Balance/Fruit 집계) + 결과 히스토리(읽기·별점·삭제).
// 생성은 Claude Code Local 루틴(외부)에서. 여기는 보기·별점·메모·삭제 전용.
export function DomainInsightBody({
  domain,
  rows,
  scrapped,
  onPatch,
  onRemove,
  onScrap,
  onUnscrap,
}: {
  domain: InsightDomain
  rows: InsightRow[]
  scrapped: Set<string>
  onPatch: (id: string, patch: Partial<InsightRow>) => void
  onRemove: (id: string) => void
  onScrap: (id: string) => void
  onUnscrap: (id: string) => void
}) {
  const [days, setDays] = useState<number>(30)

  const isBalance = domain === 'balance'
  const balance = useBalance(days, isBalance)
  const isFruit = domain === 'fruit'
  const fruit = useFruit(days, isFruit)

  async function setRating(id: string, rating: number | null) {
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

  async function toggleLetter(id: string, value: boolean) {
    onPatch(id, { in_letter: value })
    await fetch(`/api/insights/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ in_letter: value }),
    }).catch(() => {})
  }

  async function remove(id: string) {
    const res = await fetch(`/api/insights/${id}`, { method: 'DELETE' })
    if (res.ok) onRemove(id)
  }

  async function scrap(row: InsightRow) {
    const res = await fetch('/api/insights/scraps', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source_id: row.id,
        domain: row.domain,
        content: row.content,
        period_start: row.period_start,
        period_end: row.period_end,
        rating: row.rating,
        feedback_note: row.feedback_note,
      }),
    })
    if (res.ok) onScrap(row.id)
  }

  async function unscrap(id: string) {
    const res = await fetch(`/api/insights/scraps?source_id=${id}`, { method: 'DELETE' })
    if (res.ok) onUnscrap(id)
  }

  return (
    <div className="space-y-5">
      {(isBalance || isFruit) && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-faint">기간</span>
          <PeriodChips days={days} onChange={setDays} />
        </div>
      )}

      {/* Balance: 분류 비중 막대(무료 집계) */}
      {isBalance && <BalanceSection loading={balance.loading} data={balance.data} />}

      {/* Fruit: 감사·응답 타임라인(무료 집계) */}
      {isFruit && <FruitSection loading={fruit.loading} items={fruit.items} />}

      {/* 결과 목록(히스토리) */}
      <div className="space-y-4">
        <div className="text-sm font-semibold text-primary">저장된 인사이트</div>
        {rows.length === 0 ? (
          <p className="text-sm text-faint">아직 저장된 인사이트가 없습니다.</p>
        ) : (
          rows.map((row) => (
            <InsightCard
              key={row.id}
              row={row}
              showLetter={domain === 'prayer' || domain === 'fruit' || domain === 'overall'}
              isScrapped={scrapped.has(row.id)}
              onRate={(r) => setRating(row.id, r)}
              onNote={(n) => saveNote(row.id, n)}
              onToggleLetter={(v) => toggleLetter(row.id, v)}
              onScrap={() => scrap(row)}
              onUnscrap={() => unscrap(row.id)}
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
  isScrapped,
  onRate,
  onNote,
  onToggleLetter,
  onScrap,
  onUnscrap,
  onDelete,
}: {
  row: InsightRow
  showLetter: boolean
  isScrapped: boolean
  onRate: (rating: number | null) => void
  onNote: (note: string) => void
  onToggleLetter: (value: boolean) => void
  onScrap: () => void
  onUnscrap: () => void
  onDelete: () => void
}) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState(row.feedback_note ?? '')
  const inLetter = row.in_letter === true
  // 최종 업데이트 시각(날짜+시:분) — 보는 사람의 현재 위치(브라우저 로컬) 기준.
  // SSR 에선 날짜만(UTC 고정, 안정), 마운트 후 로컬 시:분까지 채움 → hydration mismatch 방지.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const cd = row.created_at ? new Date(row.created_at) : null
  const created =
    cd && !Number.isNaN(cd.getTime())
      ? mounted
        ? `${cd.toLocaleDateString('en-CA')} ${cd.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}`
        : cd.toISOString().slice(0, 10)
      : ''
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
              onClick={() => onRate((row.rating ?? 0) === n ? null : n)}
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
            onClick={() => onToggleLetter(!inLetter)}
            className={inLetter ? 'ml-2 text-xs text-primary underline' : 'ml-2 text-xs text-muted underline'}
          >
            {inLetter ? '편지에 담김' : '편지에 담기'}
          </button>
        )}
        <button
          onClick={isScrapped ? onUnscrap : onScrap}
          className={isScrapped ? 'ml-2 text-xs text-primary underline' : 'ml-2 text-xs text-muted underline'}
        >
          {isScrapped ? '보관됨' : '보관'}
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
