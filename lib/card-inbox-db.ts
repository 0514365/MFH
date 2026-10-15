// MFH-CARD-INBOX-DB-V3 — 구매처 표시명 학습 · 추천 실시간(사전 우선)
// MFH-CARD-INBOX-DB-V2 — 구매처(vendor)·적요 분리, 적요 학습
// MFH-CARD-INBOX-DB-V1
// Ficohsa 카드 문자 승인대기 인박스 데이터 계층 — 서버 전용. 테이블 card_tx_inbox · merchant_rules(patch103).
// 수집은 scripts/ficohsa-collect.ts(service role)가 하고, 여기서는 앱의 조회·승인·무시·학습(사전 갱신)을 담당.
// 승인 = acct_inout insert(source=sms) + inbox 행 approved + merchant_rules upsert(다음 추천용).
import { createClient } from './supabase-server'
import type { ActionResult, InboxApproveInput, InboxRow } from './accounting-types'

const HN_TZ = 'America/Tegucigalpa'
const r2 = (n: number) => Math.round(n * 100) / 100

// 승인대기 목록(최근 문자 먼저). 추천값은 상점 사전을 **실시간** 우선 적용(한 건 승인·학습하면 같은 상점의 다른 대기 행에도 즉시 반영),
// 사전에 없으면 수집 시 저장된 suggested_* 사용. 실패 시 null.
export async function getInboxPending(): Promise<InboxRow[] | null> {
  const sb = await createClient()
  const [{ data, error }, rules] = await Promise.all([
    sb
      .from('card_tx_inbox')
      .select(
        'id, sms_key, sms_at, card_last4, currency, principal, merchant, suggested_item_id, suggested_name, suggested_vendor, suggested_account_id',
      )
      .eq('status', 'pending')
      .order('sms_at', { ascending: false }),
    sb.from('merchant_rules').select('merchant, item_id, name, vendor, account_id'),
  ])
  if (error) return null
  const ruleOf = new Map<string, { item_id: string; name: string | null; vendor: string | null; account_id: string | null }>()
  for (const r of rules.data ?? []) ruleOf.set(r.merchant, r)
  return (data ?? []).map((r): InboxRow => {
    const rule = ruleOf.get(r.merchant)
    return {
      id: r.id,
      smsKey: r.sms_key,
      smsAt: r.sms_at,
      cardLast4: r.card_last4,
      currency: r.currency,
      principal: Number(r.principal),
      merchant: r.merchant,
      suggestedItemId: rule?.item_id ?? r.suggested_item_id,
      suggestedName: rule ? rule.name : r.suggested_name,
      suggestedVendor: rule ? rule.vendor : (r.suggested_vendor ?? null),
      // 계좌는 카드 끝자리 기준(수집 시 저장)이 우선 — 사전 계좌는 없을 때만
      suggestedAccountId: r.suggested_account_id ?? rule?.account_id ?? null,
    }
  })
}

// 승인대기 건수(기록 탭 배너용). 실패 시 0.
export async function getInboxPendingCount(): Promise<number> {
  const sb = await createClient()
  const { count, error } = await sb
    .from('card_tx_inbox')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  return error ? 0 : (count ?? 0)
}

// 환율 기본값 — 마지막으로 승인한 SMS HNL 거래의 환율, 없으면 26.5.
export async function getLastSmsRate(): Promise<number> {
  const sb = await createClient()
  const { data } = await sb
    .from('acct_inout')
    .select('rate')
    .eq('source', 'sms')
    .eq('currency', 'HNL')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const r = data?.rate != null ? Number(data.rate) : NaN
  return Number.isFinite(r) && r > 0 ? r : 26.5
}

// ISO 시각 → 온두라스 기준 YYYY-MM-DD(거래일).
function hnDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: HN_TZ })
}

// 승인 1건 — 장부 저장 → inbox 갱신 → 상점 사전 학습. 장부 저장 실패 시 inbox 는 건드리지 않음.
export async function approveInboxItem(uid: string, p: InboxApproveInput): Promise<ActionResult> {
  const sb = await createClient()
  const { data: row, error: e0 } = await sb
    .from('card_tx_inbox')
    .select('id, sms_at, currency, principal, merchant, status')
    .eq('id', p.id)
    .maybeSingle()
  if (e0 || !row) return { ok: false, error: '대기 거래를 찾지 못했습니다' }
  if (row.status !== 'pending') return { ok: false, error: '이미 처리된 거래입니다' }
  if (!p.itemId) return { ok: false, error: '항목을 선택하세요' }

  const usd = row.currency === 'USD'
  const rate = usd ? 1 : p.rate
  if (!(rate > 0)) return { ok: false, error: '환율을 입력하세요' }
  const principal = Number(row.principal)
  const amountUsd = usd ? principal : r2(principal / rate)
  const name = p.name.trim() // 적요(무엇을) — 빈칸 허용
  const vendor = p.vendor.trim() || row.merchant // 구매처 표시명 — 비우면 상점명

  const { data: ins, error: e1 } = await sb
    .from('acct_inout')
    .insert({
      user_id: uid,
      gubun: '지출',
      date: hnDate(row.sms_at),
      item_id: p.itemId,
      name,
      vendor, // 구매처(어디서) — 수정했으면 수정값, 아니면 문자 상점명
      currency: row.currency,
      principal,
      rate,
      amount_usd: amountUsd,
      account_id: p.accountId || null,
      supporter_id: null,
      source: 'sms',
    })
    .select('id')
    .single()
  if (e1 || !ins) return { ok: false, error: `장부 저장 실패: ${e1?.message ?? ''}` }

  const { error: e2 } = await sb
    .from('card_tx_inbox')
    .update({ status: 'approved', inout_id: ins.id, decided_at: new Date().toISOString() })
    .eq('id', p.id)
  if (e2) return { ok: false, error: `대기열 갱신 실패: ${e2.message}` }

  await learnMerchant(uid, row.merchant, p.itemId, name || null, vendor !== row.merchant ? vendor : null, p.accountId || null)
  return { ok: true }
}

// 상점 사전 upsert — 같은 상점은 최신 값(항목·적요·계좌)으로 덮고 hit_count+1. name = 그 상점에서 통상 사는 것(적요 추천).
async function learnMerchant(
  uid: string,
  merchant: string,
  itemId: string,
  name: string | null,
  vendor: string | null,
  accountId: string | null,
): Promise<void> {
  const sb = await createClient()
  const { data: ex } = await sb.from('merchant_rules').select('id, hit_count').eq('merchant', merchant).maybeSingle()
  const now = new Date().toISOString()
  if (ex) {
    await sb
      .from('merchant_rules')
      .update({ item_id: itemId, name, vendor, account_id: accountId, hit_count: (ex.hit_count ?? 0) + 1, last_used_at: now })
      .eq('id', ex.id)
  } else {
    await sb
      .from('merchant_rules')
      .insert({ user_id: uid, merchant, item_id: itemId, name, vendor, account_id: accountId, hit_count: 1, last_used_at: now })
  }
}

// 무시(장부에 넣지 않음). 복수 가능.
export async function ignoreInboxItems(ids: string[]): Promise<ActionResult & { done: number }> {
  if (!ids.length) return { ok: false, done: 0, error: '선택된 거래가 없습니다' }
  const sb = await createClient()
  const { error } = await sb
    .from('card_tx_inbox')
    .update({ status: 'ignored', decided_at: new Date().toISOString() })
    .in('id', ids)
    .eq('status', 'pending')
  return error ? { ok: false, done: 0, error: `처리 실패: ${error.message}` } : { ok: true, done: ids.length }
}
