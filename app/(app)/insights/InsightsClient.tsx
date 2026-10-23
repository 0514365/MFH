'use client'
// MFH-INSIGHTS-CLIENT-V5 — 2027(4-6): theme-2027 · 남색 글자 · 연회색/페리윙클 면 · 강조 = 진한 페리윙클 · 굵기 600 이하 · 영문 대문자 머리글 해제.

// MFH-INSIGHTS-CLIENT-V4
// 목적 렌즈 구조(읽기 전용) — 연주제 strip + 렌즈 카드(Prayer/Balance/Fruit/Letter) + 분야별(Raw) 카드.
//  · 인사이트 생성은 Claude Code Local 루틴(데스크톱·외부)에서 수행 → 앱은 결과 표시·별점·메모·삭제만.
//  · Balance/Fruit 는 클라에서 직접 집계(무료, Anthropic 미사용).
//  · 색: palette var 매핑 → 색-슬래시 opacity 금지(요소 opacity-* 만). 동적 클래스 금지(정적 분기).

import { blockColor, blockTint } from '@/lib/palette'
import Link from 'next/link'
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
  scrapKey,
  UNCATEGORIZED,
  type InsightDomain,
  type LensKey,
  type CategoryBreakdown,
  type FruitItem,
} from '@/lib/insightExport'
import { createClient } from '@/lib/supabase-browser'
import { getMembersMap, PORTFOLIO_OWNER_ID } from '@/lib/members'
import InsightContent from './InsightContent'

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
// 렌즈 · 분야 → 2027 블록 번호(틴트 면 · 진한 톤). 기도제목 블러시 · 리듬 민트 · 열매 살구 · 편지 살몬 / 일지 살몬 · 프로젝트 로즈 · 할 일 살구.
const LENS_BLOCK: Partial<Record<InsightDomain, number>> = { prayer: 7, balance: 4, fruit: 3, letter: 2 }
const DOMAIN_BLOCK: Partial<Record<InsightDomain, number>> = { journal: 2, project: 6, task: 3 }
const LENS_META: LensMeta[] = [
  { key: 'prayer', desc: '기도제목 모으기 (3원칙)' },
  { key: 'balance', desc: '사역·가정 리듬' },
  { key: 'fruit', desc: '간증·응답된 기도' },
  { key: 'letter', desc: '월간 기도편지 초안' },
]

// 렌즈/분야 색 베리에이션(아이콘 칩 + 라벨) — 정적 매핑(동적 클래스 금지). 홈 모듈 색과 연결.
const LENS_CHIP: Record<string, string> = {
  prayer: 'bg-rose-100 text-rose-700',
  balance: 'bg-sky-100 text-sky-700',
  fruit: 'bg-amber-100 text-amber-700',
  letter: 'bg-indigo-100 text-indigo-700',
  project_assist: 'bg-violet-100 text-violet-700',
  task_assist: 'bg-teal-100 text-teal-700',
}
const LENS_TEXT: Record<string, string> = {
  prayer: 'text-rose-700',
  balance: 'text-sky-700',
  fruit: 'text-amber-700',
  letter: 'text-indigo-700',
  project_assist: 'text-violet-700',
  task_assist: 'text-teal-700',
}
const DOMAIN_CHIP: Record<string, string> = {
  journal: 'bg-emerald-100 text-emerald-700',
  project: 'bg-violet-100 text-violet-700',
  task: 'bg-teal-100 text-teal-700',
}
// 분야 카드 표시용 영문 타이틀(홈 모듈과 통일). 전역 DOMAIN_LABEL(AI 프롬프트·타 페이지용)은 유지.
const DOMAIN_TITLE: Record<string, string> = {
  journal: 'Log',
  project: 'Project',
  task: 'To-Do',
}


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

