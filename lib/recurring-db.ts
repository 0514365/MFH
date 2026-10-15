// MFH-RECURRING-DB-V1
// 반복 기록(patch109) 데이터 계층 — 규칙(acct_recurring) · 승인대기(acct_recurring_due). 서버 전용(쿠키 세션, RLS 멤버).
//   · 승인대기 행은 scripts/recurring-due.ts(예약 작업)가 만들고, 여기서는 조회·승인(장부 저장)·건너뜀·규칙 CRUD 만.
//   · 승인 = 규칙 구분대로 acct_inout 1건 insert(수입/지출/이체) → due.status=approved + inout_id.
import { createClient } from './supabase-server'
import type { ActionResult, Currency } from './accounting-types'

const r2 = (n: number) => Math.round(n * 100) / 100
const num = (v: unknown): number | null => (typeof v === 'number' ? v : v == null ? null : Number(v))

export type RecurringRule = {
  id: string
  name: string
  gubun: '수입' | '지출' | '이체'
  itemId: string | null
  accountId: string
  toAccountId: string | null
  currency: Currency
  principal: number
  rate: number | null
  dayOfMonth: number
  startYm: string
  endYm: string | null
  vendor: string | null
  isActive: boolean
}
export type RecurringRuleInput = Omit<RecurringRule, 'id' | 'isActive'> & { id?: string }

export type RecurringDue = {
  id: string
  ym: string
  dueDate: string
  rule: RecurringRule
  suggestedRate: number // 규칙 환율 또는 그 통화의 최근 장부 환율
}

function toRule(r: Record<string, unknown>): RecurringRule {
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    gubun: r.gubun as RecurringRule['gubun'],
    itemId: (r.item_id as string | null) ?? null,
    accountId: String(r.account_id),
    toAccountId: (r.to_account_id as string | null) ?? null,
    currency: r.currency as Currency,
    principal: num(r.principal) ?? 0,
    rate: num(r.rate),
    dayOfMonth: num(r.day_of_month) ?? 1,
    startYm: String(r.start_ym ?? ''),
    endYm: (r.end_ym as string | null) ?? null,
    vendor: (r.vendor as string | null) ?? null,
    isActive: !!r.is_active,
  }
}

// 통화별 최근 장부 환율(USD=1). 없으면 기본값(KRW 1350 · HNL 26.5).
async function latestRate(cur: Currency): Promise<number> {
  if (cur === 'USD') return 1
  const sb = await createClient()
  const { data } = await sb
    .from('acct_inout')
    .select('rate')
    .eq('currency', cur)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return num(data?.rate) ?? (cur === 'KRW' ? 1350 : 26.5)
}

// 승인대기 목록(규칙 join) — 예정일 오름차순.
export async function getRecurringDue(): Promise<RecurringDue[] | null> {
  const sb = await createClient()
  const { data, error } = await sb
    .from('acct_recurring_due')
    .select('id, ym, due_date, acct_recurring (*)')
    .eq('status', 'pending')
    .order('due_date')
  if (error) return null
  const rates = new Map<Currency, number>()
  const out: RecurringDue[] = []
  for (const d of data ?? []) {
    const raw = (Array.isArray(d.acct_recurring) ? d.acct_recurring[0] : d.acct_recurring) as Record<string, unknown> | null
    if (!raw) continue
    const rule = toRule(raw)
    if (!rates.has(rule.currency)) rates.set(rule.currency, rule.rate ?? (await latestRate(rule.currency)))
    out.push({ id: String(d.id), ym: String(d.ym), dueDate: String(d.due_date), rule, suggestedRate: rule.rate ?? rates.get(rule.currency)! })
  }
  return out
}

export async function getRecurringDueCount(): Promise<number> {
  const sb = await createClient()
  const { count } = await sb.from('acct_recurring_due').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  return count ?? 0
}

export type RecurringApproveInput = { id: string; date: string; principal: number; rate: number; name?: string }

