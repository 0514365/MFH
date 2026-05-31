// MFH-PRAYER-PAGE-V1
// /p/[slug]/prayer — 공개 방문자 중보기도 폼. 로그인 불필요.
import PrayerForm from './PrayerForm'

export const dynamic = 'force-dynamic'

export default function PrayerPage({ params }: { params: { slug: string } }) {
  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <PrayerForm slug={params.slug} />
    </main>
  )
}
