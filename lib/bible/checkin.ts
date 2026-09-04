// MFH-BIBLE-CHECKIN-V3
// 읽음 체크 공용 로직(client) — 홈 카드·/bible 오늘 카드·일정 목록이 같은 규칙으로 저장.
//   · 체크 ON  : done=true. 기록이 비어 있을 때만 read_on=오늘(온두라스)·read_time=지금·read_minutes=예상(방법별 속도) 자동 입력.
//                이미 기록이 있으면(다시 체크) 최초 완료 기록 보존 — 사용자가 직접 바꿀 때만 변경.
//   · 체크 OFF : done=false 만. 기록·은혜·기도제목 연결·통독 방법 모두 유지.
//   · 통독 방법(patch104): aloud 낭독 / audio 오디오 듣기 / aloud_audio 낭독+듣기. 미선택 = 묵독 속도.
import type { SupabaseClient } from '@supabase/supabase-js'
import { CHARS_PER_MINUTE } from './plan'

export const HN_TZ = 'America/Tegucigalpa'

export const todayHn = (): string => new Date().toLocaleDateString('en-CA', { timeZone: HN_TZ })

export const nowHm = (): string =>
  new Date().toLocaleTimeString('en-GB', { timeZone: HN_TZ, hour: '2-digit', minute: '2-digit', hour12: false })

export type ReadMethod = 'aloud' | 'audio' | 'aloud_audio'

// 낭독·오디오 ≈ 280자/분(README 7절: 오디오 성경 전체 ≈ 81시간). 미선택(묵독) = 500자/분.
export const READ_METHODS: { value: ReadMethod; label: string; short: string; cpm: number }[] = [
  { value: 'aloud', label: '낭독', short: '낭독', cpm: 280 },
  { value: 'audio', label: '오디오 듣기', short: '듣기', cpm: 280 },
  { value: 'aloud_audio', label: '낭독 + 듣기', short: '낭독+듣기', cpm: 280 },
]
export const methodLabel = (m: ReadMethod | null | undefined, short = false): string => {
  const f = READ_METHODS.find((x) => x.value === m)
  return f ? (short ? f.short : f.label) : ''
}

// 방법별 예상 소요 분.
export function estimateByMethod(chars: number, method: ReadMethod | null | undefined): number {
  const cpm = READ_METHODS.find((x) => x.value === method)?.cpm ?? CHARS_PER_MINUTE
  return Math.max(1, Math.round(chars / cpm))
}

export type CheckPayload = {
  done: boolean
  read_on: string | null
  read_time: string | null
  read_minutes: number | null
  updated_at: string
}

// 체크 대상 행의 기존 기록(있으면 보존).
export type CheckTarget = {
  id: string
  chars: number
  read_on?: string | null
  read_time?: string | null
  read_minutes?: number | null
  read_method?: ReadMethod | null
}

// ON: 기존 기록이 있으면 그대로(최초 완료 시각 보존), 없을 때만 오늘·지금·예상값 자동 입력.
// OFF: done 만 false — 기록(날·시각·분)은 지우지 않아 다시 체크해도 처음 값이 남는다.
export function checkPayload(next: boolean, t: CheckTarget): CheckPayload {
  const updated_at = new Date().toISOString()
  if (!next) {
    return { done: false, read_on: t.read_on ?? null, read_time: t.read_time ? hm(t.read_time) : null, read_minutes: t.read_minutes ?? null, updated_at }
  }
  return {
    done: true,
    read_on: t.read_on ?? todayHn(),
    read_time: t.read_time ? hm(t.read_time) : nowHm(),
    read_minutes: t.read_minutes ?? estimateByMethod(t.chars, t.read_method),
    updated_at,
  }
}

export async function setDayDone(
  supabase: SupabaseClient,
  target: CheckTarget,
  next: boolean,
): Promise<{ payload: CheckPayload; error: string | null }> {
  const payload = checkPayload(next, target)
  const { error } = await supabase.from('reading_plan_days').update(payload).eq('id', target.id)
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
