'use client'
// MFH-CARD-INBOX-VIEW-V4 — 구매처 수정·학습 추천
// MFH-CARD-INBOX-VIEW-V3 — 구매처(상점) 표시 + 적요 학습 추천
// MFH-CARD-INBOX-VIEW-V2 — KRW 환율 · 항목 즉석 추가
// MFH-CARD-INBOX-VIEW-V1
// 승인대기 목록 — 행별 항목(추천 선채움)·적요·계좌 편집 + 승인/무시, 추천 채워진 행 일괄 승인.
// 환율은 상단 공통(HNL 기본 = 마지막 승인값 · KRW 행이 있으면 KRW 환율 입력 추가). USD 행은 환율 1. 날짜·금액·상점은 문자 원문 그대로.
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { AcctOption, AcctOptions, InboxRow } from '@/lib/accounting-types'
import { approveInbox, ignoreInbox } from './actions'
import ItemAddButton from '../ItemAddButton'

const CUR_SYMBOL: Record<string, string> = { KRW: '₩', USD: '$', HNL: 'L' }
const CAT_ORDER = ['사역', '차량', '생활', '운영/행정']
const ctl =
  'h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink outline-none transition focus:border-primary'

function groupByCategory(items: AcctOption[]): [string, AcctOption[]][] {
  const map = new Map<string, AcctOption[]>()
  for (const it of items) {
    const c = it.category || '기타'
    if (!map.has(c)) map.set(c, [])
    map.get(c)!.push(it)
  }
  return [...map.entries()].sort(
    (a, b) => (CAT_ORDER.indexOf(a[0]) + 1 || 99) - (CAT_ORDER.indexOf(b[0]) + 1 || 99),
  )
}
function fmtAmt(cur: string, n: number): string {
  return `${CUR_SYMBOL[cur] ?? ''}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
// 문자 수신 시각 → 온두라스 기준 'M/D HH:mm'.
function fmtWhen(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-US', { timeZone: 'America/Tegucigalpa', month: 'numeric', day: 'numeric' })
  const time = d.toLocaleTimeString('en-GB', { timeZone: 'America/Tegucigalpa', hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

type Draft = { itemId: string; name: string; vendor: string; accountId: string }

export default function InboxView({
  rows,
  options,
  defaultRate,
}: {
  rows: InboxRow[]
  options: AcctOptions
  defaultRate: number
}) {
  const router = useRouter()
  const items = options.items['지출']
  const groups = useMemo(() => groupByCategory(items), [items])
  const accountByCurrency = (cur: string) => options.accounts.find((a) => a.currency === cur)?.id ?? ''

  // 행별 편집 상태 — 추천값(없으면 상점명·통화 기본계좌)으로 초기화.
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const d: Record<string, Draft> = {}
    for (const r of rows)
      d[r.id] = {
        itemId: r.suggestedItemId ?? '',
        name: r.suggestedName ?? '', // 적요 추천(그 상점에서 통상 사는 것) — 없으면 빈칸
        vendor: r.suggestedVendor ?? r.merchant, // 구매처 표시명(학습) — 없으면 문자 상점명
        accountId: r.suggestedAccountId ?? accountByCurrency(r.currency),
      }
    return d
  })
  const [rate, setRate] = useState(String(defaultRate))
  const [rateKrw, setRateKrw] = useState('1400')
  const hasKrw = rows.some((r) => r.currency === 'KRW')
  const [busy, setBusy] = useState<string | 'bulk' | null>(null)
  const [msg, setMsg] = useState('')

  const rateNum = Number(rate)
  const rateKrwNum = Number(rateKrw)
  const rateOf = (r: InboxRow) => (r.currency === 'USD' ? 1 : r.currency === 'KRW' ? rateKrwNum : rateNum)
  const usdOf = (r: InboxRow) => {
    const rt = rateOf(r)
    return rt > 0 ? Math.round((r.principal / rt) * 100) / 100 : 0
  }
  const readyIds = rows.filter((r) => !!drafts[r.id]?.itemId).map((r) => r.id)
  const totalUsd = rows.reduce((s, r) => s + usdOf(r), 0)

  function setDraft(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  async function approve(ids: string[]) {
    if (!ids.length) return
    if (rows.some((r) => ids.includes(r.id) && !(rateOf(r) > 0))) {
      setMsg('환율을 입력하세요')
      return
    }
    setBusy(ids.length === 1 ? ids[0] : 'bulk')
    setMsg('')
    const res = await approveInbox(
      ids.map((id) => {
        const d = drafts[id]
        const row = rows.find((r) => r.id === id)!
        return { id, itemId: d.itemId, name: d.name, vendor: d.vendor, accountId: d.accountId || null, rate: rateOf(row) }
      }),
    )
    setBusy(null)
    setMsg(
      res.ok
        ? `${res.done}건 승인 — 장부에 저장했습니다`
        : `${res.done}건 승인${res.error ? ` · 실패: ${res.error}` : ''}`,
    )
    router.refresh()
  }

  async function ignore(id: string) {
    if (!window.confirm('이 거래를 장부에 넣지 않고 무시할까요?')) return
    setBusy(id)
    const res = await ignoreInbox([id])
    setBusy(null)
    if (!res.ok) setMsg(`실패: ${res.error ?? ''}`)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {/* 상단 — 건수·환율·일괄 승인 */}
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
              Card SMS Inbox
            </div>
            <div className="mt-1 text-sm text-ink">
              대기 <b className="font-display">{rows.length}</b>건
              {rows.length > 0 && <span className="text-muted"> · 합계 {fmtUsd(totalUsd)}</span>}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <label>
              <span className="mb-1 block text-[11px] font-medium text-faint">환율 (L / $1)</span>
              <input
                value={rate}
                onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))}
                inputMode="decimal"
                className={`${ctl} w-24 text-right font-display`}
              />
            </label>
            {hasKrw && (
              <label>
                <span className="mb-1 block text-[11px] font-medium text-faint">환율 (₩ / $1)</span>
                <input
                  value={rateKrw}
                  onChange={(e) => setRateKrw(e.target.value.replace(/[^\d.]/g, ''))}
                  inputMode="decimal"
                  className={`${ctl} w-24 text-right font-display`}
                />
              </label>
            )}
          </div>
        </div>
        {rows.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy !== null || readyIds.length === 0}
              onClick={() => approve(readyIds)}
              className="h-10 rounded-xl bg-accent px-4 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-40"
            >
              {busy === 'bulk' ? '승인 중…' : `항목 지정된 ${readyIds.length}건 일괄 승인`}
            </button>
            <ItemAddButton
              gubun="지출"
              categories={groups.map(([c]) => c).filter((c) => c !== '기타')}
              label="+ 항목 추가"
            />
            <span className="text-[11px] text-faint">항목이 비어 있는 행은 지정 후 개별 승인</span>
          </div>
        )}
        {msg && <p className="mt-2 text-xs text-primary">{msg}</p>}
      </section>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-faint">
          승인대기 거래가 없습니다. 매일 22:00 에 새 카드 문자가 수집됩니다.
          <br />
          <Link href="/accounting/ledger" className="mt-2 inline-block text-primary">
            거래내역 보기 →
          </Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const d = drafts[r.id]
            const rowBusy = busy === r.id || busy === 'bulk'
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-line bg-surface p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] @2xl:grid @2xl:grid-cols-[150px_1fr_1fr_1fr_140px_auto] @2xl:items-end @2xl:gap-2"
              >
                {/* 원문 정보 */}
                <div className="mb-2 flex items-start justify-between gap-2 @2xl:mb-0 @2xl:block">
                  <div className="min-w-0">
                    <div className="break-words text-sm font-semibold text-ink">
                      <span className="mr-1 text-[10px] font-medium text-faint">문자</span>
                      {r.merchant}
                    </div>
                    <div className="text-[11px] text-muted">
                      {fmtWhen(r.smsAt)} · 카드 {r.cardLast4}
                      {!r.suggestedItemId && (
                        <span className="ml-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          새 상점
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right @2xl:mt-1 @2xl:text-left">
                    <div className="font-display text-sm font-bold text-red-700">{fmtAmt(r.currency, r.principal)}</div>
                    <div className="text-[11px] text-faint">{fmtUsd(usdOf(r))}</div>
                  </div>
                </div>

                {/* 항목 */}
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-faint">항목</span>
                  <select
                    value={d.itemId}
                    onChange={(e) => setDraft(r.id, { itemId: e.target.value })}
                    className={`${ctl} ${!d.itemId ? 'border-amber-300' : ''}`}
                  >
                    <option value="">항목 선택</option>
                    {groups.map(([cat, list]) => (
                      <optgroup key={cat} label={cat}>
                        {list.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>

                {/* 구매처(어디서) — 문자 상점명은 16자로 잘려 오므로 바로잡을 수 있고, 바로잡은 이름은 학습됨 */}
                <label className="mt-2 block @2xl:mt-0">
                  <span className="mb-1 block text-[11px] font-medium text-faint">
                    구매처{r.suggestedVendor ? <span className="ml-1 text-accent">추천</span> : ''}
                  </span>
                  <input
                    value={d.vendor}
                    onChange={(e) => setDraft(r.id, { vendor: e.target.value })}
                    placeholder={r.merchant}
                    className={ctl}
                  />
                </label>

                {/* 적요(무엇을) — 상점별로 학습·추천 */}
                <label className="mt-2 block @2xl:mt-0">
                  <span className="mb-1 block text-[11px] font-medium text-faint">
                    적요{r.suggestedName ? <span className="ml-1 text-accent">추천</span> : ''}
                  </span>
                  <input
                    value={d.name}
                    onChange={(e) => setDraft(r.id, { name: e.target.value })}
                    placeholder="예: 식료품 · 주유 · 학비"
                    className={ctl}
                  />
                </label>

                {/* 계좌 */}
                <label className="mt-2 block @2xl:mt-0">
                  <span className="mb-1 block text-[11px] font-medium text-faint">계좌</span>
                  <select
                    value={d.accountId}
                    onChange={(e) => setDraft(r.id, { accountId: e.target.value })}
                    className={ctl}
                  >
                    <option value="">(없음)</option>
                    {options.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>

                {/* 액션 */}
                <div className="mt-3 flex gap-2 @2xl:mt-0">
                  <button
                    type="button"
                    disabled={rowBusy || !d.itemId}
                    onClick={() => approve([r.id])}
                    className="h-9 flex-1 rounded-lg bg-primary px-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-40 @2xl:flex-none"
                  >
                    {busy === r.id ? '…' : '승인'}
                  </button>
                  <button
                    type="button"
                    disabled={rowBusy}
                    onClick={() => ignore(r.id)}
                    className="h-9 rounded-lg border border-line px-3 text-sm text-muted transition hover:text-danger disabled:opacity-40"
                  >
                    무시
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
