// MFH-LETTER-MATERIALS-PAGE-V1
// 편지 재료 내보내기 — 그달 일지(텍스트) + 사진(Signed URL)을 모아 선교편지 재료로.
// 텍스트는 buildDataMarkdown 재활용(무료, Anthropic 미사용). 사진은 journal-photos Signed URL.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { buildDataMarkdown } from '@/lib/insightExport'
import LetterMaterialsClient, { type PhotoItem } from './LetterMaterialsClient'

export const dynamic = 'force-dynamic'

function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number)
  const start = `${month}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${month}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

type JRow = {
  entry_date: string | null
  category: string | null
  headline: string | null
  today: string | null
  thanks: string | null
  meditation: string | null
  prayer: string | null
  prayer_candidate: boolean | null
  place_name: string | null
  photo_path: string | null
  photo_taken_at: string | null
}

export default async function LetterMaterialsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthParam = searchParams.month
  const monthRaw = Array.isArray(monthParam) ? monthParam[0] : monthParam
  const month = monthRaw && /^\d{4}-\d{2}$/.test(monthRaw) ? monthRaw : defaultMonth
  const { start, end } = monthRange(month)

  const { data } = await supabase
    .from('journal_entries')
    .select(
      'entry_date,category,headline,today,thanks,meditation,prayer,prayer_candidate,place_name,photo_path,photo_taken_at',
    )
    .gte('entry_date', start)
    .lte('entry_date', end)
    .order('entry_date', { ascending: true })
  const rows = (data ?? []) as JRow[]

  // 텍스트 재료(일지 블록) — 기존 직렬화 재활용.
  const markdown = buildDataMarkdown({
    domain: 'journal',
    periodDays: 30,
    periodStart: start,
    periodEnd: end,
    journals: rows.map((r) => ({
      entry_date: r.entry_date,
      category: r.category,
      headline: r.headline,
      today: r.today,
      thanks: r.thanks,
      meditation: r.meditation,
      prayer: r.prayer,
      prayer_candidate: r.prayer_candidate,
      place_name: r.place_name,
    })),
  })

  // 사진 — photo_path 있는 일지만 Signed URL 생성(1시간 만료).
  const photos: PhotoItem[] = []
  for (const r of rows) {
    if (!r.photo_path) continue
    const { data: signed } = await supabase.storage
      .from('journal-photos')
      .createSignedUrl(r.photo_path, 3600)
    if (signed?.signedUrl) {
      photos.push({
        url: signed.signedUrl,
        date: r.entry_date,
        category: r.category,
        headline: r.headline,
        takenAt: r.photo_taken_at ? r.photo_taken_at.slice(0, 10) : null,
      })
    }
  }

  return (
    <LetterMaterialsClient
      month={month}
      entryCount={rows.length}
      markdown={markdown}
      photos={photos}
    />
  )
}
