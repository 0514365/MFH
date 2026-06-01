// MFH-INSIGHT-EXPORT-API-V1
// GET /api/insights/export?domain=overall&days=30
//  → 세션 RLS 조회 → buildDataMarkdown + (수동 안내문) → text/markdown 반환.
// claude.ai(Max)에 업로드해 분석하는 무료 경로. API 호출 없음(Anthropic 미사용).
import { createClient } from '@/lib/supabase-server'
import {
  buildDataMarkdown,
  domainNeeds,
  isValidDomain,
  periodStart,
  todayStr,
  type InsightDomain,
  type ExportData,
} from '@/lib/insightExport'
import { buildManualInstruction } from '@/lib/insightPrompt'
import { IMPORT_FORMAT_GUIDE } from '@/lib/insightImport'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('인증이 필요합니다.', { status: 401 })

  const url = new URL(req.url)
  const domain = (url.searchParams.get('domain') ?? 'overall') as InsightDomain
  if (!isValidDomain(domain)) return new Response('알 수 없는 분야입니다.', { status: 400 })
  const daysRaw = Number(url.searchParams.get('days'))
  const days = [7, 30, 90].includes(daysRaw) ? daysRaw : 30
  const pStart = periodStart(days)
  const pEnd = todayStr()

  const need = domainNeeds(domain)

  const data: ExportData = { domain, periodDays: days, periodStart: pStart, periodEnd: pEnd }
  if (need.journal) {
    const { data: rows } = await supabase
      .from('journal_entries')
      .select(
        'entry_date,category,headline,today,thanks,meditation,prayer,prayer_candidate,place_name'
      )
      .gte('entry_date', pStart)
      .lte('entry_date', pEnd)
      .order('entry_date', { ascending: true })
    data.journals = rows ?? []
  }
  if (need.project) {
    const { data: rows } = await supabase
      .from('projects')
      .select('title,description,status,importance,start_date,due_date,category')
      .order('due_date', { ascending: true })
    data.projects = rows ?? []
  }
  if (need.task) {
    const { data: rows } = await supabase
      .from('tasks')
      .select('title,description,status,done,importance,due_date,due_time,category')
      .order('due_date', { ascending: true })
    data.tasks = rows ?? []
  }

  const md = `${buildManualInstruction(domain)}\n\n${IMPORT_FORMAT_GUIDE}\n\n---\n\n${buildDataMarkdown(data)}`
  const filename = `mfh-${domain}-${pEnd}.md`
  return new Response(md, {
    status: 200,
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  })
}
