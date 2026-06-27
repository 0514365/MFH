'use client'
// MFH-ACCOUNTING-TODAY-LIST-V1
// 요약 하단 'Today' — 거래일이 오늘(브라우저 로컬)인 거래만. 입력 폼의 todayLocal 과 동일 기준이라 서버 UTC 어긋남 없음.
import Link from 'next/link'
import { useMemo } from 'react'
import type { AcctOptions, InoutRow } from '@/lib/notion'

function fmtUsd(n: number | null): string {
  if (n == null) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TodayList({
  recent,
  items,
}: {
  recent: InoutRow[]
  items: AcctOptions['items']
}) {
  const nameOf = useMemo(() => {
    const m = new Map<string, string>()
    for (const i of [...items['수입'], ...items['지출']]) m.set(i.id, i.name)
    return m
  }, [items])
  const today = todayLocal()
  const todayTx = recent.filter((r) => (r.date ?? '') === today)

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
          Today
        </span>
        <Link
          href="/accounting/ledger"
          className="text-[11px] font-medium text-muted hover:text-primary"
        >
          전체 내역 →
        </Link>
      </div>
      {todayTx.length === 0 ? (
        <p className="py-3 text-center text-xs text-faint">오늘 거래내역 없음</p>
      ) : (
        <ul className="divide-y divide-line">
          {todayTx.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    r.gubun === '수입'
                      ? 'bg-emerald-50 text-emerald-700'
                      : r.gubun === '지출'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-surface-subtle text-faint'
                  }`}
                >
                  {r.gubun ?? '—'}
                </span>
                <span className="truncate text-sm text-ink">
                  {r.itemId ? (nameOf.get(r.itemId) ?? '') : ''}
                  {r.name ? <span className="text-muted"> · {r.name}</span> : ''}
                </span>
              </div>
              <span
                className={`shrink-0 font-display text-sm font-bold ${
                  r.gubun === '지출' ? 'text-red-700' : 'text-ink'
                }`}
              >
                {fmtUsd(r.amountUsd)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
