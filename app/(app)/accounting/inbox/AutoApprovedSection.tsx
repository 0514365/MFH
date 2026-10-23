'use client'
// MFH-AUTO-APPROVED-SECTION-V3 — 2027(회계 잔여 b): 섹션 테두리·그림자 제거 · 머리 = 타이틀 알약(▸ + 건수 회색) · 되돌리기 확인 = 연한 빨강
// MFH-AUTO-APPROVED-SECTION-V2 — 되돌리기 후 앱 아이콘 뱃지 갱신
// MFH-AUTO-APPROVED-SECTION-V1
// 승인대기 화면 "카드 자동 승인" — 최근 7일 자동 승인분(접힘) + 되돌리기(장부 삭제 + 대기 복귀, 선택: 그 상점 자동 끄기)
// + 우측 '상점 사전' 버튼(자동 승인 토글 모달). patch110 미적용이면 페이지가 렌더하지 않는다.
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { requestBadgeRefresh } from '@/lib/badge'
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
    requestBadgeRefresh()
  }

  return (
    <section className="mb-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={rows.length === 0}
          className="inline-flex items-center gap-1 rounded-full bg-b27-card px-3 py-1 text-left text-[13px] font-medium text-b27-ink disabled:cursor-default"
        >
          {rows.length > 0 && <span className="mr-1 text-b27-muted">{open ? '▾' : '▸'}</span>}
          카드 자동 승인 <span className="font-num text-[12px] font-normal text-b27-muted">{rows.length}</span>
          <span className="ml-1.5 text-[11px] font-normal text-b27-muted">
            · 최근 {days}일{rows.length > 0 && ` · ${fmtUsd(totalUsd)}`}
          </span>
        </button>
        <MerchantRulesButton rules={rules} options={options} />
      </div>
      {err && <p className="mt-2 text-xs font-medium text-b27-expense">{err}</p>}

      {open && rows.length > 0 && (
        <ul className="mt-2 divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="py-2">
              <div className="flex items-center gap-2">
                <span className="w-11 shrink-0 font-num text-[11px] text-b27-muted">{fmtDay(r.smsAt)}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-b27-ink">{r.vendor || r.merchant}</div>
                  <div className="truncate text-[11px] text-b27-muted">{(r.itemId && itemName.get(r.itemId)) || '항목 없음'}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-num text-[13px] text-b27-ink">{fmtLocal(r.currency, r.principal)}</div>
                  {r.currency !== 'USD' && r.amountUsd != null && (
                    <div className="font-num text-[10px] text-b27-muted">{fmtUsd(r.amountUsd)}</div>
                  )}
                </div>
                {asking !== r.id && (
                  <button
                    type="button"
                    onClick={() => setAsking(r.id)}
                    disabled={!!busy}
                    className="h-8 shrink-0 rounded-full bg-b27-card px-2 text-[11px] text-b27-muted transition disabled:opacity-30"
                  >
                    되돌리기
                  </button>
                )}
              </div>
              {asking === r.id && (
                <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5 rounded-xl bg-b27-card p-2">
                  <span className="mr-auto text-[11px] text-b27-muted">장부에서 지우고 승인대기로 돌립니다.</span>
                  <button
                    type="button"
                    onClick={() => onRevert(r.id, false)}
                    disabled={busy === r.id}
                    className="h-8 rounded-full bg-b27-paper px-2.5 text-[11px] font-medium text-b27-ink disabled:opacity-40"
                  >
                    되돌리기만
                  </button>
                  <button
                    type="button"
                    onClick={() => onRevert(r.id, true)}
                    disabled={busy === r.id}
                    className="h-8 rounded-full bg-b27-expense-soft px-2.5 text-[11px] font-medium text-b27-expense disabled:opacity-40"
                  >
                    {busy === r.id ? '…' : '되돌리고 자동 끄기'}
                  </button>
                  <button type="button" onClick={() => setAsking(null)} className="h-8 px-1.5 text-[11px] text-b27-muted">
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
