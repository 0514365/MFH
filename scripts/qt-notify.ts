// MFH-QT-NOTIFY-V1
// 오늘 daily_qt 가 있으면 push_subscriptions 구독자에게 "오늘의 QT" 푸시 발송. 06:00 cron(scheduled-tasks)이 실행.
//   · 오늘(온두라스 현지) QT 없으면 스킵(알림 피로 방지). 만료(404/410) 구독은 정리.
//   · VAPID 키는 .env.local: NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT (Vercel 환경변수에서 복사).
//   · 발송은 service role 로 전체 구독 조회(send/route.ts 와 동일 패턴).
// 사용:  npx tsx scripts/qt-notify.ts
// ⚠ repo 루트에서 실행(.env.local 경로가 process.cwd() 기준).
import webpush, { type WebPushError } from 'web-push'
import { loadEnv, createServiceClient } from './_shared'

const HN_TZ = 'America/Tegucigalpa'

type SubRow = { endpoint: string; p256dh: string; auth: string }
type QtRow = {
  passage: { book?: string; range?: string; title?: string } | null
  key_verse: { summary?: string } | null
}

async function main() {
  const env = loadEnv()
  const pub = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = env.VAPID_PRIVATE_KEY
  let subject = env.VAPID_SUBJECT || 'mailto:noreply@mfh.app'
  if (!subject.startsWith('mailto:') && !subject.startsWith('http')) subject = `mailto:${subject}`
  if (!pub || !priv) {
    console.error(
      'VAPID 키 누락 — .env.local 에 NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY 를 추가하세요(Vercel 환경변수에서 복사).',
    )
    process.exit(1)
  }
  webpush.setVapidDetails(subject, pub, priv)

  const sb = createServiceClient(env)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: HN_TZ })

  // 오늘 QT 있는지(없으면 발송 스킵).
  const { data: qt } = await sb
    .from('daily_qt')
    .select('passage,key_verse')
    .eq('qt_date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!qt) {
    console.log(`[qt-notify] ${today} QT 없음 — 발송 스킵`)
    return
  }
  const row = qt as QtRow
  const passage = row.passage ?? {}
  const title = (passage.title ?? '').trim()
  const bookRange = [passage.book, passage.range].filter(Boolean).join(' ').trim()
  const summary = (row.key_verse?.summary ?? '').trim()

  const { data: subs } = await sb.from('push_subscriptions').select('endpoint,p256dh,auth')
  const list = (subs ?? []) as SubRow[]
  if (list.length === 0) {
    console.log('[qt-notify] 구독 없음 — 발송 스킵')
    return
  }

  const bodyText =
    (title ? `${title}${bookRange ? ` · ${bookRange}` : ''}` : summary || bookRange) ||
    '오늘의 말씀 묵상이 준비됐습니다.'
  const payload = JSON.stringify({
    title: '오늘의 QT가 준비됐어요',
    body: bodyText.slice(0, 120),
    url: '/qt',
    tag: 'mfh-qt',
  })

  let sent = 0
  let removed = 0
  await Promise.allSettled(
    list.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        )
        sent += 1
      } catch (err) {
        const status = (err as WebPushError)?.statusCode
        if (status === 404 || status === 410) {
          await sb.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
          removed += 1
        }
      }
    }),
  )
  console.log(`[qt-notify] ${today} 발송 ✓ ${bookRange || title} · 발송 ${sent} · 정리 ${removed}`)
}

main().catch((e) => {
  console.error('[qt-notify] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
