// MFH-QT-NOTIFY-ROUTE-V1 — 오늘 QT 가 있으면 구독자에게 푸시 발송. Vercel cron(매일) 호출, CRON_SECRET 보호.
// 할일 send 라우트(app/api/push/send)와 동일 패턴. VAPID 는 Vercel 런타임 환경변수(Sensitive 도 서버에선 사용 가능).
// 오늘(온두라스 현지) daily_qt 없으면 스킵(알림 피로 방지). 만료(404/410) 구독은 정리.
import { NextResponse } from 'next/server'
import webpush, { type WebPushError } from 'web-push'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HN_TZ = 'America/Tegucigalpa'

type SubRow = { endpoint: string; p256dh: string; auth: string }

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

async function run(): Promise<NextResponse> {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  let subject = process.env.VAPID_SUBJECT || 'mailto:noreply@mfh.app'
  if (!subject.startsWith('mailto:') && !subject.startsWith('http')) subject = `mailto:${subject}`
  if (!pub || !priv) return NextResponse.json({ error: 'VAPID not configured' }, { status: 500 })
  webpush.setVapidDetails(subject, pub, priv)

  const admin = createAdminClient()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: HN_TZ })

  // 오늘 QT 있는지(없으면 발송 스킵).
  const { data: qt } = await admin
    .from('daily_qt')
    .select('passage,key_verse')
    .eq('qt_date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!qt) return NextResponse.json({ ok: true, today, sent: 0, note: 'no QT today' })

  const passage = (qt.passage ?? {}) as { book?: string; range?: string; title?: string }
  const keyVerse = (qt.key_verse ?? {}) as { summary?: string }
  const title = (passage.title ?? '').trim()
  const bookRange = [passage.book, passage.range].filter(Boolean).join(' ').trim()
  const summary = (keyVerse.summary ?? '').trim()
  const bodyText =
    (title ? `${title}${bookRange ? ` · ${bookRange}` : ''}` : summary || bookRange) ||
    '오늘의 말씀 묵상이 준비됐습니다.'

  const { data, error } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const subs = (data ?? []) as SubRow[]
  if (subs.length === 0) return NextResponse.json({ ok: true, today, sent: 0, note: 'no subscriptions' })

  const payload = JSON.stringify({
    title: '오늘의 QT가 준비됐어요',
    body: bodyText.slice(0, 120),
    url: '/qt',
    tag: 'mfh-qt',
  })

  let sent = 0
  let removed = 0
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        )
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
  return NextResponse.json({ ok: true, today, total: subs.length, sent, removed })
}

async function runSafe(): Promise<NextResponse> {
  try {
    return await run()
  } catch (err) {
    return NextResponse.json(
      { error: 'notify failed', detail: String((err as Error)?.message ?? err) },
      { status: 500 },
    )
  }
}

// Vercel cron 이 매일 호출(GET, CRON_SECRET 자동 첨부).
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return runSafe()
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return runSafe()
}
