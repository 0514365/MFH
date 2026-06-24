// MFH-FB-PAGE-V1
// 주간 Facebook 게시 추천 — 최신 1주차의 게시안(문구+추천사진+해시태그)을 카드로 표시.
// 데이터 생성 = Claude Code /fb-update (weekly_fb 저장). 이 페이지는 읽기·복사 전용(게시는 우진 수동).
// 사진은 journal-photos(비공개 버킷)라 createSignedUrl(1시간)로 변환해 전달.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import FacebookClient, { type FbPostView } from './FacebookClient'
import '../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

type FbPhoto = { path: string; caption?: string | null }
type FbPost = { text: string; photos?: FbPhoto[]; hashtags?: string[]; rationale?: string | null }
type WeeklyRow = { week_start: string; week_end: string; posts: FbPost[]; created_at: string }

export default async function FacebookPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 최신 주차 1건(멤버 RLS 통과). 없으면 null → 빈 상태.
  const { data } = await supabase
    .from('weekly_fb')
    .select('week_start,week_end,posts,created_at')
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle()
  const row = data as WeeklyRow | null

  // 각 게시안의 사진 path → Signed URL. 실패 시 url=null(카드에서 숨김).
  let posts: FbPostView[] = []
  if (row && Array.isArray(row.posts)) {
    posts = await Promise.all(
      row.posts.map(async (p) => {
        const photos = await Promise.all(
          (Array.isArray(p.photos) ? p.photos : []).map(async (ph) => {
            const { data: signed } = await supabase.storage
              .from('journal-photos')
              .createSignedUrl(ph.path, 3600)
            return { path: ph.path, caption: ph.caption ?? null, url: signed?.signedUrl ?? null }
          }),
        )
        return {
          text: typeof p.text === 'string' ? p.text : '',
          hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
          rationale: p.rationale ?? null,
          photos,
        }
      }),
    )
  }

  return (
    <main className="app-theme mx-auto max-w-2xl px-5 pb-8">
      <PageHeader title="Facebook" />
      <FacebookClient
        weekStart={row?.week_start ?? null}
        weekEnd={row?.week_end ?? null}
        generatedAt={row?.created_at ?? null}
        posts={posts}
      />
    </main>
  )
}
