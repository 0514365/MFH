// MFH-FINANCE-PUSH-V1
// 재정 관리자(부부) 웹 푸시 발송 공용 — inbox-notify(일일 수집 요약)·sms-ingest(단축어 실시간) 가 함께 쓴다. 서버 전용.
// 만료 구독(404/410)은 정리한다.
import webpush, { type WebPushError } from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import { FINANCE_MANAGER_IDS } from './members'

type SubRow = { user_id: string; endpoint: string; p256dh: string; auth: string }
export type FinancePush = { title: string; body: string; url: string; badge?: number }

export async function sendFinancePush(
  admin: SupabaseClient,
  msg: FinancePush,
): Promise<{ total: number; sent: number; removed: number }> {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  let subject = process.env.VAPID_SUBJECT || 'mailto:noreply@mfh.app'
  if (!subject.startsWith('mailto:') && !subject.startsWith('http')) subject = `mailto:${subject}`
  if (!pub || !priv) throw new Error('VAPID not configured')
  webpush.setVapidDetails(subject, pub, priv)

  const { data, error } = await admin
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', FINANCE_MANAGER_IDS)
  if (error) throw new Error(error.message)
  const subs = (data ?? []) as SubRow[]
  const payload = JSON.stringify(msg)
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
  return { total: subs.length, sent, removed }
}
