'use client'
// MFH-AUTO-APPROVED-SECTION-V1
// 승인대기 화면 "카드 자동 승인" — 최근 7일 자동 승인분(접힘) + 되돌리기(장부 삭제 + 대기 복귀, 선택: 그 상점 자동 끄기)
// + 우측 '상점 사전' 버튼(자동 승인 토글 모달). patch110 미적용이면 페이지가 렌더하지 않는다.
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AcctOptions, AutoApprovedRow, MerchantRuleRow } from '@/lib/accounting-types'
import { revertAuto } from './actions'
import MerchantRulesButton from './MerchantRulesButton'

const SYM: Record<string, string> = { KRW: '₩', USD: '$', HNL: 'L' }
const fmtLocal = (cur: string, n: number) => `${SYM[cur] ?? ''}${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const fmtUsd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'America/Tegucigalpa', month: 'numeric', day: 'numeric' })

export default function AutoApprovedSection({
  rows,
  rules,
  options,
  days = 7,
}: {
  rows: AutoApprovedRow[]
  rules: MerchantRuleRow[]
  options: AcctOptions
  days?: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [asking, setAsking] = useState<string | null>(null) // 되돌리기 확인 중인 행
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const itemName = useMemo(() => new Map(options.items['지출'].map((i) => [i.id, i.name])), [options])
  const totalUsd = rows.reduce((s, r) => s + (r.amountUsd ?? 0), 0)

  async function onRevert(id: string, disableRule: boolean) {
    setErr('')
    setBusy(id)
    const res = await revertAuto(id, disableRule)
    setBusy(null)
    setAsking(null)
    if (!res.ok) return setErr(res.error ?? '되돌리기 실패')
    router.refresh()
  }

  return (
    <section className="mb-4 rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={rows.length === 0}
          className="text-left text-[13px] font-bold text-muted disabled:cursor-default"
        >
          {rows.length > 0 && <span className="mr-1 text-faint">{open ? '▾' : '▸'}</span>}
          카드 자동 승인 <span className="font-display text-primary">{rows.length}</span>건
          <span className="ml-1.5 text-[11px] font-normal text-faint">
            · 최근 {days}일{rows.length > 0 && ` · ${fmtUsd(totalUsd)}`}
          </span>
        </button>
        <MerchantRulesButton rules={rules} options={options} />
      </div>
      {err && <p className="mt-2 text-xs font-medium text-accent">{err}</p>}

      {open && rows.length > 0 && (
        <ul className="mt-2 divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="py-2">
              <div className="flex items-center gap-2">
                <span className="w-11 shrink-0 font-display text-[11px] text-faint">{fmtDay(r.smsAt)}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-ink">{r.vendor || r.merchant}</div>
                  <div className="truncate text-[11px] text-faint">{(r.itemId && itemName.get(r.itemId)) || '항목 없음'}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-[13px] text-ink">{fmtLocal(r.currency, r.principal)}</div>
                  {r.currency !== 'USD' && r.amountUsd != null && (
                    <div className="font-display text-[10px] text-faint">{fmtUsd(r.amountUsd)}</div>
                  )}
                </div>
                {asking !== r.id && (
                  <button
                    type="button"
                    onClick={() => setAsking(r.id)}
                    disabled={!!busy}
                    className="h-8 shrink-0 rounded-md border border-line px-2 text-[11px] text-muted transition hover:border-accent hover:text-accent disabled:opacity-30"
                  >
                    되돌리기
                  </button>
                )}
              </div>
              {asking === r.id && (
                <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5 rounded-lg bg-primary-soft/40 p-2">
                  <span className="mr-auto text-[11px] text-muted">장부에서 지우고 승인대기로 돌립니다.</span>
                  <button
                    type="button"
                    onClick={() => onRevert(r.id, false)}
                    disabled={busy === r.id}
                    className="h-8 rounded-md border border-line bg-surface px-2.5 text-[11px] font-medium text-ink disabled:opacity-40"
                  >
                    되돌리기만
                  </button>
                  <button
                    type="button"
                    onClick={() => onRevert(r.id, true)}
                    disabled={busy === r.id}
                    className="h-8 rounded-md bg-accent px-2.5 text-[11px] font-bold text-white disabled:opacity-40"
                  >
                    {busy === r.id ? '…' : '되돌리고 자동 끄기'}
                  </button>
                  <button type="button" onClick={() => setAsking(null)} className="h-8 px-1.5 text-[11px] text-faint hover:text-primary">
                    취소
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