// 분야별(일지/프로젝트/할일) 아이콘 — 홈 '분야별 분석' 카드용.
function DomainIcon({ domain }: { domain: InsightDomain }) {
  if (domain === 'journal')
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    )
  if (domain === 'project')
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      </svg>
    )
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
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
      className="flex w-full overflow-hidden rounded-full bg-b27-card"
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
    <div className="space-y-3 rounded-2xl border border-b27-line bg-b27-paper p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-[#303C8D]">분류 비중</div>
        {data && data.all.total > 0 && (
          <div className="text-[11px] text-b27-muted">활동 {data.all.total}건</div>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-b27-muted">집계 중…</p>
      ) : !data || data.all.total === 0 ? (
        <p className="text-sm text-b27-muted">기간 내 활동 기록이 없습니다.</p>
      ) : (
        <>
          <BalanceBar data={data.all} height={10} />
          <ul className="space-y-1.5">
            {data.all.items.map((it) => (
              <li key={it.category} className="flex items-center gap-2 text-xs text-b27-ink">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ background: categoryColor(it.category) }}
                />
                <span className="flex-1 truncate">{it.category}</span>
                <span className="text-b27-muted">{it.count}건</span>
                <span className="w-9 text-right font-num text-b27-muted">
                  {Math.round(it.ratio * 100)}%
                </span>
              </li>
            ))}
          </ul>

          {/* 작성자별(우진/서진아) — 2명 이상일 때만 */}
          {data.byMember.length > 1 && (
            <div className="space-y-2.5 border-t border-b27-line pt-3">
              <div className="text-[11px] font-semibold text-b27-muted">작성자별</div>
              {data.byMember.map((m) => (
                <div key={m.userId} className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-b27-ink">{m.name}</span>
                    <span className="text-[11px] text-b27-muted">{m.data.total}건</span>
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
            {i < items.length - 1 && <span className="w-px flex-1 bg-b27-line" />}
          </div>
          <div className="min-w-0 flex-1 pb-4">
            <div className="flex items-baseline gap-2">
              <span className="font-num text-xs text-b27-muted">{it.date}</span>
              {it.category && <span className="text-[11px] text-b27-muted">{it.category}</span>}
            </div>
            {it.headline && (
              <div className="mt-0.5 text-sm font-semibold text-b27-ink">{it.headline}</div>
            )}
            <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-b27-muted">
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
    <div className="space-y-3 rounded-2xl border border-b27-line bg-b27-paper p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-[#303C8D]">감사·응답 타임라인</div>
        {items && items.length > 0 && <div className="text-[11px] text-b27-muted">{items.length}건</div>}
      </div>
      {loading ? (
        <p className="text-sm text-b27-muted">불러오는 중…</p>
      ) : !items || items.length === 0 ? (
        <p className="text-sm text-b27-muted">기간 내 감사·응답 기록이 없습니다.</p>
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
                ? `rounded-full border-2 border-b27-ink font-semibold text-[#303C8D] ${pad}`
                : `rounded-full border border-b27-line text-b27-muted transition hover:border-b27-muted ${pad}`
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
  scrappedKeys,
}: {
  initial: InsightRow[]
  scrappedKeys: string[]
}) {
  const [rows, setRows] = useState<InsightRow[]>(initial)
  const [view, setView] = useState<'home' | InsightDomain>('home')
  // 보관 일치 키(도메인+내용) 집합. id 가 아니라 내용 기준이라 재생성돼도 정확.
  const [scrapped, setScrapped] = useState<Set<string>>(new Set(scrappedKeys))
  const homeBalance = useBalance(30, view === 'home')

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
  // 도메인별 최종 업데이트 시각(인사이트 created_at) — 홈 카드 메타.
  //  · SSR=UTC MM-DD(결정적) → 마운트 후 로컬 MM-DD HH:mm (hydration 안전).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const fmtUpdated = (iso: string): string => {
    const dt = new Date(iso)
    if (Number.isNaN(dt.getTime())) return ''
    if (!mounted) return dt.toISOString().slice(5, 10)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${p(dt.getMonth() + 1)}-${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}`
  }
  const updatedOf = (d: InsightDomain): string => {
    const r = rows.find((x) => x.domain === d)
    return r?.created_at ? fmtUpdated(r.created_at) : ''
  }

  if (view !== 'home') {
    return (
      <div className="mx-auto max-w-3xl">
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
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 렌즈 4 — 2×2 틴트 블록(고르는 자리): 이름 · 설명 · (리듬 미니 막대) · 갱신 */}
      <div className="grid grid-cols-2 gap-[3px] overflow-hidden rounded-2xl bg-b27-paper">
        {LENS_META.map((m) => {
          const mini =
            m.key === 'balance' && homeBalance.data && homeBalance.data.all.total > 0
              ? homeBalance.data.all
              : null
          const n = LENS_BLOCK[m.key] ?? 8
          const { tint, deep } = blockTint(n)
          return (
            <button
              key={m.key}
              onClick={() => setView(m.key)}
              className="flex min-h-[112px] flex-col justify-between p-3.5 text-left transition active:opacity-80"
              style={{ background: tint, color: deep }}
            >
              <span>
                <span className="block text-[15px] font-semibold">{LENS_LABEL[m.key]}</span>
                <span className="mt-0.5 block text-[12px] leading-snug">{m.desc}</span>
              </span>
              {mini && (
                <span className="mt-2 block">
                  <BalanceBar data={mini} height={5} />
                </span>
              )}
              {updatedOf(m.key) && <span className="mt-2 block font-num text-[11px] opacity-80">{updatedOf(m.key)} 갱신</span>}
            </button>
          )
        })}
      </div>

      {/* 종합 — 페리윙클 요약 면 */}
      <button
        onClick={() => setView('overall')}
        className="flex w-full flex-col gap-1 rounded-2xl bg-b27-tint-8 px-4 py-3.5 text-left transition active:opacity-80"
      >
        <span className="flex items-center gap-1.5 font-num text-[12px] font-medium" style={{ color: 'var(--b27-deep-8)' }}>
          <span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-8" aria-hidden="true" />
          종합
        </span>
        <span className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-semibold text-b27-ink">일지·프로젝트·할 일 종합</span>
          <span className="shrink-0 font-num text-[12px] text-b27-muted">{updatedOf('overall') ? `${updatedOf('overall')} ›` : '›'}</span>
        </span>
      </button>

      {/* 분야별 분석 — 2줄 행(모듈 색 사각형 · 갱신) */}
      <section>
        <h3 className="mb-1 inline-flex items-center gap-2 rounded-full bg-b27-card px-3 py-1 text-[13px] font-semibold text-b27-ink">
          <span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-8" aria-hidden="true" />
          분야별 분석
        </h3>
        <ul>
          {(['journal', 'project', 'task'] as InsightDomain[]).map((d) => (
            <li key={d} className="border-b border-b27-line last:border-b-0">
              <button onClick={() => setView(d)} className="flex w-full items-center gap-3 px-1 py-3 text-left transition active:opacity-70">
                <span className="inline-block h-[9px] w-[9px] shrink-0 rounded-[3px]" style={{ background: blockColor(DOMAIN_BLOCK[d] ?? 8).bg }} aria-hidden="true" />
                <span className="flex-1 text-[15px] font-medium text-b27-ink">{DOMAIN_TITLE[d] ?? DOMAIN_LABEL[d]}</span>
                {updatedOf(d) && <span className="shrink-0 font-num text-[11.5px] text-b27-muted">{updatedOf(d)}</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* 보관함 */}
      <Link
        href="/insights/saved"
        className="flex items-center justify-center gap-2 rounded-2xl bg-b27-card px-4 py-3.5 text-[14px] font-medium text-b27-ink transition active:opacity-70"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="4" rx="1" />
          <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
          <path d="M10 12h4" />
        </svg>
        보관함
      </Link>
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
          className="rounded-xl border border-b27-line p-2 text-b27-muted transition hover:border-b27-muted"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        {isLens(domain) && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${LENS_CHIP[domain] ?? 'bg-b27-card text-b27-muted'}`}>
            <LensIcon name={domain} size={18} />
          </span>
        )}
        <h2 className="font-num text-lg font-semibold text-b27-ink">{title}</h2>
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
    if (res.ok) onScrap(scrapKey(row.domain, row.content))
  }

  async function unscrap(row: InsightRow) {
    const res = await fetch('/api/insights/scraps', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source_id: row.id, content: row.content }),
    })
    if (res.ok) onUnscrap(scrapKey(row.domain, row.content))
  }

  return (
    <div className="space-y-5">
      {(isBalance || isFruit) && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-b27-muted">기간</span>
          <PeriodChips days={days} onChange={setDays} />
        </div>
      )}

      {/* Balance: 분류 비중 막대(무료 집계) */}
      {isBalance && <BalanceSection loading={balance.loading} data={balance.data} />}

      {/* Fruit: 감사·응답 타임라인(무료 집계) */}
      {isFruit && <FruitSection loading={fruit.loading} items={fruit.items} />}

      {/* 결과 목록(히스토리) */}
      <div className="space-y-4">
        <div className="text-sm font-semibold text-[#303C8D]">저장된 인사이트</div>
        {rows.length === 0 ? (
          <p className="text-sm text-b27-muted">아직 저장된 인사이트가 없습니다.</p>
        ) : (
          rows.map((row) => (
            <InsightCard
              key={row.id}
              row={row}
              showLetter={domain === 'prayer' || domain === 'fruit' || domain === 'overall'}
              isScrapped={scrapped.has(scrapKey(row.domain, row.content))}
              onRate={(r) => setRating(row.id, r)}
              onNote={(n) => saveNote(row.id, n)}
              onToggleLetter={(v) => toggleLetter(row.id, v)}
              onScrap={() => scrap(row)}
              onUnscrap={() => unscrap(row)}
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
    <article className="rounded-2xl border border-b27-line bg-b27-paper p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-b27-muted">
          {row.period_start} ~ {row.period_end}
        </div>
        <div className="text-[11px] text-b27-muted">
          {created} · {isManual ? '수동' : 'AI'}
        </div>
      </div>

      <InsightContent
        domain={row.domain}
        content={row.content}
        className="mt-3 text-sm leading-relaxed text-b27-ink"
      />

      <div className="mt-4 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = (row.rating ?? 0) >= n
          return (
            <button
              key={n}
              aria-label={`${n}점`}
              onClick={() => onRate((row.rating ?? 0) === n ? null : n)}
              className={on ? 'text-lg text-[#303C8D]' : 'text-lg text-b27-muted'}
            >
              ★
            </button>
          )
        })}
        <button onClick={() => setNoteOpen((v) => !v)} className="ml-3 text-xs text-b27-muted underline">
          {noteOpen ? '메모 닫기' : '메모'}
        </button>
        {showLetter && (
          <button
            onClick={() => onToggleLetter(!inLetter)}
            className={inLetter ? 'ml-2 text-xs text-[#303C8D] underline' : 'ml-2 text-xs text-b27-muted underline'}
          >
            {inLetter ? '편지에 담김' : '편지에 담기'}
          </button>
        )}
        <button
          onClick={isScrapped ? onUnscrap : onScrap}
          className={isScrapped ? 'ml-2 text-xs text-[#303C8D] underline' : 'ml-2 text-xs text-b27-muted underline'}
        >
          {isScrapped ? '보관됨' : '보관'}
        </button>
        <button onClick={onDelete} className="ml-auto text-xs text-b27-muted underline">
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
            className="w-full rounded-xl border border-b27-line bg-b27-paper p-3 text-sm text-b27-ink outline-none focus:border-accent"
          />
          <button
            onClick={() => {
              onNote(note.trim())
              setNoteOpen(false)
            }}
            className="rounded-xl border border-b27-ink px-3 py-1.5 text-sm font-semibold text-[#303C8D] transition hover:bg-b27-expense-soft"
          >
            메모 저장
          </button>
        </div>
      )}
    </article>
  )
}
