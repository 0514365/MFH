'use client'

// MFH-JOURNAL-FLAGS-TOGGLE-V1
// 일지 카드·상세 공용 3-플래그 토글(기도후보·비공개·비밀글) — 즉시 update 패턴(구 PrayerCandidateToggle 확장).
// 배타 규칙(폼과 동일): 비밀글 ON → 비공개·기도후보 해제+비활성 / 비공개 ON → 기도후보 해제+비활성.
// 비밀글 토글은 마스터 뷰어에게만 노출(RLS patch102 가 DB 레벨로도 강제).
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

type Flags = { prayer_candidate: boolean; is_private: boolean; is_secret: boolean }

// 플래그별 컬러 — 메타칩 어스톤 컨셉(hex 직접)과 동일 방식. 배지(JournalList)와 공유.
export const FLAG_COLOR = {
  prayer: '#B61821', // 기도후보 — accent 레드
  private: '#B08A4A', // 비공개 — 골드
  secret: '#661F20', // 비밀글 — 딥 마룬(primary)
} as const

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
  variant = 'compact',
}: {
  id: string
  flags: Flags
  canEdit: boolean
  // 비밀글 토글 노출 여부(마스터 뷰어).
  showSecret: boolean
  // compact: 라벨+컬러 체크박스(목록 카드 — 배지가 상태를 따로 보여줌) / pill: 컬러 채움 필(상세).
  variant?: 'compact' | 'pill'
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

  // compact(목록): 라벨 + 컬러 체크박스 — 심플. ON 상태는 카드 상단 배지가 따로 보여준다.
  // pill(상세): ON = 컬러 채움 필(흰 아이콘·흰 글자 + ✓) / OFF = 연한 외곽선 — 상태 대비 큼(모바일 가독).
  // 비활성(배타 규칙·권한 없음)인 항목은 흐리게(pill 은 ON 이면 읽기전용이어도 선명 유지).
  const Item = ({
    kind,
    label,
    icon,
    disabled,
    color,
  }: {
    kind: keyof Flags
    label: string
    icon: React.ReactNode
    disabled: boolean
    color: string
  }) => {
    const checked = cur[kind]
    const off = disabled || !canEdit
    if (variant === 'compact')
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
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border bg-surface"
            style={{ borderColor: color, background: checked ? color : undefined, color: checked ? '#fff' : color }}
          >
            {icon}
          </span>
        </button>
      )
    return (
      <button
        type="button"
        onClick={() => toggle(kind)}
        disabled={busy || off}
        aria-pressed={checked}
        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
          off && !checked ? 'opacity-35' : ''
        }`}
        style={
          checked
            ? { background: color, borderColor: color, color: '#fff' }
            : { borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--text-faint)' }
        }
      >
        <span className="shrink-0" style={checked ? undefined : { color }}>
          {icon}
        </span>
        {label}
        {checked && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
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
        color={FLAG_COLOR.prayer}
      />
      <Item
        kind="is_private"
        label="비공개"
        icon={flagIcon.lock}
        disabled={cur.is_secret}
        color={FLAG_COLOR.private}
      />
      {showSecret && (
        <Item
          kind="is_secret"
          label="비밀글"
          icon={flagIcon.eyeOff}
          disabled={false}
          color={FLAG_COLOR.secret}
        />
      )}
    </span>
  )
}
