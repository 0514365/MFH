// MFH-PRAYER-PAGE-V2
// /p/[slug]/prayer — 공개 방문자 중보기도 폼. 로그인 불필요.
// V2: 로그인한 멤버에겐 상단 OwnerBar(홈 복귀) 표시 — 일반 방문자에겐 숨김.
import { createClient } from '@/lib/supabase-server'
import OwnerBar from '@/components/OwnerBar'
import PrayerForm from './PrayerForm'

export const dynamic = 'force-dynamic'

export default async function PrayerPage({ params }: { params: { slug: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      <OwnerBar userId={user?.id ?? null} />
      <main className="mx-auto max-w-md px-5 py-10">
        <PrayerForm slug={params.slug} />
      </main>
    </>
  )
}