// 승인 — 장부 저장 후 due 갱신. 장부 저장 실패 시 due 는 그대로.
export async function approveRecurringDue(uid: string, p: RecurringApproveInput): Promise<ActionResult> {
  const sb = await createClient()
  const { data: d, error: e0 } = await sb
    .from('acct_recurring_due')
    .select('id, status, acct_recurring (*)')
    .eq('id', p.id)
    .maybeSingle()
  if (e0 || !d) return { ok: false, error: '승인대기 건을 찾지 못했습니다' }
  if (d.status !== 'pending') return { ok: false, error: '이미 처리된 건입니다' }
  const raw = (Array.isArray(d.acct_recurring) ? d.acct_recurring[0] : d.acct_recurring) as Record<string, unknown> | null
  if (!raw) return { ok: false, error: '규칙이 없습니다' }
  const rule = toRule(raw)
  if (!(p.principal > 0)) return { ok: false, error: '금액을 입력하세요' }
  const rate = rule.currency === 'USD' ? 1 : p.rate
  if (!(rate > 0)) return { ok: false, error: '환율을 입력하세요' }
  const transfer = rule.gubun === '이체'
  const { data: ins, error: e1 } = await sb
    .from('acct_inout')
    .insert({
      user_id: uid,
      gubun: rule.gubun,
      date: p.date,
      item_id: transfer ? null : rule.itemId,
      name: (p.name ?? rule.name).trim() || rule.name,
      vendor: transfer ? null : rule.vendor,
      currency: rule.currency,
      principal: r2(p.principal),
      rate,
      amount_usd: r2(p.principal / rate),
      account_id: rule.accountId,
      to_account_id: transfer ? rule.toAccountId : null,
      supporter_id: null,
      source: 'manual',
    })
    .select('id')
    .single()
  if (e1 || !ins) return { ok: false, error: `장부 저장 실패: ${e1?.message ?? ''}` }
  const { error: e2 } = await sb
    .from('acct_recurring_due')
    .update({ status: 'approved', inout_id: ins.id, decided_at: new Date().toISOString() })
    .eq('id', p.id)
  return e2 ? { ok: false, error: `대기열 갱신 실패: ${e2.message}` } : { ok: true }
}

export async function skipRecurringDue(id: string): Promise<ActionResult> {
  const sb = await createClient()
  const { error } = await sb
    .from('acct_recurring_due')
    .update({ status: 'skipped', decided_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
  return error ? { ok: false, error: `건너뜀 실패: ${error.message}` } : { ok: true }
}

// 규칙 목록(비활성 포함) — 활성 먼저, 일자 순.
export async function listRecurringRules(): Promise<RecurringRule[] | null> {
  const sb = await createClient()
  const { data, error } = await sb.from('acct_recurring').select('*').order('is_active', { ascending: false }).order('day_of_month').order('name')
  if (error) return null
  return (data ?? []).map((r) => toRule(r as Record<string, unknown>))
}

export async function saveRecurringRule(uid: string, p: RecurringRuleInput): Promise<ActionResult & { id?: string }> {
  const name = p.name.trim()
  if (!name) return { ok: false, error: '이름을 입력하세요' }
  if (!p.accountId) return { ok: false, error: '계좌를 선택하세요' }
  if (p.gubun === '이체' ? !p.toAccountId || p.toAccountId === p.accountId : !p.itemId) return { ok: false, error: p.gubun === '이체' ? '입금계좌를 선택하세요' : '항목을 선택하세요' }
  if (!(p.principal > 0)) return { ok: false, error: '금액을 입력하세요' }
  if (!/^\d{4}-\d{2}$/.test(p.startYm)) return { ok: false, error: '시작 연월(YYYY-MM)을 입력하세요' }
  const row = {
    name,
    gubun: p.gubun,
    item_id: p.gubun === '이체' ? null : p.itemId,
    account_id: p.accountId,
    to_account_id: p.gubun === '이체' ? p.toAccountId : null,
    currency: p.currency,
    principal: r2(p.principal),
    rate: p.rate && p.rate > 0 ? p.rate : null,
    day_of_month: Math.min(31, Math.max(1, Math.round(p.dayOfMonth))),
    start_ym: p.startYm,
    end_ym: p.endYm && /^\d{4}-\d{2}$/.test(p.endYm) ? p.endYm : null,
    vendor: p.vendor?.trim() || null,
  }
  const sb = await createClient()
  if (p.id) {
    const { error } = await sb.from('acct_recurring').update(row).eq('id', p.id)
    return error ? { ok: false, error: `규칙 수정 실패: ${error.message}` } : { ok: true, id: p.id }
  }
  const { data, error } = await sb.from('acct_recurring').insert({ ...row, user_id: uid }).select('id').single()
  return error || !data ? { ok: false, error: `규칙 저장 실패: ${error?.message ?? ''}` } : { ok: true, id: data.id }
}

export async function setRecurringActive(id: string, active: boolean): Promise<ActionResult> {
  const sb = await createClient()
  const { error } = await sb.from('acct_recurring').update({ is_active: active }).eq('id', id)
  return error ? { ok: false, error: `규칙 변경 실패: ${error.message}` } : { ok: true }
}
