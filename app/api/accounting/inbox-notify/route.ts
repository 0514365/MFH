// MFH-INBOX-NOTIFY-V3 — 수집기 body {added, auto} 받아 자동 승인 건수 포함(대기 0건이어도 자동분 있으면 발송)
// MFH-INBOX-NOTIFY-V2 — 반복 기록 승인대기(acct_recurring_due) 건수 합산
// MFH-INBOX-NOTIFY-V1 — 카드 문자 승인대기 푸시 알림
// 보호: CRON_SECRET(Authorization: Bearer). 호출자 = scripts/ficohsa-collect.ts(매일 22:00, 새 건 있을 때).
// 동작: 승인대기(pending) 건수 조회 → 재정 관리자(부부) 구독에 "승인대기 N건" 발송 → 만료 구독 정리. 0건이면 스킵.
import { NextResponse } from 'next/server'
import webpush, { type WebPushError } from 'web-push'
import { createAdminClient } from '@/lib/supabase-admin'
import { FINANCE_MANAGER_IDS } from '@/lib/members'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SubRow = { user_id: string; endpoint: string; p256dh: string; auth: string }

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  return !!secret && req.headers.get('authorization') === `Bearer ${secret}`
}

async function run(autoCount: number): Promise<NextResponse> {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  let subject = process.env.VAPID_SUBJECT || 'mailto:noreply@mfh.app'
  if (!subject.startsWith('mailto:') && !subject.startsWith('http')) subject = `mailto:${subject}`
  if (!pub || !priv) return NextResponse.json({ error: 'VAPID not configured' }, { status: 500 })
  webpush.setVapidDetails(subject, pub, priv)

  const admin = createAdminClient()
  const { count } = await admin
    .from('card_tx_inbox')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  const { count: recCount } = await admin
    .from('acct_recurring_due')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  const cardPending = count ?? 0
  const recPending = recCount ?? 0
  const pending = cardPending + recPending
  if (pending <= 0 && autoCount <= 0) return NextResponse.json({ ok: true, pending, sent: 0, note: 'nothing pending' })

  const { data, error } = await admin
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', FINANCE_MANAGER_IDS)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const subs = (data ?? []) as SubRow[]

  const payload = JSON.stringify({
    title: pending > 0 ? '회계 승인대기' : '카드 자동 승인',
    body: [
      autoCount > 0 ? `카드 거래 ${autoCount}건 자동 승인.` : '',
      pending > 0
        ? [cardPending > 0 ? `카드 거래 ${cardPending}건` : '', recPending > 0 ? `반복 기록 ${recPending}건` : ''].filter(Boolean).join(' · ') + ' 승인을 기다립니다.'
        : '',
    ]
      .filter(Boolean)
      .join(' '),
    url: '/accounting/inbox',
    badge: pending,
  })
  let sent = 0
  let removed = 0
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
        sent += 1
      } catch (err) {
        const status = (err as WebPushError)?.statusCode
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
          removed += 1
        }
      }
    }),
  )
  return NextResponse.json({ ok: true, pending, total: subs.length, sent, removed })
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const body = (await req.json().catch(() => null)) as { auto?: unknown } | null
    const autoCount = Math.max(0, Number(body?.auto) || 0)
    return await run(autoCount)
  } catch (err) {
    return NextResponse.json({ error: 'notify failed', detail: String((err as Error)?.message ?? err) }, { status: 500 })
  }
}
