// MFH-ACCOUNTING-DB-V1
// 회계 장부 데이터 계층(Supabase SoT) — 서버 전용(서버 컴포넌트·server action 에서만 import).
// 2026-10 노션 A안 → Supabase 이전. 함수 이름·시그니처는 구 lib/notion.ts 와 동일하게 유지(호출부 import 경로만 교체).
// 테이블: acct_items(항목) · acct_accounts(계좌) · acct_inout(거래) — supabase/patch102-accounting.sql.
// RLS(멤버 부부) 하에서 쿠키 세션 클라이언트로 접근. 실패 시 read 는 null, write 는 {ok:false,error}.
import { createClient } from './supabase-server'
import type {
  AcctOption,
  AcctOptions,
  AccountBalance,
  AccountInput,
  ActionResult,
  DonationYearly,
  Gubun,
  InoutInput,
  InoutPatch,
  InoutRow,
} from './accounting-types'

export type * from './accounting-types'

const r2 = (n: number) => Math.round(n * 100) / 100
const num = (v: unknown): number | null => (typeof v === 'number' ? v : v == null ? null : Number(v))

async function currentUserId(): Promise<string | null> {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  return user?.id ?? null
}

// ===== read =====

// 입력 폼 콤보 소스 — 항목(구분별)·후원자·계좌. 실패 시 null.
export async function getAcctOptions(): Promise<AcctOptions | null> {
  const sb = await createClient()
  const [items, supporters, accounts] = await Promise.all([
    sb
      .from('acct_items')
      .select('id, gubun, name, category')
      .eq('is_active', true)
      .order('sort_order')
      .order('name'),
    sb.from('supporters').select('id, name').order('name'),
    sb
      .from('acct_accounts')
      .select('id, name, currency')
      .eq('is_active', true)
      .order('sort_order')
      .order('name'),
  ])
  if (items.error || supporters.error || accounts.error) return null
  const out: AcctOptions = { items: { 수입: [], 지출: [] }, supporters: [], accounts: [] }
  for (const it of items.data ?? []) {
    const g = it.gubun as string
    if (g === '수입' || g === '지출')
      out.items[g].push({ id: it.id, name: it.name, category: it.category ?? null })
  }
  out.supporters = (supporters.data ?? []).map((s): AcctOption => ({ id: s.id, name: s.name }))
  out.accounts = (accounts.data ?? []).map(
    (a): AcctOption => ({ id: a.id, name: a.name, currency: a.currency ?? null }),
  )
  return out
}

// 계좌별 잔액(USD) = 초기 + 조정 + Σ수입 − Σ지출. 실패 시 null.
export async function getAccountBalances(): Promise<AccountBalance[] | null> {
  const sb = await createClient()
  const [acc, tx] = await Promise.all([
    sb
      .from('acct_accounts')
      .select('id, name, currency, initial_usd, adjust_usd')
      .eq('is_active', true)
      .order('sort_order')
      .order('name'),
    sb.from('acct_inout').select('gubun, account_id, amount_usd').not('account_id', 'is', null),
  ])
  if (acc.error || tx.error) return null
  const sum = new Map<string, number>()
  for (const t of tx.data ?? []) {
    if (!t.account_id) continue
    const amt = num(t.amount_usd) ?? 0
    sum.set(t.account_id, (sum.get(t.account_id) ?? 0) + (t.gubun === '수입' ? amt : -amt))
  }
  return (acc.data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    currency: a.currency ?? null,
    balanceUsd: r2((num(a.initial_usd) ?? 0) + (num(a.adjust_usd) ?? 0) + (sum.get(a.id) ?? 0)),
  }))
}

// 거래 목록(표시·수정·집계용) — 날짜 내림차순(동일 날짜는 최근 입력 먼저). limit 미지정 시 전체.
export async function getRecentInout(limit?: number): Promise<InoutRow[] | null> {
  const sb = await createClient()
  let q = sb
    .from('acct_inout')
    .select(
      'id, gubun, date, name, currency, principal, rate, amount_usd, item_id, account_id, supporter_id, created_at',
    )
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (limit != null) q = q.limit(limit)
  const { data, error } = await q
  if (error) return null
  return (data ?? []).map(
    (r): InoutRow => ({
      id: r.id,
      gubun: r.gubun,
      date: r.date,
      name: r.name,
      currency: r.currency,
      principal: num(r.principal),
      rate: num(r.rate),
      amountUsd: num(r.amount_usd),
      itemId: r.item_id,
      accountId: r.account_id,
      supporterId: r.supporter_id,
      createdTime: r.created_at,
    }),
  )
}

