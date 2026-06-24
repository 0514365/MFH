// MFH-PHOTOS-PAGE-V1
// 사진 모아보기 — 월별 일지 사진(Signed URL)을 사역 분류별 그리드로. 다중선택 → ZIP 내보내기.
// 캡션(ai_caption)은 Phase 3 Local 루틴이 비전 분석으로 생성. 텍스트·편지 재료 없음(Phase 1 폐기).
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { resolveJournalPhotos, type ResolvedPhoto } from '@/lib/journalPhotos'
import { isImageAttachment, taskAttachmentDate, projectAttachmentDate } from '@/lib/attachments'
import type { JournalPhoto, Attachment } from '@/lib/types'
import PageHeader from '@/components/PageHeader'
import PhotoGalleryClient, { type PhotoItem } from './PhotoGalleryClient'
import '../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number)
  const start = `${month}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${month}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

type JRow = {
  id: string
  user_id: string
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

export default async function PhotosPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
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
      'id,user_id,entry_date,category,headline,place_name,photos,photo_path,photo_taken_at,photo_lat,photo_lng,photo_meta',
    )
    .gte('entry_date', start)
    .lte('entry_date', end)
    .order('entry_date', { ascending: true })
  const rows = (data ?? []) as JRow[]

  // 사진 — 일지별 사진(다중)의 원본+썸네일 경로를 한 번에 Signed URL(1시간). photos 우선·레거시 단일 fallback.
  // 그리드는 thumbUrl(썸네일), 라이트박스·ZIP 은 url(원본)을 쓴다.
  const photos: PhotoItem[] = []
  const flatJ: { ph: ResolvedPhoto; r: JRow }[] = []
  for (const r of rows) {
    for (const ph of resolveJournalPhotos(r)) flatJ.push({ ph, r })
  }
  const jPaths = Array.from(
    new Set(flatJ.flatMap(({ ph }) => (ph.thumb_path ? [ph.path, ph.thumb_path] : [ph.path]))),
  )
  const jUrl: Record<string, string> = {}
  if (jPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from('journal-photos')
      .createSignedUrls(jPaths, 3600)
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) jUrl[s.path] = s.signedUrl
    }
  }
  for (const { ph, r } of flatJ) {
    const url = jUrl[ph.path]
    if (!url) continue
    const thumbUrl = ph.thumb_path ? (jUrl[ph.thumb_path] ?? url) : url
    photos.push({
      url,
      thumbUrl,
      path: ph.path,
      date: r.entry_date,
      category: r.category,
      headline: r.headline,
      takenAt: ph.taken_at ? ph.taken_at.slice(0, 10) : null,
      // 표시 캡션 = 수동 우선 → AI. 편집은 수동(manualCaption)만 다룬다.
      caption: ph.caption ?? ph.ai_caption,
      manualCaption: ph.caption,
      aiCaption: ph.ai_caption,
      source: 'journal',
      rowId: r.id,
      sourceTitle: null,
      ownerId: r.user_id,
    })
  }

  // 할 일·프로젝트 첨부 이미지(PDF·기타 제외) — 같은 달에 귀속되는 것만 사진모음에 합류.
  // 첨부엔 촬영일이 없어 출처 행의 날짜(taskAttachmentDate/projectAttachmentDate)로 월 귀속.
  type AttRow = {
    id: string
    user_id: string
    title: string | null
    category: string | null
    attachments: Attachment[] | null
    due_date?: string | null
    completed_at?: string | null
    start_date?: string | null
    created_at?: string | null
  }
  async function collectAttachmentPhotos(
    table: 'tasks' | 'projects',
    source: 'task' | 'project',
    rowDate: (row: AttRow) => string | null,
  ) {
    const dateCols = table === 'tasks' ? 'due_date,completed_at,created_at' : 'due_date,start_date,created_at'
    const { data: arows } = await supabase
      .from(table)
      .select(`id,user_id,title,category,attachments,${dateCols}`)
      .not('attachments', 'is', null)
    // (첨부, 행, 귀속날짜) 펼치기 — 이달 이미지 첨부만.
    const flat: { att: Attachment; row: AttRow; date: string }[] = []
    for (const row of (arows ?? []) as AttRow[]) {
      const date = rowDate(row)
      if (!date || date.slice(0, 7) !== month) continue
      for (const a of row.attachments ?? []) {
        if (a?.path && isImageAttachment(a)) flat.push({ att: a, row, date })
      }
    }
    if (!flat.length) return
    const { data: signed } = await supabase.storage
      .from('attachments')
      .createSignedUrls(
        flat.map((f) => f.att.path),
        3600,
      )
    ;(signed ?? []).forEach((s, i) => {
      if (!s.signedUrl) return
      const { att, row, date } = flat[i]
      photos.push({
        url: s.signedUrl,
        thumbUrl: s.signedUrl,
        path: att.path,
        date,
        category: row.category,
        headline: row.title,
        takenAt: null,
        caption: att.caption ?? att.ai_caption ?? null,
        manualCaption: att.caption ?? null,
        aiCaption: att.ai_caption ?? null,
        source,
        rowId: row.id,
        sourceTitle: row.title,
        ownerId: row.user_id,
      })
    })
  }
  await collectAttachmentPhotos('tasks', 'task', taskAttachmentDate)
  await collectAttachmentPhotos('projects', 'project', projectAttachmentDate)

  return (
    <main className="app-theme mx-auto max-w-2xl px-5 pb-8">
      <PageHeader title="Photos" current="photos" />
      <PhotoGalleryClient
        month={month}
        entryCount={rows.length}
        photos={photos}
        currentUserId={user.id}
      />
    </main>
  )
}
