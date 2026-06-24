'use client'

// MFH-PROJECT-FORM-V4
// 프로젝트 입력 폼 — 1카드 단일 흐름. app-theme(Airbnb/Stayly) + 1차 시안(영문 캡스 라벨).
// 입력 순서: 제목 → 설명 → [시작일·마감일] → [중요도·상태] → 사역 분류 → 첨부파일.
// 저장·검증·날짜·별점 로직은 보존, 비주얼(헤더·카드·라벨·필드·버튼)만 교체.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { STATUSES, normalizeStatus, IMPORTANCE_MAX } from '@/lib/constants'
import type { Project, Attachment } from '@/lib/types'
import DateField from '../journal/DateField'
import CategorySelect from '@/components/CategorySelect'
import AttachmentUpload from '@/components/AttachmentUpload'
import BackButton from '@/components/BackButton'
import { resolveOwnerId } from '@/lib/members'
import '../p/portfolio-theme.css'

type Props = {
  mode: 'new' | 'edit'
  initial?: Project | null
}

// 필드 라벨: 한글(잉크 medium) + 작은 영문 캡스(마룬, Stayly type-uppercase 톤)
function FieldLabel({ ko, en }: { ko: string; en: string }) {
  return (
    <label className="mb-2 flex items-baseline gap-1.5">
      <span className="text-[14px] font-medium text-ink">{ko}</span>
      <span className="font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">{en}</span>
    </label>
  )
}

export default function ProjectForm({ mode, initial }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [status, setStatus] = useState(normalizeStatus(initial?.status))
  const priority = initial?.priority ?? 'med'
  const [importance, setImportance] = useState<number>(initial?.importance ?? 0)
  const [startDate, setStartDate] = useState(initial?.start_date ?? '')
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '')
  const [attachments, setAttachments] = useState<Attachment[]>(initial?.attachments ?? [])
  // 첨부 업로드용 현재 로그인 사용자 id(본인 폴더 정책). 마운트 시 채움.
  const [viewerId, setViewerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => setViewerId(data.user?.id ?? ''))
  }, [])

  async function save() {
    if (!title.trim()) {
      setMsg('제목을 입력해 주세요.')
      return
    }
    setSaving(true)
    setMsg(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }
    const payload = {
      user_id: resolveOwnerId({ existingOwnerId: initial?.user_id, viewerId: user.id }),
      title: title.trim(),
      description: description.trim() || null,
      category: category || null,
      status,
      priority,
      importance,
      start_date: startDate || null,
      due_date: dueDate || null,
      attachments: attachments.length ? attachments : null,
    }
    let resultId = initial?.id ?? null
    if (mode === 'edit' && initial) {
      const { error } = await supabase.from('projects').update(payload).eq('id', initial.id)
      if (error) {
        setSaving(false)
        setMsg('저장 실패: ' + error.message)
        return
      }
    } else {
      const { data, error } = await supabase.from('projects').insert(payload).select('id').single()
      if (error) {
        setSaving(false)
        setMsg('저장 실패: ' + error.message)
        return
      }
      resultId = (data as { id: string }).id
    }
    setSaving(false)
    router.replace(resultId ? `/projects/${resultId}` : '/projects')
    router.refresh()
  }

  const input =
    'w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-sm text-ink outline-none focus:border-primary'

  return (
    <main className="app-theme mx-auto max-w-md px-4 pb-10 sm:max-w-2xl">
      {/* 상단바(미니멀) — ‹ + 중앙 제목 */}
      <header className="relative -mx-4 mb-5 flex items-center justify-between border-b border-line px-4 py-3">
        <BackButton
          href={mode === 'edit' && initial ? `/projects/${initial.id}` : '/projects'}
          label=""
          variant="text"
        />
        <h1 className="absolute left-1/2 -translate-x-1/2 font-display text-[15px] font-extrabold uppercase tracking-[0.2em] text-ink">
          {mode === 'edit' ? 'Edit Project' : 'New Project'}
        </h1>
        <span className="w-10" aria-hidden="true" />
      </header>

      {/* 단일 카드 — 제목 → 설명 → [시작·마감] → [중요도·상태] → 사역 분류 → 첨부 */}
      <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        {/* 제목 */}
        <div>
          <FieldLabel ko="제목" en="Title" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={input}
            placeholder="예: 자포탈 더좋은교회 건축"
          />
        </div>

        {/* 설명 — 입력에 따라 자동 확장 */}
        <div className="mt-5">
          <FieldLabel ko="설명" en="Desc" />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`${input} min-h-[88px] resize-none leading-relaxed [field-sizing:content]`}
            placeholder="프로젝트 설명"
          />
        </div>

        {/* 구분선 */}
        <div className="my-5 h-px bg-line" />

        {/* 시작일 · 마감일 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <FieldLabel ko="시작일" en="Start" />
            <DateField value={startDate} onChange={setStartDate} placeholder="시작일 (선택)" />
          </div>
          <div className="min-w-0">
            <FieldLabel ko="마감일" en="Due" />
            <DateField value={dueDate} onChange={setDueDate} placeholder="마감일 (선택)" />
          </div>
        </div>

        {/* 중요도 · 상태 */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <FieldLabel ko="중요도" en="Stars" />
            <div className="flex h-[46px] items-center gap-1.5">
              {Array.from({ length: IMPORTANCE_MAX }).map((_, i) => {
                const n = i + 1
                const filled = n <= importance
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setImportance(importance === n ? n - 1 : n)}
                    aria-label={`중요도 ${n}`}
                    className={filled ? 'text-[#D4AF37]' : 'text-line transition-colors hover:text-[#D4AF37]'}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill={filled ? 'currentColor' : 'none'}
                      stroke={filled ? 'none' : 'currentColor'}
                      strokeWidth="1.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={
                          filled
                            ? 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'
                            : 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
                        }
                      />
                    </svg>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="min-w-0">
            <FieldLabel ko="상태" en="Status" />
            <select
              value={status}
              onChange={(e) => setStatus(normalizeStatus(e.target.value))}
              className={input}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 사역 분류 */}
        <div className="mt-5">
          <FieldLabel ko="사역 분류" en="Category" />
          <CategorySelect value={category} onChange={setCategory} className={input} emptyLabel="선택 안 함" />
        </div>

        {/* 첨부파일 */}
        <div className="mt-5">
          <FieldLabel ko="첨부파일" en="Files" />
          <AttachmentUpload userId={viewerId} value={attachments} onChange={setAttachments} />
        </div>
      </div>

      {msg && <p className="mt-4 text-center text-sm text-danger">{msg}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="mt-6 w-full rounded-xl bg-accent py-4 font-display text-[15px] font-bold uppercase tracking-[0.15em] text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {saving ? '저장 중…' : mode === 'edit' ? 'Update Project' : 'Save Project'}
      </button>
    </main>
  )
}
