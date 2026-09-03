// MFH-BIBLE-CHECKIN-V1
// 읽음 체크 공용 로직(client) — 홈 카드·/bible 오늘 카드·일정 목록이 같은 규칙으로 저장.
//   · 체크 ON  : done=true, read_on=오늘(온두라스), read_time=지금(HH:MM), read_minutes=예상(글자수÷500)
//   · 체크 OFF : done=false, read_on/read_time/read_minutes=null (은혜·기도제목 연결은 유지)
import type { SupabaseClient } from '@supabase/supabase-js'
import { estimateMinutes } from './plan'

export const HN_TZ = 'America/Tegucigalpa'

export const todayHn = (): string => new Date().toLocaleDateString('en-CA', { timeZone: HN_TZ })

export const nowHm = (): string =>
  new Date().toLocaleTimeString('en-GB', { timeZone: HN_TZ, hour: '2-digit', minute: '2-digit', hour12: false })

export type CheckPayload = {
  done: boolean
  read_on: string | null
  read_time: string | null
  read_minutes: number | null
  updated_at: string
}

export function checkPayload(next: boolean, chars: number): CheckPayload {
  return next
    ? { done: true, read_on: todayHn(), read_time: nowHm(), read_minutes: estimateMinutes(chars), updated_at: new Date().toISOString() }
    : { done: false, read_on: null, read_time: null, read_minutes: null, updated_at: new Date().toISOString() }
}

export async function setDayDone(
  supabase: SupabaseClient,
  dayId: string,
  next: boolean,
  chars: number,
): Promise<{ payload: CheckPayload; error: string | null }> {
  const payload = checkPayload(next, chars)
  const { error } = await supabase.from('reading_plan_days').update(payload).eq('id', dayId)
  return { payload, error: error ? error.message : null }
}

// DB time('HH:MM:SS') → 'HH:MM'
export const hm = (t: string | null | undefined): string => (t ? t.slice(0, 5) : '')

// 'HH:MM' → "오후 9:14"
export function timeKo(t: string | null | undefined): string {
  const v = hm(t)
  if (!v) return ''
  const [hh, mm] = v.split(':')
  const h = Number(hh)
  if (Number.isNaN(h)) return v
  return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${mm}`
}
