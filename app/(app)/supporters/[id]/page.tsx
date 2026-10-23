// MFH-SUPPORTERS-2027 (page.tsx) — 4-7: 2027 토큰.
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { canManageFinance } from '@/lib/members'
import type { Supporter, SupporterLog } from '@/lib/types'
import {
  ageFromBirth,
  formatMoney,
  SUPPORTER_PHOTO_BUCKET,
  extractMessageDraft,
} from '@/lib/supporters'
import { getDonationsByAppId } from '@/lib/accounting-db'
import DeleteButton from './DeleteButton'
import DonationPanel from './DonationPanel'
import LogPanel from './LogPanel'
import JournalLinkPanel from './JournalLinkPanel'
import MessageActions from './MessageActions'

export const dynamic = 'force-dynamic'

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5">
      <span className="w-16 shrink-0 text-xs font-semibold text-b27-muted">{label}</span>
      <div className="min-w-0 flex-1 text-sm text-b27-ink">{children}</div>
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
  if (!canManageFinance(user.id)) redirect('/')

  const { data } = await supabase.from('supporters').select('*').eq('id', params.id).maybeSingle()
  const s = data as Supporter | null
  if (!s) notFound()
  const canEdit = canManageFinance(user.id)

  // 장부(acct_inout)의 후원자별 헌금 연도별 집계 — 실패 시 null → "기록 없음".
  const donationsByApp = await getDonationsByAppId()
  const yearly = donationsByApp?.get(s.id) ?? null

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
    <div className="-mx-4 pb-6 @2xl:-mx-6">
      <div className="mx-auto max-w-md">
      {/* 프로필 */}
      <section className="flex items-center gap-4 px-5 pb-5 pt-2">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-b27-tint-3 text-[22px] font-semibold text-[#855000]">
            {s.name.trim().charAt(0) || '?'}
          </div>
        )}
        <div className="min-w-0">
        <h2 className="flex flex-wrap items-center gap-2 text-[21px] font-semibold text-b27-ink">
          {s.name}
          {s.is_recurring && (
            <span className="rounded-full bg-b27-tint-3 px-2 py-0.5 text-[11px] font-medium text-[#855000]">정기</span>
          )}
          {!s.is_active && (
            <span className="rounded-full bg-b27-card px-2 py-0.5 text-[11px] font-medium text-b27-muted">보관</span>
          )}
        </h2>
        {meta && <p className="mt-1 font-num text-[12.5px] text-b27-muted">{meta}</p>}
        </div>
      </section>

      {/* 기본정보 / 연락처 */}
      {hasInfo && (
        <section className="px-5 pb-4">
          <div className="divide-y divide-b27-line">
            {s.birth_date && (
              <InfoRow label="생년월일">
                {s.birth_date}
                {age != null ? ` (${age}세)` : ''}
              </InfoRow>
            )}
            {s.phone && (
              <InfoRow label="전화">
                <a href={`tel:${s.phone}`} className="text-b27-ink underline decoration-b27-line underline-offset-2">
                  {s.phone}
                </a>
              </InfoRow>
            )}
            {s.email && (
              <InfoRow label="이메일">
                <a href={`mailto:${s.email}`} className="break-all text-b27-ink underline decoration-b27-line underline-offset-2">
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
        <section className="mx-5 mb-4 rounded-2xl bg-b27-tint-3 px-4 py-3.5">
          <div className="mb-1 flex items-center gap-1.5 font-num text-[12px] font-medium text-[#855000]">
            <span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-3" aria-hidden="true" />
            정기후원
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-b27-ink">
            {s.recurring_amount != null ? (
              <span className="font-num text-[24px] font-semibold tabular-nums">{formatMoney(s.recurring_amount, s.recurring_currency)}</span>
            ) : (
              <span className="text-[15px] font-medium">정기후원</span>
            )}
            {s.recurring_note ? <span className="text-[12.5px] text-[#855000]">{s.recurring_note}</span> : ''}
          </div>
        </section>
      )}

      {/* 주요 기도제목 */}
      {s.prayer_points && (
        <section className="mx-5 mb-4 rounded-2xl bg-b27-tint-7 px-4 py-3.5">
          <div className="mb-1.5 flex items-center gap-1.5 font-num text-[12px] font-medium text-[#A91E30]">
            <span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-7" aria-hidden="true" />
            주요 기도제목
          </div>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-b27-ink">{s.prayer_points}</p>
        </section>
      )}

      {/* 특이사항 */}
      {s.notes && (
        <section className="px-5 pb-4">
          <div className="mb-1.5 font-num text-[12px] font-medium text-b27-muted">특이사항</div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-b27-muted">{s.notes}</p>
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
      <section className="border-t border-b27-line px-5 py-5">
        <div className="mb-2 font-num text-[12px] font-medium text-b27-muted">메시지 발송</div>
        <MessageActions email={s.email} name={s.name} aiDraft={aiDraft} />
      </section>

      {/* 헌금 이력 (읽기전용 — 입력은 회계 모듈, 합계는 장부 집계) */}
      <DonationPanel yearly={yearly} />

      {/* 수정 / 삭제 */}
      {canEdit ? (
        <div className="flex items-center gap-2 px-5 pb-12 pt-6">
          <Link
            href={`/supporters/${s.id}/edit`}
            className="flex-1 rounded-2xl bg-b27-ink py-3.5 text-center text-[14px] font-medium text-white transition active:opacity-80"
          >
            수정
          </Link>
          <DeleteButton id={s.id} />
        </div>
      ) : (
        <p className="border-t border-b27-line px-5 pb-12 pt-8 text-center text-xs text-b27-muted">
          다른 멤버님이 등록한 후원자입니다. 보기만 가능합니다.
        </p>
      )}
      </div>
    </div>
  )
}
