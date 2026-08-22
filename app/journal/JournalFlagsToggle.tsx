'use client'

// MFH-JOURNAL-FLAGS-TOGGLE-V1
// 일지 카드·상세 공용 3-플래그 토글(기도후보·비공개·비밀글) — 즉시 update 패턴(구 PrayerCandidateToggle 확장).
// 배타 규칙(폼과 동일): 비밀글 ON → 비공개·기도후보 해제+비활성 / 비공개 ON → 기도후보 해제+비활성.
// 비밀글 토글은 마스터 뷰어에게만 노출(RLS patch102 가 DB 레벨로도 강제).
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

type Flags = { prayer_candidate: boolean; is_private: boolean; is_secret: boolean }

// 라인 아이콘(스트로크) — 앱 메타칩 아이콘 컨셉과 통일.
export const flagIcon = {
  prayer: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M12 4v16" />
      <path d="M5 10h14" />
    </svg>
  ),
  lock: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  ),
  eyeOff: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
}

export default function JournalFlagsToggle({
  id,
  flags,
  canEdit,
  showSecret,
}: {
  id: string
  flags: Flags
  canEdit: boolean
  // 비밀글 토글 노출 여부(마스터 뷰어).
  showSecret: boolean
}) {
  const router = useRouter()
  const [cur, setCur] = useState<Flags>(flags)
  const [busy, setBusy] = useState(false)

  // 배타 규칙을 적용한 다음 상태 계산.
  function next(kind: keyof Flags, value: boolean): Flags {
    if (kind === 'is_secret')
      return value
        ? { is_secret: true, is_private: false, prayer_candidate: false }
        : { ...cur, is_secret: false }
    if (kind === 'is_private')
      return value
        ? { ...cur, is_private: true, prayer_candidate: false }
        : { ...cur, is_private: false }
    return { ...cur, prayer_candidate: value }
  }

  async function toggle(kind: keyof Flags) {
    if (busy || !canEdit) return
    const to = next(kind, !cur[kind])
    const prev = cur
    setCur(to)
    setBusy(true)
    const supabase = createClient()
    // 비밀글 지정은 마스터만(RLS) — 비마스터 뷰어의 payload 에는 is_secret 을 담지 않는다.
    const payload: Partial<Flags> = showSecret
      ? to
      : { prayer_candidate: to.prayer_candidate, is_private: to.is_private }
    const { error } = await supabase.from('journal_entries').update(payload).eq('id', id)
    setBusy(false)
    if (error) {
      setCur(prev)
      alert('변경 실패: ' + error.message)
      return
    }
    router.refresh()
  }

  const Item = ({
    kind,
    label,
    icon,
    disabled,
    onColor,
  }: {
    kind: keyof Flags
    label: string
    icon: React.ReactNode
    disabled: boolean
    onColor: string // 체크 시 채움색 클래스 세트
  }) => {
    const checked = cur[kind]
    const off = disabled || !canEdit
    return (
      <button
        type="button"
        onClick={() => toggle(kind)}
        disabled={busy || off}
        aria-pressed={checked}
        className={`flex items-center gap-1 ${off ? 'opacity-40' : ''}`}
      >
        <span className={`text-[11px] font-semibold ${checked ? 'text-ink' : 'text-faint'}`}>{label}</span>
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
            checked ? onColor : 'border-line bg-surface text-transparent'
          }`}
        >
          {icon}
        </span>
      </button>
    )
  }

  return (
    <span className="flex shrink-0 flex-wrap items-center gap-2.5">
      <Item
        kind="prayer_candidate"
        label="기도후보"
        icon={flagIcon.prayer}
        disabled={cur.is_private || cur.is_secret}
        onColor="border-accent bg-accent text-white"
      />
      <Item
        kind="is_private"
        label="비공개"
        icon={flagIcon.lock}
        disabled={cur.is_secret}
        onColor="border-muted bg-muted text-white"
      />
      {showSecret && (
        <Item
          kind="is_secret"
          label="비밀글"
          icon={flagIcon.eyeOff}
          disabled={false}
          onColor="border-primary bg-primary text-white"
        />
      )}
    </span>
  )
}
