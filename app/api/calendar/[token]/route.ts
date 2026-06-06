// MFH-ICS-FEED-V1
// 구독형 캘린더 피드: GET /api/calendar/<token> → text/calendar (ICS).
// 토큰만으로 anon RPC(get_calendar_feed) 호출 → 해당 사용자 일정 반환.
import { createClient } from '@/lib/supabase-server'
import { buildICS, type IcsEvent } from '@/lib/ics'
import { fmtTime } from '@/lib/calendar'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type FeedRow = {
  kind: 'project' | 'task'
  id: string
  title: string
  start_date: string | null
  end_date: string | null
  due_time: string | null
  status: string | null
  done: boolean | null
}

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const params = await ctx.params
  // 생성 시각(UTC) → DTSTAMP 'YYYYMMDDTHHMMSSZ'
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  let events: IcsEvent[] = []
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_calendar_feed', { p_token: params.token })
    if (!error && Array.isArray(data)) {
      events = (data as FeedRow[])
        .map((r): IcsEvent | null => {
          if (r.kind === 'project') {
            const a = r.start_date ?? r.end_date
            const b = r.end_date ?? r.start_date
            if (!a || !b) return null
            const start = a <= b ? a : b
            const end = a <= b ? b : a
            return { uid: `project-${r.id}@mfh`, summary: r.title, start, end }
          }
          // task
          if (!r.start_date) return null
          const time = r.due_time ? `[${fmtTime(r.due_time)}] ` : ''
          return { uid: `task-${r.id}@mfh`, summary: `${time}${r.title}`, start: r.start_date, end: r.start_date }
        })
        .filter((e): e is IcsEvent => e !== null)
    }
  } catch (err) {
    console.error('calendar feed failed', err)
  }

  const ics = buildICS(events, { calName: 'MFH 일정', dtstamp })
  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="mfh.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
