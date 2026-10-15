'use client'
// MFH-MERCHANT-RULES-BUTTON-V1
// 상점 사전 모달 — 승인할 때 학습된 상점(merchant_rules) 목록 · 상점별 "자동 승인" 토글(patch110).
// 자동 켬 상점은 수집기(scripts/ficohsa-collect.ts)가 조건(항목 보임·계좌·HNL/USD·금액 ≤ 평균×3) 통과 시 바로 장부에 저장.
// 승인 5회 이상인데 꺼진 상점에 "추천" 표시.
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AcctOptions, MerchantRuleRow } from '@/lib/accounting-types'
import { toggleMerchantAuto } from './actions'

const RECOMMEND_HITS = 5
type Filter = 'all' | 'on' | 'rec'

export default function MerchantRulesButton({
  rules,
  options,
}: {
  rules: MerchantRuleRow[]
  options: AcctOptions
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [list, setList] = useState(rules)
  useEffect(() => setList(rules), [rules])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const itemName = useMemo(() => new Map(options.items['지출'].map((i) => [i.id, i])), [options])
  const isRec = (r: MerchantRuleRow) => !r.autoApprove && r.hitCount >= RECOMMEND_HITS
  const onCount = list.filter((r) => r.autoApprove).length
  const recCount = list.filter(isRec).length

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase()
    return list.filter(
      (r) =>
        (filter === 'all' || (filter === 'on' ? r.autoApprove : isRec(r))) &&
        (!k || r.merchant.toLowerCase().includes(k) || (r.vendor ?? '').toLowerCase().includes(k)),
    )
  }, [list, q, filter])

  async function onToggle(r: MerchantRuleRow) {
    const on = !r.autoApprove
    setErr('')
    setBusy(r.id)
    setList((l) => l.map((x) => (x.id === r.id ? { ...x, autoApprove: on } : x)))
    const res = await toggleMerchantAuto(r.id, on)
    setBusy(null)
    if (!res.ok) {
      setErr(res.error ?? '변경 실패')
      setList((l) => l.map((x) => (x.id === r.id ? { ...x, autoApprove: !on } : x)))
      return
    }
    router.refresh()
  }

  const chip = (f: Filter, label: string) => (
    <button
      type="button"
      onClick={() => setFilter(f)}
      className={`h-7 rounded-full border px-2.5 text-[11px] font-medium transition ${
        filter === f ? 'border-primary bg-primary text-white' : 'border-line text-muted hover:border-primary hover:text-primary'
      }`}
    >
      {label}
    </button>
  )

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          setErr('')
          setFilter(recCount > 0 && onCount === 0 ? 'rec' : 'all')
        }}
        className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-medium text-muted transition hover:border-primary hover:text-primary"
      >
        상점 사전 · 자동 {onCount}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 @md:items-center" onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-2xl bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="상점 사전"
          >
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-ink">상점 사전</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:text-primary">
                닫기
              </button>
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-faint">
              자동 승인을 켠 상점은 매일 수집 때 바로 장부에 저장됩니다(렘피라·달러 결제, 금액이 그 상점 최근 평균의 3배 이하일 때). 승인대기의 &ldquo;자동 승인&rdquo; 목록에서 되돌릴 수 있습니다.
            </p>
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {chip('all', `전체 ${list.length}`)}
              {chip('on', `자동 켬 ${onCount}`)}
              {chip('rec', `추천 ${recCount}`)}
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="상점 검색"
                className="h-7 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-[12px] text-ink outline-none focus:border-primary"
              />
            </div>
            {err && <p className="mb-2 text-xs font-medium text-accent">{err}</p>}

            <ul className="-mx-1 flex-1 divide-y divide-line overflow-y-auto px-1">
              {shown.length === 0 && <li className="py-6 text-center text-xs text-faint">해당하는 상점이 없습니다.</li>}
              {shown.map((r) => {
                const it = itemName.get(r.itemId)
                return (
                  <li key={r.id} className="flex items-center gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-ink">
                        {r.vendor || r.merchant}
                        {isRec(r) && (
                          <span className="ml-1.5 rounded bg-primary-soft px-1.5 py-px text-[10px] font-semibold text-primary">추천</span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-faint">
                        {r.vendor && <span>{r.merchant} · </span>}
                        {it ? `${it.category ?? ''} ${it.name}`.trim() : '항목 없음'}
                        {it?.active === false && <span className="text-accent"> (숨김)</span>} · {r.hitCount}회
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={r.autoApprove}
                      aria-label={`${r.vendor || r.merchant} 자동 승인`}
                      onClick={() => onToggle(r)}
                      disabled={busy === r.id}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
                        r.autoApprove ? 'bg-primary' : 'bg-line'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          r.autoApprove ? 'left-[22px]' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
