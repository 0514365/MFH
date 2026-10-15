// MFH-FICOHSA-SMS-V1
// Ficohsa 카드 거래 문자 → card_tx_inbox 수집 공용 모듈. Mac 수집기(scripts/ficohsa-collect.ts)와
// iPhone 단축어 API(/api/accounting/sms-ingest)가 함께 쓴다. Supabase 클라이언트(service role/admin)를 인자로 받는 순수 모듈 —
// next/server·쿠키 의존 없음(tsx 스크립트에서도 import 가능).
//   · 파싱: 'FICO: Transaccion TC xxxx*****NNNN por HNL|USD|KRW 1,234.56 en 상점, si no la reconoce …'
//   · 추천: merchant_rules(상점 사전) 항목·적요·구매처 + 계좌(카드 끝자리 > 사전 > 통화 기본).
//   · 중복: ① sms_key 동일(같은 출처 재수집) ② 다른 출처(mac↔shortcut)에 카드·금액·상점 같고 수신 ±5분인 행 — 1:1 대응.
//   · 자동 승인(patch110): 상점 자동 켬 + 항목 보임 + 계좌 + HNL/USD + 금액 ≤ 그 상점 최근 승인 10건 평균×3 → 장부 저장.
import type { SupabaseClient } from '@supabase/supabase-js'

export type SmsSource = 'mac' | 'shortcut'
export const HN_TZ = 'America/Tegucigalpa'
const FICO_RE = /^FICO: Transaccion TC xxxx\*+(\d{4}) por (HNL|USD|KRW) ([\d,]+\.\d{2}) en (.+?), si no la reconoce/
const DUPE_WINDOW_MS = 5 * 60 * 1000
const AUTO_AVG_N = 10
const AUTO_MAX_X = 3

const r2 = (n: number) => Math.round(n * 100) / 100
export const normMerchant = (s: string) => s.replace(/\s+/g, ' ').trim().toUpperCase()
const hnDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: HN_TZ })

// ISO(UTC) → 온두라스 로컬 'YYYY-MM-DD HH:MM:SS'(sms_key 용 — Mac chat.db localtime 과 같은 형식).
export function hnLocalDt(iso: string): string {
  return new Date(iso).toLocaleString('sv-SE', { timeZone: HN_TZ, hour12: false })
}

export type ParsedSms = { card: string; currency: 'HNL' | 'USD' | 'KRW'; principal: number; merchant: string }

export function parseFicohsaSms(text: string): ParsedSms | null {
  const m = text.trim().match(FICO_RE)
  if (!m) return null
  const [, card, cur, amt, merchantRaw] = m
  return { card, currency: cur as ParsedSms['currency'], principal: Number(amt.replace(/,/g, '')), merchant: normMerchant(merchantRaw) }
}

// sms_key: 카드끝4 + 로컬 수신시각(초) + 원금 — 같은 초에 같은 카드로 2건(학비 분할 등)이 와도 구분.
export const smsKey = (card: string, localDt: string, principal: number) =>
  `${card}-${localDt.replace(/[^\d]/g, '')}-${principal.toFixed(2)}`

export type SmsInput = { text: string; smsAt: string /* ISO UTC */; localDt: string /* 'YYYY-MM-DD HH:MM:SS' 수신지 로컬 */ }

type Rule = {
  id: string
  merchant: string
  item_id: string
  name: string | null
  vendor: string | null
  account_id: string | null
  hit_count: number | null
  auto_approve?: boolean // patch110 전에는 없음
}

export type InboxDraft = {
  user_id: string
  sms_key: string
  sms_at: string
  card_last4: string
  currency: string
  principal: number
  merchant: string
  raw_text: string
  status: 'pending'
  suggested_item_id: string | null
  suggested_name: string | null
  suggested_vendor: string | null
  suggested_account_id: string | null
}

export type IngestedRow = {
  id: string
  merchant: string
  vendor: string // 표시명(사전 구매처 > 상점명)
  currency: string
  principal: number
  smsAt: string
  auto: boolean
}

export type IngestResult = {
  total: number
  parsed: number
  unparsed: number
  withRule: number
  duplicates: number
  added: IngestedRow[]
  autoDone: number
  notes: string[] // 자동 제외 사유·실패 등(로그용)
  preview?: { draft: InboxDraft; dupe: boolean; auto: true | string | null }[] // dryRun 일 때
}

