// MFH-SMS-INGEST-V1
// iPhone 단축어 실시간 수집 — Ficohsa 카드 문자 1건을 받아 card_tx_inbox 에 넣는다(source='shortcut', patch112).
// 보호: SMS_INGEST_TOKEN(Authorization: Bearer). 설정 절차 = docs/MFH-SMS-SHORTCUT.md.
// 입력: JSON {text, received_at?(ISO)} 또는 text/plain 본문(문자 원문). received_at 없으면 서버 수신 시각.
// 동작: lib/ficohsa-sms.ts ingestSms(파싱·추천·Mac 수집분과 ±5분 중복 판정·자동 승인) → 승인대기로 들어간 건만 즉시 푸시.
// ?dry=1 이면 저장·푸시 없이 판정 결과만(설정 테스트용).
// FICO 거래 문자가 아니면(OTP·안내 등) 200 {skipped} — 단축어가 오류 알림을 띄우지 않도록.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { PORTFOLIO_OWNER_ID } from '@/lib/members'
import { ingestSms, hnLocalDt } from '@/lib/ficohsa-sms'
import { sendFinancePush } from '@/lib/finance-push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SYM: Record<string, string> = { KRW: '₩', USD: '$', HNL: 'L ' }

function authorized(req: Request): boolean {
  const token = process.env.SMS_INGEST_TOKEN
  return !!token && req.headers.get('authorization') === `Bearer ${token}`
}

async function readInput(req: Request): Promise<{ text: string; receivedAt: string | null }> {
  const raw = await req.text()
  try {
    const j = JSON.parse(raw) as { text?: unknown; received_at?: unknown }
    if (j && typeof j.text === 'string')
      return { text: j.text, receivedAt: typeof j.received_at === 'string' ? j.received_at : null }
  } catch {
    // JSON 아님 → 본문 전체를 문자 원문으로
  }
  return { text: raw, receivedAt: null }
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const { text, receivedAt } = await readInput(req)
    const t = receivedAt ? Date.parse(receivedAt) : NaN
    // 단축어 시각이 이상하면(미래·하루 이상 과거) 서버 시각 사용
    const now = Date.now()
    const smsAt = new Date(Number.isFinite(t) && t <= now + 60_000 && now - t < 86400_000 ? t : now).toISOString()

    const dryRun = new URL(req.url).searchParams.get('dry') === '1'
    const admin = createAdminClient()
    const res = await ingestSms(admin, PORTFOLIO_OWNER_ID, [{ text, smsAt, localDt: hnLocalDt(smsAt) }], {
      source: 'shortcut',
      dryRun,
    })
    if (!res.parsed) return NextResponse.json({ ok: true, skipped: 'not a Ficohsa card transaction' })
    if (dryRun) {
      const p = res.preview?.[0]
      return NextResponse.json({
        ok: true,
        dry: true,
        smsAt,
        merchant: p?.draft.merchant,
        currency: p?.draft.currency,
        principal: p?.draft.principal,
        suggested: !!p?.draft.suggested_item_id,
        duplicate: p?.dupe,
        auto: p?.auto,
      })
    }
    if (!res.added.length) return NextResponse.json({ ok: true, duplicate: true })

    const row = res.added[0]
    let push: unknown = null
    if (!row.auto) {
      const { count } = await admin
        .from('card_tx_inbox')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      try {
        push = await sendFinancePush(admin, {
          title: '카드 승인대기',
          body: `${SYM[row.currency] ?? ''}${row.principal.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${row.vendor}`,
          url: '/accounting/inbox',
          badge: count ?? undefined,
        })
      } catch (e) {
        push = { error: (e as Error).message }
      }
    }
    return NextResponse.json({ ok: true, id: row.id, auto: row.auto, notes: res.notes, push })
  } catch (err) {
    return NextResponse.json({ error: 'ingest failed', detail: String((err as Error)?.message ?? err) }, { status: 500 })
  }
}