// ===== write =====

function toRow(p: InoutInput) {
  return {
    gubun: p.gubun,
    date: p.date,
    item_id: p.itemId,
    name: p.name || '(무제)',
    currency: p.currency,
    principal: p.principal,
    rate: p.rate,
    amount_usd: p.amountUsd,
    account_id: p.accountId ?? null,
    supporter_id: p.supporterId ?? null,
  }
}

// 거래 1건 생성.
export async function createInoutRecord(p: InoutInput): Promise<ActionResult> {
  const uid = await currentUserId()
  if (!uid) return { ok: false, error: '로그인이 필요합니다' }
  const sb = await createClient()
  const { error } = await sb
    .from('acct_inout')
    .insert({ ...toRow(p), user_id: uid, source: p.source ?? 'manual' })
  return error ? { ok: false, error: `저장 실패: ${error.message}` } : { ok: true }
}

// 거래 여러 건 생성(CSV·인박스 일괄). 전부 성공 또는 전부 실패(단일 insert).
export async function createInoutRecords(items: InoutInput[]): Promise<ActionResult & { done: number }> {
  const uid = await currentUserId()
  if (!uid) return { ok: false, done: 0, error: '로그인이 필요합니다' }
  if (!items.length) return { ok: false, done: 0, error: '저장할 거래가 없습니다' }
  const sb = await createClient()
  const { error } = await sb
    .from('acct_inout')
    .insert(items.map((p) => ({ ...toRow(p), user_id: uid, source: p.source ?? 'manual' })))
  return error ? { ok: false, done: 0, error: `저장 실패: ${error.message}` } : { ok: true, done: items.length }
}

// 거래 1건 전체 수정.
export async function updateInoutRecord(id: string, p: InoutInput): Promise<ActionResult> {
  const sb = await createClient()
  const { error } = await sb.from('acct_inout').update(toRow(p)).eq('id', id)
  return error ? { ok: false, error: `수정 실패: ${error.message}` } : { ok: true }
}

// 거래 1건 삭제.
export async function deleteInoutRecord(id: string): Promise<ActionResult> {
  const sb = await createClient()
  const { error } = await sb.from('acct_inout').delete().eq('id', id)
  return error ? { ok: false, error: `삭제 실패: ${error.message}` } : { ok: true }
}

// 거래 여러 건 삭제.
export async function deleteInoutRecords(ids: string[]): Promise<ActionResult & { done: number }> {
  if (!ids.length) return { ok: false, done: 0, error: '선택된 거래가 없습니다' }
  const sb = await createClient()
  const { error } = await sb.from('acct_inout').delete().in('id', ids)
  return error ? { ok: false, done: 0, error: `삭제 실패: ${error.message}` } : { ok: true, done: ids.length }
}

// 부분 수정 — 항목/계좌만 변경(금액·이름·날짜 보존). gubun 은 구 시그니처 호환용(계좌 컬럼이 하나라 미사용).
export async function patchInoutFields(
  id: string,
  _gubun: Gubun,
  patch: InoutPatch,
): Promise<ActionResult> {
  const row: Record<string, string> = {}
  if (patch.itemId) row.item_id = patch.itemId
  if (patch.accountId) row.account_id = patch.accountId
  if (!Object.keys(row).length) return { ok: true }
  const sb = await createClient()
  const { error } = await sb.from('acct_inout').update(row).eq('id', id)
  return error ? { ok: false, error: `수정 실패: ${error.message}` } : { ok: true }
}