// 문자 여러 건 수집 — 파싱 → 추천 → 중복 제외 → 저장 → 자동 승인. dryRun 이면 저장 없이 preview 만.
export async function ingestSms(
  sb: SupabaseClient,
  userId: string,
  inputs: SmsInput[],
  opts: { source: SmsSource; dryRun?: boolean },
): Promise<IngestResult> {
  const res: IngestResult = { total: inputs.length, parsed: 0, unparsed: 0, withRule: 0, duplicates: 0, added: [], autoDone: 0, notes: [] }
  const parsed: { draft: InboxDraft; p: ParsedSms }[] = []
  for (const s of inputs) {
    const p = parseFicohsaSms(s.text)
    if (!p) {
      res.unparsed++
      continue
    }
    parsed.push({
      p,
      draft: {
        user_id: userId,
        sms_key: smsKey(p.card, s.localDt, p.principal),
        sms_at: s.smsAt,
        card_last4: p.card,
        currency: p.currency,
        principal: p.principal,
        merchant: p.merchant,
        raw_text: s.text,
        status: 'pending',
        suggested_item_id: null,
        suggested_name: null,
        suggested_vendor: null,
        suggested_account_id: null,
      },
    })
  }
  res.parsed = parsed.length
  if (!parsed.length) return res

  // 옵션: 계좌(카드 끝자리·통화 기본값) · 상점 사전
  const [{ data: accounts }, { data: rules }] = await Promise.all([
    sb.from('acct_accounts').select('id, currency, card_last4').eq('is_active', true).order('sort_order'),
    sb.from('merchant_rules').select('*'), // * — patch110(auto_approve) 적용 전에도 동작
  ])
  const accByCard = new Map<string, string>()
  const accByCur = new Map<string, string>()
  for (const a of accounts ?? []) {
    if (a.card_last4) accByCard.set(String(a.card_last4), a.id)
    if ((a.currency === 'HNL' || a.currency === 'USD') && !accByCur.has(a.currency)) accByCur.set(a.currency, a.id)
  }
  const ruleOf = new Map<string, Rule>()
  for (const r of (rules ?? []) as Rule[]) ruleOf.set(r.merchant, r)
  for (const { draft: d } of parsed) {
    const rule = ruleOf.get(d.merchant)
    d.suggested_item_id = rule?.item_id ?? null
    d.suggested_name = rule?.name ?? null
    d.suggested_vendor = rule?.vendor ?? null
    d.suggested_account_id = accByCard.get(d.card_last4) ?? rule?.account_id ?? accByCur.get(d.currency) ?? null
  }
  res.withRule = parsed.filter((x) => x.draft.suggested_item_id).length

  // 중복 판정 — 범위 안 기존 행을 한 번에 읽어 메모리에서 비교.
  const times = parsed.map((x) => Date.parse(x.draft.sms_at))
  const from = new Date(Math.min(...times) - DUPE_WINDOW_MS).toISOString()
  const to = new Date(Math.max(...times) + DUPE_WINDOW_MS).toISOString()
  const { data: existing } = await sb
    .from('card_tx_inbox')
    .select('*')
    .gte('sms_at', from)
    .lte('sms_at', to)
  type Ex = { sms_key: string; sms_at: string; card_last4: string; principal: number; merchant: string; source?: string }
  const exRows = (existing ?? []) as Ex[]
  const keys = new Set(exRows.map((e) => e.sms_key))
  const used = new Set<Ex>() // 1:1 대응(같은 금액 2건이 실제로 있을 때)
  const fresh: { draft: InboxDraft; p: ParsedSms }[] = []
  const dupeKeys = new Set<string>()
  for (const x of parsed) {
    const d = x.draft
    let dupe = keys.has(d.sms_key)
    if (!dupe) {
      const t = Date.parse(d.sms_at)
      const m = exRows.find(
        (e) =>
          !used.has(e) &&
          (e.source ?? 'mac') !== opts.source &&
          e.card_last4 === d.card_last4 &&
          Number(e.principal) === d.principal &&
          e.merchant === d.merchant &&
          Math.abs(Date.parse(e.sms_at) - t) <= DUPE_WINDOW_MS,
      )
      if (m) {
        used.add(m)
        dupe = true
      }
    }
    if (dupe) {
      res.duplicates++
      dupeKeys.add(d.sms_key)
    } else fresh.push(x)
  }

  // 자동 승인 판정(저장 전)
  const autoCtx = await loadAutoContext(sb, [...ruleOf.values()].filter((r) => r.auto_approve))
  const verdict = new Map<string, true | string>()
  for (const { draft: d } of parsed) {
    const rule = ruleOf.get(d.merchant)
    if (rule?.auto_approve) verdict.set(d.sms_key, judgeAuto(d, rule, autoCtx))
  }

  if (opts.dryRun) {
    res.preview = parsed.map(({ draft }) => ({ draft, dupe: dupeKeys.has(draft.sms_key), auto: verdict.get(draft.sms_key) ?? null }))
    return res
  }
  if (!fresh.length) return res

  // 저장 — sms_key 충돌은 DO NOTHING. select 는 실제로 새로 들어간 행만 돌려준다.
  // source: 'mac' 은 컬럼 기본값이라 생략(patch112 적용 전에도 수집기가 동작하도록).
  const rows = fresh.map(({ draft }) => (opts.source === 'mac' ? draft : { ...draft, source: opts.source }))
  const inserted: { id: string; sms_key: string }[] = []
  for (let i = 0; i < rows.length; i += 200) {
    const { data, error } = await sb
      .from('card_tx_inbox')
      .upsert(rows.slice(i, i + 200), { onConflict: 'sms_key', ignoreDuplicates: true })
      .select('id, sms_key')
    if (error) throw new Error(`저장 실패: ${error.message}`)
    inserted.push(...(data ?? []))
  }

  const draftByKey = new Map(fresh.map((x) => [x.draft.sms_key, x.draft]))
  for (const ins of inserted) {
    const d = draftByKey.get(ins.sms_key)
    if (!d) continue
    const rule = ruleOf.get(d.merchant)
    let auto = false
    const v = verdict.get(d.sms_key)
    if (v === true && rule) {
      const err = await autoApprove(sb, userId, ins.id, d, rule, autoCtx.rate)
      if (err) res.notes.push(`자동 승인 실패(대기로 남김) ${d.merchant}: ${err}`)
      else {
        auto = true
        res.autoDone++
      }
    } else if (v) res.notes.push(`자동 제외 ${d.merchant} ${d.currency} ${d.principal}: ${v}`)
    res.added.push({
      id: ins.id,
      merchant: d.merchant,
      vendor: rule?.vendor || d.merchant,
      currency: d.currency,
      principal: d.principal,
      smsAt: d.sms_at,
      auto,
    })
  }
  return res
}

