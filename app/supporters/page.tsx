import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import type { Supporter, SupporterDonation } from '@/lib/types'
import { SUPPORTER_PHOTO_BUCKET, formatUsd } from '@/lib/supporters'
import { isMaster } from '@/lib/members'
import SupportersList from './SupportersList'
import DomainInsightPanel from '@/app/insights/DomainInsightPanel'
import BulkMailButton from './BulkMailButton'
import SupportersExport from './SupportersExport'
import '../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

export default async function SupportersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  // 후원자 메뉴는 공개 전까지 우진(마스터)만 접근.
  if (!isMaster(user.id)) redirect('/')

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
    .select('*')
    .order('donation_date', { ascending: false })
  const donations = (donRows ?? []) as SupporterDonation[]
  let yearUsd = 0
  let monthUsd = 0
  for (const d of donations) {
    const v = Number(d.amount_usd) || 0
    if (d.donation_date?.startsWith(yearStr)) yearUsd += v
    if (d.donation_date?.startsWith(ymStr)) monthUsd += v
  }
  yearUsd = Math.round(yearUsd * 100) / 100
  monthUsd = Math.round(monthUsd * 100) / 100
  const activeCount = supporters.filter((s) => s.is_active).length
  const recurringCount = supporters.filter((s) => s.is_active && s.is_recurring).length

  // 통합 발송 대상 — 활성 + 이메일 보유 후원자 주소.
  const mailRecipients = supporters
    .filter((s) => s.is_active && s.email && s.email.trim())
    .map((s) => (s.email as string).trim())

  // 이번 달 생일(활성 후원자, birth_date 의 월이 이번 달). 일(day) 오름차순.
  const thisMonth = ymStr.slice(5, 7)
  const birthdays = supporters
    .filter((s) => s.is_active && s.birth_date && s.birth_date.slice(5, 7) === thisMonth)
    .map((s) => ({ name: s.name, date: s.birth_date as string }))
    .sort((a, b) => a.date.slice(8, 10).localeCompare(b.date.slice(8, 10)))

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

      {birthdays.length > 0 && (
        <div className="mb-4 flex items-center gap-2.5 rounded-2xl bg-accent-soft px-4 py-3">
          <span className="shrink-0 text-accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="8" width="18" height="4" rx="1" />
              <path d="M12 8v13" />
              <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
              <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8" />
              <path d="M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" />
            </svg>
          </span>
          <div className="text-sm text-ink">
            <span className="font-semibold">이번 달 생일</span>
            <span className="text-muted">
              {' · '}
              {birthdays.map((b) => `${b.name}(${Number(b.date.slice(8, 10))}일)`).join(', ')}
            </span>
          </div>
        </div>
      )}

      {supporters.length > 0 && <DomainInsightPanel domain="supporter_care" />}

      <BulkMailButton emails={mailRecipients} />

      {supporters.length > 0 && <SupportersExport supporters={supporters} donations={donations} />}

      <SupportersList
        supporters={supporters}
        photoUrls={photoUrls}
        currentUserId={user.id}
      />
    </main>
  )
}
