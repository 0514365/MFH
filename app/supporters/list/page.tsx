// MFH-SUPPORTERS-LIST-PAGE-V1
// 후원자 명단(명단 탭) — 검색·필터 + 후원자 카드 목록(행 클릭→상세). 셸은 ../layout.tsx 담당.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { Supporter } from '@/lib/types'
import { SUPPORTER_PHOTO_BUCKET } from '@/lib/supporters'
import { isMaster } from '@/lib/members'
import SupportersList from '../SupportersList'

export const dynamic = 'force-dynamic'

export default async function SupportersListPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isMaster(user.id)) redirect('/')

  const { data } = await supabase
    .from('supporters')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name', { ascending: true })
  const supporters = (data ?? []) as Supporter[]

  // 프로필 사진 썸네일 signed URL 일괄(1시간). 썸네일 없으면 원본 폴백.
  const photoPaths = Array.from(
    new Set(supporters.map((s) => s.thumb_path || s.photo_path).filter((p): p is string => !!p)),
  )
  const photoUrls: Record<string, string> = {}
  if (photoPaths.length) {
    const { data: signed } = await supabase.storage
      .from(SUPPORTER_PHOTO_BUCKET)
      .createSignedUrls(photoPaths, 3600)
    const byPath: Record<string, string> = {}
    ;(signed ?? []).forEach((s, i) => {
      if (s.signedUrl) byPath[photoPaths[i]] = s.signedUrl
    })
    for (const s of supporters) {
      const key = s.thumb_path || s.photo_path
      if (key && byPath[key]) photoUrls[s.id] = byPath[key]
    }
  }

  return <SupportersList supporters={supporters} photoUrls={photoUrls} currentUserId={user.id} />
}