// ===== 자동 승인 =====

type AutoCtx = {
  activeItems: Set<string>
  avg: Map<string, number> // `${merchant}|${currency}` → 최근 승인 N건 평균 원금
  rate: number // HNL 환율
}

async function loadAutoContext(sb: SupabaseClient, autoRules: Rule[]): Promise<AutoCtx> {
  const ctx: AutoCtx = { activeItems: new Set(), avg: new Map(), rate: 26.5 }
  if (!autoRules.length) return ctx
  const [items, hist, last] = await Promise.all([
    sb.from('acct_items').select('id').eq('is_active', true).in('id', [...new Set(autoRules.map((r) => r.item_id))]),
    sb
      .from('card_tx_inbox')
      .select('merchant, currency, principal')
      .eq('status', 'approved')
      .in('merchant', autoRules.map((r) => r.merchant))
      .order('sms_at', { ascending: false })
      .limit(1000),
    sb
      .from('acct_inout')
      .select('rate')
      .eq('source', 'sms')
      .eq('currency', 'HNL')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  for (const i of items.data ?? []) ctx.activeItems.add(i.id)
  const bucket = new Map<string, number[]>()
  for (const h of hist.data ?? []) {
    const k = `${h.merchant}|${h.currency}`
    const arr = bucket.get(k) ?? []
    if (arr.length < AUTO_AVG_N) arr.push(Number(h.principal))
    bucket.set(k, arr)
  }
  for (const [k, arr] of bucket) if (arr.length) ctx.avg.set(k, arr.reduce((a, b) => a + b, 0) / arr.length)
  const rt = Number(last.data?.rate)
  if (Number.isFinite(rt) && rt > 0) ctx.rate = rt
  return ctx
}

// true = 자동 승인 / 문자열 = 제외 사유
function judgeAuto(d: InboxDraft, rule: Rule, ctx: AutoCtx): true | string {
  if (d.currency !== 'HNL' && d.currency !== 'USD') return `${d.currency} 결제`
  if (!ctx.activeItems.has(rule.item_id)) return '항목 숨김'
  if (!(d.suggested_account_id ?? rule.account_id)) return '계좌 없음'
  const avg = ctx.avg.get(`${d.merchant}|${d.currency}`)
  if (!avg) return '승인 이력 없음'
  if (d.principal > avg * AUTO_MAX_X) return `금액 ${d.principal} > 평균 ${r2(avg)}×${AUTO_MAX_X}`
  return true
}

// 장부 저장 → inbox approved·auto → 사전 hit_count+1. 오류 문자열 또는 null.
async function autoApprove(
  sb: SupabaseClient,
  uid: string,
  inboxId: string,
  d: InboxDraft,
  rule: Rule,
  hnlRate: number,
): Promise<string | null> {
  const usd = d.currency === 'USD'
  const rate = usd ? 1 : hnlRate
  const { data: ins, error: e1 } = await sb
    .from('acct_inout')
    .insert({
      user_id: uid,
      gubun: '지출',
      date: hnDate(d.sms_at),
      item_id: rule.item_id,
      name: rule.name ?? '',
      vendor: rule.vendor ?? d.merchant,
      currency: d.currency,
      principal: d.principal,
      rate,
      amount_usd: usd ? d.principal : r2(d.principal / rate),
      account_id: d.suggested_account_id ?? rule.account_id,
      supporter_id: null,
      source: 'sms',
    })
    .select('id')
    .single()
  if (e1 || !ins) return e1?.message ?? '장부 저장 실패'
  const now = new Date().toISOString()
  const { error: e2 } = await sb
    .from('card_tx_inbox')
    .update({ status: 'approved', auto: true, inout_id: ins.id, decided_at: now })
    .eq('id', inboxId)
  if (e2) {
    await sb.from('acct_inout').delete().eq('id', ins.id) // 대기열 갱신 실패 → 장부 되돌림(중복 방지)
    return e2.message
  }
  await sb
    .from('merchant_rules')
    .update({ hit_count: (rule.hit_count ?? 0) + 1, last_used_at: now })
    .eq('id', rule.id)
  rule.hit_count = (rule.hit_count ?? 0) + 1
  return null
}
