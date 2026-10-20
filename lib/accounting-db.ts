// MFH-ACCOUNTING-DB-V14 — 카드 청구 주기 cycle(확정 청구·이용 중, cycle_end_day + due_day, patch118)
// MFH-ACCOUNTING-DB-V13 — 신용카드 상환일 dueDay(acct_accounts.due_day, patch117)
// MFH-ACCOUNTING-DB-V12 — 잔액 = 오늘(온두라스)까지 거래만. 미래 날짜 거래(예약·반복 입력)는 upcoming(예정)으로 분리
// MFH-ACCOUNTING-DB-V11 — to_principal(통화가 다른 이체 입금 금액, patch116) 읽기·쓰기·실보유 반영. rate·amount_usd 는 DB 트리거가 최종 결정
// MFH-ACCOUNTING-DB-V10 — 계좌 실보유(통화별)·공시 환율 평가액(valueUsd) · getFxInfo(patch114)
// MFH-ACCOUNTING-DB-V9 — 영수증(receipt_path, patch111): 읽기·쓰기·교체/삭제 시 Storage 파일 정리
// MFH-ACCOUNTING-DB-V8 — 항목 관리(updateItem·setItemActive·reorderItems), 옵션에 숨긴 항목 포함(active)
// MFH-ACCOUNTING-DB-V7 — toRow 조정 지원(폼 입력)
// MFH-ACCOUNTING-DB-V6 — 구분 '조정'(잔액 조정, patch108) 잔액 반영
// MFH-ACCOUNTING-DB-V5 — 계좌 잔액에 유형·카드끝자리·최근 환율·현지통화 근사 잔액 추가
// MFH-ACCOUNTING-DB-V4 — 통합 수정 필드 확장(날짜·적요·구매처·환율·후원자)
// MFH-ACCOUNTING-DB-V3 — vendor(구매처) 분리(patch105)
// MFH-ACCOUNTING-DB-V2 — 이체(출금→입금계좌) 지원(patch104)
// 회계 장부 데이터 계층(Supabase SoT) — 서버 전용(서버 컴포넌트·server action 에서만 import).
// 2026-10 노션 A안 → Supabase 이전. 함수 이름·시그니처는 구 lib/notion.ts 와 동일하게 유지(호출부 import 경로만 교체).
// 테이블: acct_items(항목) · acct_accounts(계좌) · acct_inout(거래) — supabase/patch102-accounting.sql.
// RLS(멤버 부부) 하에서 쿠키 세션 클라이언트로 접근. 실패 시 read 는 null, write 는 {ok:false,error}.
import { createClient } from './supabase-server'
import { latestFxRates } from './fx'
import type {
  AcctOption,
  AcctOptions,
  AccountBalance,
  AccountInput,
  CardCycle,
  CardCycleAmount,
  ActionResult,
  DonationYearly,
  FxInfo,
  Gubun,
  InoutInput,
  InoutPatch,
  InoutRow,
  ItemInput,
  ItemPatch,
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
// 항목은 숨긴 것(active=false)도 포함 — 과거 거래 이름 매핑용. 입력 콤보는 activeOnly() 로 거른다.
export async function getAcctOptions(): Promise<AcctOptions | null> {
  const sb = await createClient()
  const [items, supporters, accounts] = await Promise.all([
    sb
      .from('acct_items')
      .select('id, gubun, name, category, is_active')
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
      out.items[g].push({ id: it.id, name: it.name, category: it.category ?? null, active: it.is_active !== false })
  }
  out.supporters = (supporters.data ?? []).map((s): AcctOption => ({ id: s.id, name: s.name }))
  out.accounts = (accounts.data ?? []).map(
    (a): AcctOption => ({ id: a.id, name: a.name, currency: a.currency ?? null }),
  )
  return out
}

// 계좌별 잔액(USD 장부가) = 초기 + 조정 + Σ수입 − Σ지출 ± 이체. 실패 시 null.
// 실보유(holdings) = 계좌 통화 기준 통화별 합계 — 계좌 통화와 같은 거래는 원금, 그 외(USD 계좌 · 카드의 USD/KRW 결제 등)는 금액(USD).
// 평가액(valueUsd) = Σ 보유 ÷ 공시 환율(fx_rates 최신, patch114). 공시 환율이 없으면 null.
export async function getAccountBalances(): Promise<AccountBalance[] | null> {
  const sb = await createClient()
  const latestRate = (cur: 'KRW' | 'HNL') =>
    sb
      .from('acct_inout')
      .select('rate')
      .eq('currency', cur)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  const [acc, tx, krw, hnl, fx] = await Promise.all([
    sb
      .from('acct_accounts')
      .select('id, name, currency, kind, card_last4, info, due_day, cycle_end_day, initial_usd, adjust_usd')
      .eq('is_active', true)
      .order('sort_order')
      .order('name'),
    sb.from('acct_inout').select('gubun, date, account_id, to_account_id, amount_usd, currency, principal, to_principal'),
    latestRate('KRW'),
    latestRate('HNL'),
    latestFxRates(sb),
  ])
  if (acc.error || tx.error) return null
  const rateOf: Record<string, number | null> = {
    USD: 1,
    KRW: num(krw.data?.rate) ?? null,
    HNL: num(hnl.data?.rate) ?? null,
  }
  const curOf = new Map((acc.data ?? []).map((a) => [a.id as string, (a.currency ?? 'USD') as string]))
  // 장부 USD + 통화별 실보유. 수입 +계좌 · 지출 −계좌 · 이체 −출금계좌 +입금계좌 · 조정 ±계좌
  const sum = new Map<string, number>()
  const hold = new Map<string, Map<string, number>>()
  // 미래 날짜 거래(오늘 이후, 온두라스 기준) — 잔액에서 빼고 계좌 통화 기준 예정액·건수·가장 이른 날짜만 모은다.
  const todayHn = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })
  const upcoming = new Map<string, { amount: number; count: number; first: string }>()
  // toSide = 이체 입금 측 — 입금 금액(to_principal)이 있으면 입금 계좌 통화 금액으로 본다(통화가 다른 이체, patch116).
  const add = (
    id: string | null,
    sign: number,
    t: { amount_usd: unknown; currency: string | null; principal: unknown; to_principal?: unknown },
    toSide = false,
  ) => {
    if (!id) return
    const usd = num(t.amount_usd) ?? 0
    sum.set(id, (sum.get(id) ?? 0) + sign * usd)
    const acur = curOf.get(id) ?? 'USD'
    const toP = toSide ? num(t.to_principal) : null
    const same = acur !== 'USD' && (toP != null || t.currency === acur)
    const bucket = same ? acur : 'USD'
    const v = same ? (toP ?? num(t.principal) ?? 0) : usd
    const m = hold.get(id) ?? new Map<string, number>()
    m.set(bucket, (m.get(bucket) ?? 0) + sign * v)
    hold.set(id, m)
  }
  const addUpcoming = (id: string | null, sign: number, t: { date: string | null; amount_usd: unknown; currency: string | null; principal: unknown; to_principal?: unknown }, toSide = false) => {
    if (!id) return
    const acur = curOf.get(id) ?? 'USD'
    const toP = toSide ? num(t.to_principal) : null
    const v = acur !== 'USD' && (toP != null || t.currency === acur) ? (toP ?? num(t.principal) ?? 0) : (num(t.amount_usd) ?? 0)
    const u = upcoming.get(id) ?? { amount: 0, count: 0, first: t.date ?? '' }
    u.amount += sign * v
    u.count += 1
    if (t.date && (!u.first || t.date < u.first)) u.first = t.date
    upcoming.set(id, u)
  }
  for (const t of tx.data ?? []) {
    if (t.date && t.date > todayHn) {
      if (t.gubun === '수입' || t.gubun === '조정') addUpcoming(t.account_id, 1, t)
      else if (t.gubun === '지출') addUpcoming(t.account_id, -1, t)
      else if (t.gubun === '이체') {
        addUpcoming(t.account_id, -1, t)
        addUpcoming(t.to_account_id, 1, t, true)
      }
      continue
    }
    if (t.gubun === '수입') add(t.account_id, 1, t)
    else if (t.gubun === '지출') add(t.account_id, -1, t)
    else if (t.gubun === '이체') {
      add(t.account_id, -1, t)
      add(t.to_account_id, 1, t, true)
    } else if (t.gubun === '조정') add(t.account_id, 1, t) // 잔액 조정(부호 있음, patch108)
  }
  const fxRate = (cur: string): number | null => (cur === 'USD' ? 1 : (fx[cur as 'HNL' | 'KRW']?.rate ?? null))
  // 카드 청구 주기 — 직전 마감일 D(오늘이 마감일 이후면 이번 달, 아니면 지난달) 기준으로
  // 확정 청구 = D 까지 잔액의 부채 − D 이후 상환·환불 · 이용 중 = D 이후 이용액. 버킷 = 카드 통화(own) · USD.
  // 상환은 카드 통화 부채 먼저, 남으면 공시 환율로 달러분을 갚은 것으로 본다(원화로 청구된 해외 결제).
  const cardCycle = (id: string, cur: string, closeDay: number, dueDay: number): CardCycle => {
    const ymdOf = (y: number, m: number, d: number) => {
      const dt = new Date(Date.UTC(y, m, 1))
      const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate()
      return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`
    }
    const [ty, tm, td] = todayHn.split('-').map(Number)
    const cm = td > closeDay ? tm - 1 : tm - 2 // 직전 마감 월(0-based)
    const closeDate = ymdOf(ty, cm, closeDay)
    const dueOf = (m: number) => ymdOf(ty, dueDay > closeDay ? m : m + 1, dueDay)
    const dueDate = dueOf(cm)
    const nextDueDate = dueOf(cm + 1)
    const rate = fxRate(cur) ?? rateOf[cur] ?? null
    // D 까지 버킷 잔액 · D 이후 양(상환·환불)/음(이용) 합
    const at = { own: 0, usd: 0 }
    const credit = { own: 0, usd: 0 }
    const charge = { own: 0, usd: 0 }
    const put = (sign: number, t: { date: string | null; amount_usd: unknown; currency: string | null; principal: unknown; to_principal?: unknown }, toSide: boolean) => {
      const toP = toSide ? num(t.to_principal) : null
      const same = cur !== 'USD' && (toP != null || t.currency === cur)
      const k = same ? 'own' : 'usd'
      const v = sign * (same ? (toP ?? num(t.principal) ?? 0) : (num(t.amount_usd) ?? 0))
      if (!t.date || t.date <= closeDate) at[k] += v
      else if (v > 0) credit[k] += v
      else charge[k] -= v
    }
    for (const t of tx.data ?? []) {
      if (t.date && t.date > todayHn) continue
      if (t.account_id === id) put(t.gubun === '지출' || t.gubun === '이체' ? -1 : 1, t, false)
      if (t.gubun === '이체' && t.to_account_id === id) put(1, t, true)
    }
    // 마감 시점 과납분은 상환으로 본다
    const billed = { own: Math.max(0, -at.own), usd: Math.max(0, -at.usd) }
    credit.own += Math.max(0, at.own)
    credit.usd += Math.max(0, at.usd)
    const unbilled = { own: charge.own, usd: charge.usd }
    // 상환·환불을 확정 청구 → 이용 중 순으로 차감(같은 버킷 먼저, 남으면 환율로 다른 버킷)
    const payDown = (debt: { own: number; usd: number }) => {
      let x = Math.min(debt.own, credit.own)
      debt.own -= x
      credit.own -= x
      x = Math.min(debt.usd, credit.usd)
      debt.usd -= x
      credit.usd -= x
      if (rate) {
        x = Math.min(debt.usd, credit.own / rate)
        debt.usd -= x
        credit.own -= x * rate
        x = Math.min(debt.own, credit.usd * rate)
        debt.own -= x
        credit.usd -= x / rate
      }
    }
    payDown(billed)
    payDown(unbilled)
    const amt = (d: { own: number; usd: number }): CardCycleAmount => {
      const own = cur === 'KRW' ? Math.round(d.own) : r2(d.own)
      const usd = r2(d.usd)
      return { own, usd, valueUsd: r2(usd + (rate ? own / rate : 0)) }
    }
    const b = amt(billed)
    return { closeDate, dueDate, nextDueDate, billed: b, unbilled: amt(unbilled), overdue: todayHn > dueDate && b.valueUsd > 0.005 }
  }
  return (acc.data ?? []).map((a) => {
    const base = (num(a.initial_usd) ?? 0) + (num(a.adjust_usd) ?? 0)
    const balanceUsd = r2(base + (sum.get(a.id) ?? 0))
    const currency = a.currency ?? null
    const rate = currency ? (rateOf[currency] ?? null) : null
    const m = hold.get(a.id) ?? new Map<string, number>()
    if (base) m.set('USD', (m.get('USD') ?? 0) + base)
    const holdings = [...m.entries()]
      .map(([cur, amount]) => ({ currency: cur, amount: cur === 'KRW' ? Math.round(amount) : r2(amount) }))
      .filter((h) => h.amount !== 0)
    const own = holdings.find((h) => h.currency === currency)
    const balanceLocal = currency && currency !== 'USD' ? (own?.amount ?? 0) : null
    let valueUsd: number | null = 0
    for (const h of holdings) {
      const fr = fxRate(h.currency)
      if (fr == null) {
        valueUsd = null
        break
      }
      valueUsd += h.amount / fr
    }
    return {
      id: a.id,
      name: a.name,
      currency,
      kind: a.kind ?? null,
      cardLast4: a.card_last4 ?? null,
      info: a.info ?? null,
      dueDay: a.due_day ?? null,
      cycle: a.kind === '신용카드' && a.cycle_end_day && a.due_day && currency ? cardCycle(a.id, currency, a.cycle_end_day, a.due_day) : null,
      rate,
      balanceUsd,
      balanceLocal,
      holdings,
      upcoming: upcoming.get(a.id) ?? null,
      valueUsd: valueUsd == null ? null : r2(valueUsd),
    }
  })
}

// 통화별 최신 공시 환율(평가 표시용). 없으면 빈 배열.
export async function getFxInfo(): Promise<FxInfo[]> {
  const sb = await createClient()
  const fx = await latestFxRates(sb)
  return Object.values(fx).map((f) => ({ currency: f!.currency, rate: f!.rate, date: f!.rate_date, source: f!.source }))
}

// 거래 목록(표시·수정·집계용) — 날짜 내림차순(동일 날짜는 최근 입력 먼저). limit 미지정 시 전체.
export async function getRecentInout(limit?: number): Promise<InoutRow[] | null> {
  const sb = await createClient()
  let q = sb
    .from('acct_inout')
    .select(
      'id, gubun, date, name, vendor, currency, principal, rate, amount_usd, item_id, account_id, to_account_id, supporter_id, created_at, receipt_path, to_principal',
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
      vendor: r.vendor ?? null,
      currency: r.currency,
      principal: num(r.principal),
      rate: num(r.rate),
      amountUsd: num(r.amount_usd),
      itemId: r.item_id,
      accountId: r.account_id,
      toAccountId: r.to_account_id,
      supporterId: r.supporter_id,
      createdTime: r.created_at,
      receiptPath: r.receipt_path ?? null,
      toPrincipal: num(r.to_principal),
    }),
  )
}

// ===== write =====

function toRow(p: InoutInput) {
  const transfer = p.gubun === '이체'
  const adjust = p.gubun === '조정'
  const noItem = transfer || adjust
  const vendor = noItem ? null : p.vendor?.trim() || null
  return {
    gubun: p.gubun,
    date: p.date,
    item_id: noItem ? null : p.itemId,
    name: p.name.trim() || (transfer ? '이체' : adjust ? '잔액 조정' : vendor ? '' : '(무제)'),
    vendor,
    currency: p.currency,
    principal: p.principal,
    rate: p.rate,
    amount_usd: p.amountUsd,
    account_id: p.accountId ?? null,
    to_account_id: transfer ? (p.toAccountId ?? null) : null,
    to_principal: transfer && p.toPrincipal != null && p.toPrincipal > 0 ? p.toPrincipal : null,
    supporter_id: noItem ? null : (p.supporterId ?? null),
    ...(p.receiptPath !== undefined ? { receipt_path: p.receiptPath } : {}),
  }
}

// ===== 영수증 Storage 정리 =====
const RECEIPT_BUCKET = 'receipts'

// 영수증 파일 삭제(실패는 무시 — 고아 파일만 남는다).
async function removeReceiptFiles(paths: (string | null | undefined)[]): Promise<void> {
  const list = paths.filter((p): p is string => !!p)
  if (!list.length) return
  const sb = await createClient()
  await sb.storage.from(RECEIPT_BUCKET).remove(list)
}

async function receiptPathsOf(ids: string[]): Promise<string[]> {
  const sb = await createClient()
  const { data } = await sb.from('acct_inout').select('receipt_path').in('id', ids)
  return (data ?? []).map((r) => r.receipt_path).filter((p): p is string => !!p)
}

// 영수증만 교체/제거 — 이전 파일은 Storage 에서 삭제.
export async function setInoutReceipt(id: string, path: string | null): Promise<ActionResult> {
  const [old] = await receiptPathsOf([id])
  const sb = await createClient()
  const { error } = await sb.from('acct_inout').update({ receipt_path: path }).eq('id', id)
  if (error) return { ok: false, error: `영수증 저장 실패: ${error.message}` }
  if (old && old !== path) await removeReceiptFiles([old])
  return { ok: true }
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
  const old = p.receiptPath !== undefined ? (await receiptPathsOf([id]))[0] : undefined
  const sb = await createClient()
  const { error } = await sb.from('acct_inout').update(toRow(p)).eq('id', id)
  if (error) return { ok: false, error: `수정 실패: ${error.message}` }
  if (old && old !== p.receiptPath) await removeReceiptFiles([old])
  return { ok: true }
}

// 거래 1건 삭제.
export async function deleteInoutRecord(id: string): Promise<ActionResult> {
  const receipts = await receiptPathsOf([id])
  const sb = await createClient()
  const { error } = await sb.from('acct_inout').delete().eq('id', id)
  if (error) return { ok: false, error: `삭제 실패: ${error.message}` }
  await removeReceiptFiles(receipts)
  return { ok: true }
}

// 거래 여러 건 삭제.
export async function deleteInoutRecords(ids: string[]): Promise<ActionResult & { done: number }> {
  if (!ids.length) return { ok: false, done: 0, error: '선택된 거래가 없습니다' }
  const receipts = await receiptPathsOf(ids)
  const sb = await createClient()
  const { error } = await sb.from('acct_inout').delete().in('id', ids)
  if (error) return { ok: false, done: 0, error: `삭제 실패: ${error.message}` }
  await removeReceiptFiles(receipts)
  return { ok: true, done: ids.length }
}

// 통합 수정 patch → 공통 update 행(환율 제외). 비어 있으면 null.
function patchToRow(patch: InoutPatch): Record<string, string | null> | null {
  const row: Record<string, string | null> = {}
  if (patch.itemId) row.item_id = patch.itemId
  if (patch.accountId) row.account_id = patch.accountId
  if (patch.date) row.date = patch.date
  if (patch.name != null) row.name = patch.name.trim()
  if (patch.vendor != null) row.vendor = patch.vendor.trim() || null
  if (patch.supporterId !== undefined) row.supporter_id = patch.supporterId || null
  return Object.keys(row).length ? row : null
}

// 부분 수정 1건 — gubun 은 구 시그니처 호환용(미사용).
export async function patchInoutFields(id: string, _gubun: Gubun, patch: InoutPatch): Promise<ActionResult> {
  const res = await patchInoutFieldsBulk([id], patch)
  return res.ok ? { ok: true } : { ok: false, error: res.error }
}

// 여러 건 부분 수정 — 항목·계좌·날짜·적요·구매처·후원자는 단일 update, 환율은 행별 재계산(USD 행 제외).
export async function patchInoutFieldsBulk(
  ids: string[],
  patch: InoutPatch,
): Promise<ActionResult & { done: number }> {
  if (!ids.length) return { ok: false, done: 0, error: '선택된 거래가 없습니다' }
  const row = patchToRow(patch)
  const rate = patch.rate != null && patch.rate > 0 ? patch.rate : null
  if (!row && !rate) return { ok: false, done: 0, error: '변경할 값을 하나 이상 입력하세요' }
  const sb = await createClient()
  if (row) {
    const { error } = await sb.from('acct_inout').update(row).in('id', ids)
    if (error) return { ok: false, done: 0, error: `수정 실패: ${error.message}` }
  }
  if (rate) {
    const { data, error } = await sb.from('acct_inout').select('id, currency, principal').in('id', ids)
    if (error) return { ok: false, done: row ? ids.length : 0, error: `환율 수정 실패: ${error.message}` }
    for (const r of data ?? []) {
      if (r.currency === 'USD') continue
      const principal = num(r.principal) ?? 0
      const { error: e2 } = await sb
        .from('acct_inout')
        .update({ rate, amount_usd: r2(principal / rate) })
        .eq('id', r.id)
      if (e2) return { ok: false, done: 0, error: `환율 수정 실패: ${e2.message}` }
    }
  }
  return { ok: true, done: ids.length }
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

// 항목(분류) 1건 생성 — 같은 구분에 같은 이름이 있으면 오류. 성공 시 새 id.
export async function createItem(it: ItemInput): Promise<ActionResult & { id?: string }> {
  const uid = await currentUserId()
  if (!uid) return { ok: false, error: '로그인이 필요합니다' }
  const name = it.name.trim()
  const category = it.category.trim()
  if (!name) return { ok: false, error: '항목 이름을 입력하세요' }
  if (!category) return { ok: false, error: '대분류를 선택하세요' }
  const sb = await createClient()
  const { data: max } = await sb
    .from('acct_items')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const { data, error } = await sb
    .from('acct_items')
    .insert({ user_id: uid, gubun: it.gubun, name, category, sort_order: (max?.sort_order ?? 0) + 1 })
    .select('id')
    .single()
  if (error) {
    if (error.code === '23505') return { ok: false, error: `'${name}' 항목이 이미 있습니다` }
    return { ok: false, error: `항목 저장 실패: ${error.message}` }
  }
  return { ok: true, id: data.id }
}

// 항목 이름·대분류 수정 — id 기준이라 과거 거래 표시도 자동 반영. (구분,대분류,이름) 중복이면 오류.
export async function updateItem(id: string, p: ItemPatch): Promise<ActionResult> {
  const name = p.name.trim()
  const category = p.category.trim()
  if (!name) return { ok: false, error: '항목 이름을 입력하세요' }
  if (!category) return { ok: false, error: '대분류를 선택하세요' }
  const sb = await createClient()
  const { error } = await sb.from('acct_items').update({ name, category }).eq('id', id)
  if (error) {
    if (error.code === '23505') return { ok: false, error: `'${category} · ${name}' 항목이 이미 있습니다` }
    return { ok: false, error: `항목 수정 실패: ${error.message}` }
  }
  return { ok: true }
}

// 항목 숨김/보이기 — 거래는 그대로 두고 입력 콤보에서만 빠진다.
export async function setItemActive(id: string, active: boolean): Promise<ActionResult> {
  const sb = await createClient()
  const { error } = await sb.from('acct_items').update({ is_active: active }).eq('id', id)
  return error ? { ok: false, error: `항목 변경 실패: ${error.message}` } : { ok: true }
}

// 항목 순서 — 넘겨받은 순서대로 sort_order = (i+1)×10 으로 다시 번호 매김(한 구분 전체).
export async function reorderItems(ids: string[]): Promise<ActionResult> {
  if (!ids.length) return { ok: true }
  const sb = await createClient()
  const results = await Promise.all(
    ids.map((id, i) => sb.from('acct_items').update({ sort_order: (i + 1) * 10 }).eq('id', id)),
  )
  const failed = results.find((r) => r.error)
  return failed?.error ? { ok: false, error: `순서 저장 실패: ${failed.error.message}` } : { ok: true }
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
