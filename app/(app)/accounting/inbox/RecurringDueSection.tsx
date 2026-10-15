'use client'
// MFH-RECURRING-DUE-SECTION-V1
// 승인대기 화면 상단 "반복 기록 승인대기" — 예약 작업이 만든 due 행을 날짜·금액·환율 확인 후 승인(장부 저장) / 건너뜀.
// 우측 '반복 규칙' 버튼 → 규칙 목록·추가·수정·비활성 모달. 자동 저장은 없다(실제 이체·납부 확인 후 승인).
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AcctOptions } from '@/lib/accounting-types'
import type { RecurringDue, RecurringRule, RecurringRuleInput } from '@/lib/recurring-db'
import { approveRecurring, skipRecurring, saveRecurring, toggleRecurring } from './recurring-actions'

const inp = 'h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink outline-none transition focus:border-primary'
const lbl = 'mb-1 block text-[11px] font-medium text-faint'
const SYM: Record<string, string> = { KRW: '₩', USD: '$', HNL: 'L' }
const fmtLocal = (cur: string, n: number) => `${SYM[cur] ?? ''}${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const fmtUsd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function RecurringDueSection({
  dues,
  rules,
  options,
}: {
  dues: RecurringDue[]
  rules: RecurringRule[]
  options: AcctOptions
}) {
  const router = useRouter()
  const accName = useMemo(() => new Map(options.accounts.map((a) => [a.id, a.name])), [options])
  const itemName = useMemo(() => new Map([...options.items['수입'], ...options.items['지출']].map((i) => [i.id, i.name])), [options])
  const [edit, setEdit] = useState<Record<string, { date: string; principal: string; rate: string }>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [rulesOpen, setRulesOpen] = useState(false)

  const val = (d: RecurringDue) => edit[d.id] ?? { date: d.dueDate, principal: String(d.rule.principal), rate: String(d.suggestedRate) }
  const set = (d: RecurringDue, k: 'date' | 'principal' | 'rate', v: string) => setEdit((e) => ({ ...e, [d.id]: { ...val(d), [k]: v } }))

  async function onApprove(d: RecurringDue) {
    if (busy) return
    const v = val(d)
    setBusy(d.id)
    setErr('')
    const res = await approveRecurring({ id: d.id, date: v.date, principal: Number(v.principal), rate: Number(v.rate) })
    setBusy(null)
    if (!res.ok) return setErr(res.error ?? '승인 실패')
    router.refresh()
  }
  async function onSkip(d: RecurringDue) {
    if (busy) return
    if (!window.confirm(`${d.rule.name} · ${d.ym} 을 건너뛸까요? (장부에 기록되지 않습니다)`)) return
    setBusy(d.id)
    setErr('')
    const res = await skipRecurring(d.id)
    setBusy(null)
    if (!res.ok) return setErr(res.error ?? '실패')
    router.refresh()
  }

  const describe = (r: RecurringRule) =>
    r.gubun === '이체'
      ? `${accName.get(r.accountId) ?? '?'} → ${accName.get(r.toAccountId ?? '') ?? '?'}`
      : `${r.gubun} · ${r.itemId ? itemName.get(r.itemId) ?? '?' : '?'} · ${accName.get(r.accountId) ?? '?'}`

  return (
    <section className="mb-4 rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[13px] font-bold text-muted">
          반복 기록 승인대기 <span className="font-display text-accent">{dues.length}</span>건
          <span className="ml-1.5 text-[11px] font-normal text-faint">· 실제 이체·납부 확인 후 승인</span>
        </h2>
        <button type="button" onClick={() => setRulesOpen(true)} className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-medium text-muted transition hover:border-primary hover:text-primary">
          반복 규칙 {rules.filter((r) => r.isActive).length}
        </button>
      </div>
      {dues.length === 0 ? (
        <p className="py-2 text-center text-xs text-faint">대기 중인 반복 기록이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-line">
          {dues.map((d) => {
            const v = val(d)
            const usd = d.rule.currency === 'USD'
            const amountUsd = usd ? Number(v.principal) || 0 : Number(v.rate) > 0 ? (Number(v.principal) || 0) / Number(v.rate) : 0
            return (
              <li key={d.id} className="flex flex-col gap-2 py-2.5 @xl:flex-row @xl:items-end">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">
                    {d.rule.name} <span className="ml-1 text-[11px] font-normal text-faint">{d.ym} · 예정 {d.dueDate}</span>
                  </div>
                  <div className="text-[11px] text-muted">{describe(d.rule)}</div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 @xl:w-[330px]">
                  <div>
                    <label className={lbl}>날짜</label>
                    <input type="date" value={v.date} onChange={(e) => set(d, 'date', e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>금액 ({d.rule.currency})</label>
                    <input type="number" inputMode="decimal" value={v.principal} onChange={(e) => set(d, 'principal', e.target.value)} className={`${inp} text-right`} />
                  </div>
                  <div>
                    <label className={lbl}>환율 → {fmtUsd(amountUsd)}</label>
                    <input type="number" inputMode="decimal" value={usd ? '1' : v.rate} disabled={usd} onChange={(e) => set(d, 'rate', e.target.value)} className={`${inp} text-right disabled:opacity-50`} />
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => onApprove(d)} disabled={busy === d.id} className="h-9 rounded-lg bg-primary px-3 text-xs font-bold text-white disabled:opacity-50">
                    {busy === d.id ? '…' : '승인'}
                  </button>
                  <button type="button" onClick={() => onSkip(d)} disabled={busy === d.id} className="h-9 rounded-lg border border-line px-3 text-xs text-muted hover:border-accent hover:text-accent disabled:opacity-50">
                    건너뜀
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {err && <p className="mt-2 text-xs text-red-700">{err}</p>}
      {rulesOpen && <RulesModal rules={rules} options={options} describe={describe} onClose={() => setRulesOpen(false)} />}
    </section>
  )
}

// ── 규칙 관리 모달 ───────────────────────────────────────
const EMPTY: RecurringRuleInput = { name: '', gubun: '지출', itemId: null, accountId: '', toAccountId: null, currency: 'KRW', principal: 0, rate: null, dayOfMonth: 10, startYm: new Date().toISOString().slice(0, 7), endYm: null, vendor: null }

function RulesModal({ rules, options, describe, onClose }: { rules: RecurringRule[]; options: AcctOptions; describe: (r: RecurringRule) => string; onClose: () => void }) {
  const router = useRouter()
  const [form, setForm] = useState<RecurringRuleInput | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const f = form
  const up = (patch: Partial<RecurringRuleInput>) => setForm((x) => (x ? { ...x, ...patch } : x))

  async function onSave() {
    if (!f || saving) return
    setSaving(true)
    setErr('')
    const res = await saveRecurring(f)
    setSaving(false)
    if (!res.ok) return setErr(res.error ?? '저장 실패')
    setForm(null)
    router.refresh()
  }
  async function onToggle(r: RecurringRule) {
    const res = await toggleRecurring(r.id, !r.isActive)
    if (!res.ok) return setErr(res.error ?? '실패')
    router.refresh()
  }
  const items = f ? (f.gubun === '이체' ? [] : options.items[f.gubun]) : []

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 @md:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="반복 규칙">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-ink">반복 규칙</h3>
          <div className="flex items-center gap-2">
            {!f && (
              <button type="button" onClick={() => setForm({ ...EMPTY })} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-muted hover:border-primary hover:text-primary">
                + 규칙 추가
              </button>
            )}
            <button type="button" onClick={onClose} className="text-xs text-muted hover:text-primary">닫기</button>
          </div>
        </div>

        {f ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className={lbl}>이름(= 거래 내용)</label>
                <input value={f.name} onChange={(e) => up({ name: e.target.value })} className={inp} autoFocus />
              </div>
              <div>
                <label className={lbl}>구분</label>
                <select value={f.gubun} onChange={(e) => up({ gubun: e.target.value as RecurringRuleInput['gubun'], itemId: null, toAccountId: null })} className={inp}>
                  <option value="지출">지출</option>
                  <option value="수입">수입</option>
                  <option value="이체">이체</option>
                </select>
              </div>
              {f.gubun !== '이체' ? (
                <div>
                  <label className={lbl}>항목</label>
                  <select value={f.itemId ?? ''} onChange={(e) => up({ itemId: e.target.value || null })} className={inp}>
                    <option value="">선택</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>{i.category ? `${i.category} · ` : ''}{i.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className={lbl}>입금계좌</label>
                  <select value={f.toAccountId ?? ''} onChange={(e) => up({ toAccountId: e.target.value || null })} className={inp}>
                    <option value="">선택</option>
                    {options.accounts.filter((a) => a.id !== f.accountId).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className={lbl}>{f.gubun === '수입' ? '입금계좌' : f.gubun === '이체' ? '출금계좌' : '지불계좌'}</label>
                <select value={f.accountId} onChange={(e) => up({ accountId: e.target.value })} className={inp}>
                  <option value="">선택</option>
                  {options.accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>통화</label>
                <select value={f.currency} onChange={(e) => up({ currency: e.target.value as RecurringRuleInput['currency'] })} className={inp}>
                  <option value="KRW">KRW</option>
                  <option value="USD">USD</option>
                  <option value="HNL">HNL</option>
                </select>
              </div>
              <div>
                <label className={lbl}>금액</label>
                <input type="number" inputMode="decimal" value={f.principal || ''} onChange={(e) => up({ principal: Number(e.target.value) })} className={`${inp} text-right`} />
              </div>
              <div>
                <label className={lbl}>환율(비우면 승인 시 최근 환율)</label>
                <input type="number" inputMode="decimal" value={f.rate ?? ''} onChange={(e) => up({ rate: e.target.value ? Number(e.target.value) : null })} className={`${inp} text-right`} disabled={f.currency === 'USD'} />
              </div>
              <div>
                <label className={lbl}>매월 일</label>
                <input type="number" min={1} max={31} value={f.dayOfMonth} onChange={(e) => up({ dayOfMonth: Number(e.target.value) })} className={`${inp} text-right`} />
              </div>
              <div>
                <label className={lbl}>시작 연월</label>
                <input type="month" value={f.startYm} onChange={(e) => up({ startYm: e.target.value })} className={inp} />
              </div>
              <div>
                <label className={lbl}>종료 연월(선택)</label>
                <input type="month" value={f.endYm ?? ''} onChange={(e) => up({ endYm: e.target.value || null })} className={inp} />
              </div>
              {f.gubun !== '이체' && (
                <div>
                  <label className={lbl}>구매처(선택)</label>
                  <input value={f.vendor ?? ''} onChange={(e) => up({ vendor: e.target.value || null })} className={inp} />
                </div>
              )}
            </div>
            {err && <p className="text-xs text-red-700">{err}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setForm(null)} className="h-9 rounded-lg border border-line px-3 text-sm text-muted">취소</button>
              <button type="button" onClick={onSave} disabled={saving} className="h-9 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:opacity-50">{saving ? '저장 중…' : '저장'}</button>
            </div>
          </div>
        ) : (
          <>
            {rules.length === 0 ? (
              <p className="py-3 text-center text-xs text-faint">규칙이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-line">
                {rules.map((r) => (
                  <li key={r.id} className={`flex items-center justify-between gap-2 py-2 ${r.isActive ? '' : 'opacity-50'}`}>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-ink">
                        {r.name} <span className="ml-1 font-display text-[12px] text-muted">{fmtLocal(r.currency, r.principal)}</span>
                        <span className="ml-1 text-[11px] text-faint">매월 {r.dayOfMonth}일 · {r.startYm}~{r.endYm ?? ''}</span>
                      </div>
                      <div className="truncate text-[11px] text-muted">{describe(r)}</div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => setForm({ id: r.id, name: r.name, gubun: r.gubun, itemId: r.itemId, accountId: r.accountId, toAccountId: r.toAccountId, currency: r.currency, principal: r.principal, rate: r.rate, dayOfMonth: r.dayOfMonth, startYm: r.startYm, endYm: r.endYm, vendor: r.vendor })} className="rounded-md border border-line px-2 py-1 text-[11px] text-muted hover:border-primary hover:text-primary">수정</button>
                      <button type="button" onClick={() => onToggle(r)} className="rounded-md border border-line px-2 py-1 text-[11px] text-muted hover:border-accent hover:text-accent">{r.isActive ? '비활성' : '활성'}</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {err && <p className="mt-2 text-xs text-red-700">{err}</p>}
          </>
        )}
      </div>
    </div>
  )
}
