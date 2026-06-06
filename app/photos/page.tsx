// MFH-PHOTOS-PAGE-V1
// 사진 모아보기 — 월별 일지 사진(Signed URL)을 사역 분류별 그리드로. 다중선택 → ZIP 내보내기.
// 캡션(ai_caption)은 Phase 3 Local 루틴이 비전 분석으로 생성. 텍스트·편지 재료 없음(Phase 1 폐기).
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { resolveJournalPhotos } from '@/lib/journalPhotos'
import type { JournalPhoto } from '@/lib/types'
import PhotoGalleryClient, { type PhotoItem } from './PhotoGalleryClient'

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
  place_name: string | null
  photos: JournalPhoto[] | null
  photo_path: string | null
  photo_taken_at: string | null
  photo_lat: number | null
  photo_lng: number | null
  photo_meta: Record<string, unknown> | null
}

export default async function PhotosPage({
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
      'entry_date,category,headline,place_name,photos,photo_path,photo_taken_at,photo_lat,photo_lng,photo_meta',
    )
    .gte('entry_date', start)
    .lte('entry_date', end)
    .order('entry_date', { ascending: true })
  const rows = (data ?? []) as JRow[]

  // 사진 — 일지별 사진(다중) 각각 Signed URL 생성(1시간 만료). photos 우선·레거시 단일 fallback.
  const photos: PhotoItem[] = []
  for (const r of rows) {
    const resolved = resolveJournalPhotos(r)
    for (const ph of resolved) {
      const { data: signed } = await supabase.storage
        .from('journal-photos')
        .createSignedUrl(ph.path, 3600)
      if (signed?.signedUrl) {
        photos.push({
          url: signed.signedUrl,
          path: ph.path,
          date: r.entry_date,
          category: r.category,
          headline: r.headline,
          takenAt: ph.taken_at ? ph.taken_at.slice(0, 10) : null,
          caption: ph.ai_caption,
        })
      }
    }
  }

  return <PhotoGalleryClient month={month} entryCount={rows.length} photos={photos} />
}