// 여러 건 부분 수정(항목/계좌).
export async function patchInoutFieldsBulk(
  ids: string[],
  patch: InoutPatch,
): Promise<ActionResult & { done: number }> {
  const row: Record<string, string> = {}
  if (patch.itemId) row.item_id = patch.itemId
  if (patch.accountId) row.account_id = patch.accountId
  if (!ids.length) return { ok: false, done: 0, error: '선택된 거래가 없습니다' }
  if (!Object.keys(row).length) return { ok: false, done: 0, error: '변경할 항목 또는 계좌를 선택하세요' }
  const sb = await createClient()
  const { error } = await sb.from('acct_inout').update(row).in('id', ids)
  return error ? { ok: false, done: 0, error: `수정 실패: ${error.message}` } : { ok: true, done: ids.length }
}

// 계좌 1건 생성(입금·지불 공용).
export async function createAccount(a: AccountInput): Promise<ActionResult> {
  const uid = await currentUserId()
  if (!uid) return { ok: false, error: '로그인이 필요합니다' }
  const sb = await createClient()
  const { error } = await sb
    .from('acct_accounts')
    .insert({ user_id: uid, name: a.name.trim(), currency: a.currency, info: a.info ?? null })
  return error ? { ok: false, error: `계좌 저장 실패: ${error.message}` } : { ok: true }
}

// ===== 후원자 헌금 집계(후원자 모듈용) =====

// 후원자별 헌금('수입' 거래)을 연도별·통화별 집계. Map<supporters.id, DonationYearly>. 실패 시 null.
export async function getDonationsByAppId(): Promise<Map<string, DonationYearly> | null> {
  const sb = await createClient()
  const { data, error } = await sb
    .from('acct_inout')
    .select('supporter_id, date, currency, principal, amount_usd')
    .eq('gubun', '수입')
    .not('supporter_id', 'is', null)
  if (error) return null
  const byApp = new Map<string, Map<number, number>>()
  const byAppCur = new Map<string, Map<string, number>>()
  for (const tx of data ?? []) {
    const sid = tx.supporter_id as string | null
    if (!sid || !tx.date) continue
    const year = Number(String(tx.date).slice(0, 4))
    if (!Number.isFinite(year)) continue
    const amount = num(tx.amount_usd) ?? 0
    const years = byApp.get(sid) ?? new Map<number, number>()
    years.set(year, (years.get(year) ?? 0) + amount)
    byApp.set(sid, years)
    const cur = tx.currency ?? 'USD'
    const principal = num(tx.principal) ?? amount
    const curMap = byAppCur.get(sid) ?? new Map<string, number>()
    curMap.set(cur, (curMap.get(cur) ?? 0) + principal)
    byAppCur.set(sid, curMap)
  }
  const CUR_ORDER: Record<string, number> = { KRW: 0, HNL: 1, USD: 2 }
  const out = new Map<string, DonationYearly>()
  for (const [sid, years] of byApp) {
    const arr = [...years.entries()].map(([year, sum]) => ({ year, sum })).sort((a, b) => b.year - a.year)
    const total = arr.reduce((s, y) => s + y.sum, 0)
    const byCurrency = [...(byAppCur.get(sid)?.entries() ?? [])]
      .map(([currency, sum]) => ({ currency, sum }))
      .sort((a, b) => (CUR_ORDER[a.currency] ?? 9) - (CUR_ORDER[b.currency] ?? 9))
    out.set(sid, { total, years: arr, byCurrency })
  }
  return out
}

// 후원자 목록 통계 — 후원자 귀속 '수입'의 올해/이번달 USD 합(America/Tegucigalpa 기준). 실패 시 null.
export async function getSupporterDonationTotals(): Promise<{ yearUsd: number; monthUsd: number } | null> {
  const sb = await createClient()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })
  const yearStr = today.slice(0, 4)
  const ymStr = today.slice(0, 7)
  const { data, error } = await sb
    .from('acct_inout')
    .select('date, amount_usd')
    .eq('gubun', '수입')
    .not('supporter_id', 'is', null)
    .gte('date', `${yearStr}-01-01`)
  if (error) return null
  let yearUsd = 0
  let monthUsd = 0
  for (const tx of data ?? []) {
    const d = String(tx.date ?? '')
    const amt = num(tx.amount_usd) ?? 0
    if (d.startsWith(yearStr)) yearUsd += amt
    if (d.startsWith(ymStr)) monthUsd += amt
  }
  return { yearUsd: r2(yearUsd), monthUsd: r2(monthUsd) }
}
