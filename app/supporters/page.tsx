import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import type { Supporter } from '@/lib/types'
import { SUPPORTER_PHOTO_BUCKET, formatUsd } from '@/lib/supporters'
import SupportersList from './SupportersList'
import '../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

export default async function SupportersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('supporters')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name', { ascending: true })
  const supporters = (data ?? []) as Supporter[]

  // 후원자별 헌금 USD 합계 — 목록 카드 표기용.
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })
  const yearStr = today.slice(0, 4)
  const ymStr = today.slice(0, 7)

  const { data: donRows } = await supabase
    .from('supporter_donations')
    .select('supporter_id, amount_usd, donation_date')
  const totals: Record<string, number> = {}
  let yearUsd = 0
  let monthUsd = 0
  for (const d of (donRows ?? []) as {
    supporter_id: string
    amount_usd: number
    donation_date: string
  }[]) {
    const v = Number(d.amount_usd) || 0
    totals[d.supporter_id] = (totals[d.supporter_id] ?? 0) + v
    if (d.donation_date?.startsWith(yearStr)) yearUsd += v
    if (d.donation_date?.startsWith(ymStr)) monthUsd += v
  }
  yearUsd = Math.round(yearUsd * 100) / 100
  monthUsd = Math.round(monthUsd * 100) / 100
  const activeCount = supporters.filter((s) => s.is_active).length
  const recurringCount = supporters.filter((s) => s.is_active && s.is_recurring).length

  // 프로필 사진 썸네일 signed URL 일괄(1시간). 썸네일 없으면 원본 폴백.
  const photoPaths = Array.from(
    new Set(
      supporters.map((s) => s.thumb_path || s.photo_path).filter((p): p is string => !!p),
    ),
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

  return (
    <main className="app-theme mx-auto max-w-md px-5 pb-8 min-[740px]:max-w-5xl">
      <PageHeader
        title="Supporters"
        action={
          <Link
            href="/supporters/new"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            + Supporter
          </Link>
        }
      />

      {supporters.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2.5 min-[740px]:grid-cols-4">
          <div className="rounded-2xl bg-surface-subtle p-3.5">
            <div className="text-[11px] text-muted">후원자</div>
            <div className="mt-1 font-display text-[20px] font-bold text-ink">
              {activeCount}
              <span className="ml-0.5 text-[12px] font-medium text-muted">명</span>
            </div>
          </div>
          <div className="rounded-2xl bg-surface-subtle p-3.5">
            <div className="text-[11px] text-muted">정기후원</div>
            <div className="mt-1 font-display text-[20px] font-bold text-ink">
              {recurringCount}
              <span className="ml-0.5 text-[12px] font-medium text-muted">명</span>
            </div>
          </div>
          <div className="rounded-2xl bg-surface-subtle p-3.5">
            <div className="text-[11px] text-muted">올해 누계</div>
            <div className="mt-1 font-display text-[18px] font-bold text-ink">{formatUsd(yearUsd)}</div>
          </div>
          <div className="rounded-2xl bg-surface-subtle p-3.5">
            <div className="text-[11px] text-muted">이번 달</div>
            <div className="mt-1 font-display text-[18px] font-bold text-ink">{formatUsd(monthUsd)}</div>
          </div>
        </div>
      )}

      <SupportersList
        supporters={supporters}
        totals={totals}
        photoUrls={photoUrls}
        currentUserId={user.id}
      />
    </main>
  )
}
