import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { canEditEntry, isMaster } from '@/lib/members'
import type { Supporter, SupporterDonation, SupporterLog } from '@/lib/types'
import {
  ageFromBirth,
  formatMoney,
  SUPPORTER_PHOTO_BUCKET,
  extractMessageDraft,
} from '@/lib/supporters'
import { getDonationTotalsByAppId } from '@/lib/notion'
import BackButton from '@/components/BackButton'
import DeleteButton from './DeleteButton'
import DonationPanel from './DonationPanel'
import LogPanel from './LogPanel'
import JournalLinkPanel from './JournalLinkPanel'
import MessageActions from './MessageActions'
import '../../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5">
      <span className="w-16 shrink-0 text-xs font-semibold text-faint">{label}</span>
      <div className="min-w-0 flex-1 text-sm text-ink">{children}</div>
    </div>
  )
}

export default async function SupporterDetail(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isMaster(user.id)) redirect('/')

  const { data } = await supabase.from('supporters').select('*').eq('id', params.id).maybeSingle()
  const s = data as Supporter | null
  if (!s) notFound()
  const canEdit = canEditEntry(s.user_id, user.id)

  const { data: donData } = await supabase
    .from('supporter_donations')
    .select('*')
    .eq('supporter_id', params.id)
    .order('donation_date', { ascending: false })
  const donations = (donData ?? []) as SupporterDonation[]

  // 노션 회계(SoT)의 후원자별 헌금합계 — 미연동(토큰 없음)/실패 시 null → 앱 합계 폴백.
  const notionTotals = await getDonationTotalsByAppId()
  const notionTotal = notionTotals?.get(s.id) ?? null

  const { data: logData } = await supabase
    .from('supporter_logs')
    .select('*')
    .eq('supporter_id', params.id)
    .order('log_date', { ascending: false })
  const logs = (logData ?? []) as SupporterLog[]

  // 연결된 일지(supporter_id=이 후원자) + 연결 후보(supporter_id 없는 최근 일지).
  type JItem = { id: string; entry_date: string; headline: string | null }
  const { data: linkedJ } = await supabase
    .from('journal_entries')
    .select('id, entry_date, headline')
    .eq('supporter_id', params.id)
    .order('entry_date', { ascending: false })
  const linkedJournals = (linkedJ ?? []) as JItem[]
  let candidateJournals: JItem[] = []
  if (canEdit) {
    const { data: candJ } = await supabase
      .from('journal_entries')
      .select('id, entry_date, headline')
      .is('supporter_id', null)
      .order('entry_date', { ascending: false })
      .limit(100)
    candidateJournals = (candJ ?? []) as JItem[]
  }

  const age = ageFromBirth(s.birth_date)

  let photoUrl: string | null = null
  if (s.photo_path) {
    const { data: signed } = await supabase.storage
      .from(SUPPORTER_PHOTO_BUCKET)
      .createSignedUrl(s.photo_path, 3600)
    photoUrl = signed?.signedUrl ?? null
  }

  // 발송 도우미용 AI 초안 — supporter_care 인사이트의 "메시지 초안" 부분.
  const { data: scRow } = await supabase
    .from('insights')
    .select('content')
    .eq('domain', 'supporter_care')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const aiDraft = extractMessageDraft((scRow as { content: string | null } | null)?.content ?? null)

  const meta = [age != null ? `${age}세` : null, s.affiliation, s.role, s.region]
    .filter(Boolean)
    .join(' · ')

  const hasInfo = s.birth_date || s.phone || s.email || s.sns || s.referrer || s.first_met_date

  return (
    <main className="app-theme mx-auto max-w-md pb-10">
      <header
        className="sticky top-0 z-30 border-b border-line px-3 py-3"
        style={{ background: 'var(--paper)' }}
      >
        <div className="flex items-center gap-2">
          <div className="shrink-0">
            <BackButton href="/supporters" label="목록" variant="icon-accent" />
          </div>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-[18px] font-bold leading-tight tracking-tight text-ink">
              {s.name}
            </h1>
          </div>
          <span className="w-10 shrink-0" aria-hidden="true" />
        </div>
      </header>

      {/* 프로필 */}
      <section className="flex flex-col items-center px-5 pb-6 pt-6">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-24 w-24 rounded-full border border-line object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent-soft font-display text-3xl font-bold text-accent">
            {s.name.trim().charAt(0) || '?'}
          </div>
        )}
        <h2 className="mt-3 flex items-center gap-2 text-xl font-bold text-ink">
          {s.name}
          {s.is_recurring && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">정기</span>
          )}
          {!s.is_active && (
            <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-medium text-faint">보관</span>
          )}
        </h2>
        {meta && <p className="mt-1 text-center text-sm text-muted">{meta}</p>}
      </section>

      {/* 기본정보 / 연락처 */}
      {hasInfo && (
        <section className="border-t border-line px-5 py-5">
          <div className="divide-y divide-line">
            {s.birth_date && (
              <InfoRow label="생년월일">
                {s.birth_date}
                {age != null ? ` (${age}세)` : ''}
              </InfoRow>
            )}
            {s.phone && (
              <InfoRow label="전화">
                <a href={`tel:${s.phone}`} className="text-accent">
                  {s.phone}
                </a>
              </InfoRow>
            )}
            {s.email && (
              <InfoRow label="이메일">
                <a href={`mailto:${s.email}`} className="break-all text-accent">
                  {s.email}
                </a>
              </InfoRow>
            )}
            {s.sns && <InfoRow label="SNS">{s.sns}</InfoRow>}
            {s.referrer && <InfoRow label="소개자">{s.referrer}</InfoRow>}
            {s.first_met_date && <InfoRow label="첫 만남">{s.first_met_date}</InfoRow>}
          </div>
        </section>
      )}

      {/* 정기후원 */}
      {s.is_recurring && (
        <section className="border-t border-line px-5 py-5">
          <div className="mb-2 font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
            Recurring
          </div>
          <div className="text-sm text-ink">
            {s.recurring_amount != null ? (
              <span className="font-bold">{formatMoney(s.recurring_amount, s.recurring_currency)}</span>
            ) : (
              '정기후원'
            )}
            {s.recurring_note ? <span className="text-muted"> · {s.recurring_note}</span> : ''}
          </div>
        </section>
      )}

      {/* 주요 기도제목 */}
      {s.prayer_points && (
        <section className="border-t border-line px-5 py-5">
          <div className="mb-2 font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
            Prayer
          </div>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{s.prayer_points}</p>
        </section>
      )}

      {/* 특이사항 */}
      {s.notes && (
        <section className="border-t border-line px-5 py-5">
          <div className="mb-2 font-display text-[9px] font-bold uppercase tracking-[0.15em] text-muted">
            Notes
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{s.notes}</p>
        </section>
      )}

      {/* 연결된 일지 */}
      <JournalLinkPanel
        supporterId={s.id}
        linked={linkedJournals}
        candidates={candidateJournals}
        canEdit={canEdit}
      />

      {/* 관계 히스토리 */}
      <LogPanel supporterId={s.id} initial={logs} canEdit={canEdit} />

      {/* 메시지 발송 */}
      <section className="border-t border-line px-5 py-5">
        <div className="mb-2 font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
          Message
        </div>
        <MessageActions email={s.email} name={s.name} aiDraft={aiDraft} />
      </section>

      {/* 헌금 이력 (읽기전용 — 입력 SoT 는 노션, 합계는 노션 rollup) */}
      <DonationPanel donations={donations} notionTotal={notionTotal} />

      {/* 수정 / 삭제 */}
      {canEdit ? (
        <div className="flex items-center justify-center gap-3 border-t border-line px-5 pb-12 pt-8">
          <Link
            href={`/supporters/${s.id}/edit`}
            className="rounded-full border border-line bg-surface-subtle px-5 py-2 text-[13px] font-medium text-muted transition hover:border-primary"
          >
            수정
          </Link>
          <DeleteButton id={s.id} />
        </div>
      ) : (
        <p className="border-t border-line px-5 pb-12 pt-8 text-center text-xs text-faint">
          다른 멤버님이 등록한 후원자입니다. 보기만 가능합니다.
        </p>
      )}
    </main>
  )
}
