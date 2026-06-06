// MFH-PUSH-SEND-V1 — 마감 도래 할 일 푸시 발송 (Phase 5b-1)
// 보호: CRON_SECRET(Authorization: Bearer). Vercel cron 이 자동 첨부하며 수동 호출도 동일.
// 동작: service role 로 전체 구독 조회 → 사용자별 "마감 도래 미완료(온두라스 today 기준)" 수 계산
//        → count>0 인 구독에만 "오늘 마감 N건" 발송(0건은 스킵=알림 피로 방지) → 만료 구독 정리.
import { NextResponse } from 'next/server'
import webpush, { type WebPushError } from 'web-push'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HN_TZ = 'America/Tegucigalpa'

type SubRow = { user_id: string; endpoint: string; p256dh: string; auth: string }

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

async function run(): Promise<NextResponse> {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:noreply@mfh.app'
  if (!pub || !priv) return NextResponse.json({ error: 'VAPID not configured' }, { status: 500 })
  webpush.setVapidDetails(subject, pub, priv)

  const admin = createAdminClient()

  // 온두라스 현지 기준 오늘(YYYY-MM-DD)
  const hnToday = new Date().toLocaleDateString('en-CA', { timeZone: HN_TZ })

  const { data, error } = await admin
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const subs = (data ?? []) as SubRow[]
  if (subs.length === 0) return NextResponse.json({ ok: true, sent: 0, note: 'no subscriptions' })

  // 사용자별 마감 도래 미완료 수
  const countByUser = new Map<string, number>()
  for (const uid of Array.from(new Set(subs.map((s) => s.user_id)))) {
    const { count } = await admin
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('done', false)
      .not('due_date', 'is', null)
      .lte('due_date', hnToday)
    countByUser.set(uid, count ?? 0)
  }

  let sent = 0
  let skipped = 0
  let removed = 0
  await Promise.allSettled(
    subs.map(async (s) => {
      const count = countByUser.get(s.user_id) ?? 0
      if (count <= 0) {
        skipped += 1
        return
      }
      const payload = JSON.stringify({
        title: '오늘의 할 일',
        body: `마감 도래 ${count}건이 있습니다.`,
        badge: count,
      })
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        )
        sent += 1
      } catch (err) {
        const status = (err as WebPushError)?.statusCode
        // 만료/취소된 구독 정리
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
          removed += 1
        }
      }
    }),
  )

  return NextResponse.json({ ok: true, today: hnToday, total: subs.length, sent, skipped, removed })
}

export async function GET(req: Request) {
  // 임시 진단(값 비노출, 존재·길이만). 검증 후 제거 예정.
  if (new URL(req.url).searchParams.get('debug') === '1') {
    const s = process.env.CRON_SECRET
    return NextResponse.json({
      hasCronSecret: !!s,
      cronSecretLen: s ? s.length : 0,
      hasVapidPublic: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      hasVapidPrivate: !!process.env.VAPID_PRIVATE_KEY,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      authHeaderReceived: !!req.headers.get('authorization'),
    })
  }
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return run()
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return run()
}
