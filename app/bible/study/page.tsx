// MFH-BIBLE-STUDY-PAGE-V1 — /bible/study?ref=요 3:16 — 성경 읽기·단어 검색·번역 비교(LOGOS 식 2패널). 서버 껍데기.
// 로그인 필수. 초기 버전 = 쿠키 bible_ver(통독·QT 와 공유). ?ref 가 있으면 그 구절로 시작(없으면 기기 저장 상태 → 요한복음 1장).
// 본문·검색은 클라이언트가 /api/bible/chapter · /api/bible/search 로 조회(멤버 RLS).
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { BIBLE_VERSION_COOKIE, parseBibleVersion } from '@/lib/bible/texts'
import { parseRefInput } from '@/lib/bible/ref'
import StudyClient from './StudyClient'
import '../../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

export default async function BibleStudyPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { ref } = await searchParams
  const initialVer = parseBibleVersion((await cookies()).get(BIBLE_VERSION_COOKIE)?.value)
  const initialLoc = ref ? parseRefInput(ref) : null
  return <StudyClient initialVer={initialVer} initialLoc={initialLoc} />
}
