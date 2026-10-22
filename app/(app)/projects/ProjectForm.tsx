'use client'
// MFH-PROJECT-FORM-2027 — 4-3: theme-2027 · 빨간 ‹ · 연회색 입력칸 · Manrope 라벨 · 중요도 살구 블록 · 상태 알약 · 분류 블록 · 저장 남색.

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
import CategoryBlocks from '../journal/CategoryBlocks'
import { blockHalo } from '@/lib/palette'
import AttachmentUpload from '@/components/AttachmentUpload'
import BackButton from '@/components/BackButton'
import { resolveOwnerId } from '@/lib/members'

type Props = {
  mode: 'new' | 'edit'
  initial?: Project | null
}

// 필드 라벨: 한글(잉크 medium) + 작은 영문 캡스(마룬, Stayly type-uppercase 톤)
function FieldLabel({ ko }: { ko: string; en?: string }) {
  return <label className="mb-1.5 block font-num text-[12px] font-medium text-b27-muted">{ko}</label>
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
    'w-full rounded-xl bg-b27-card px-4 py-3 text-sm text-b27-ink outline-none placeholder:text-b27-muted focus:ring-2 focus:ring-b27-ink/15'

  return (
    <main className="theme-2027 mx-auto max-w-md px-4 pb-10 @xl:max-w-2xl">
      {/* 상단바 — 빨간 ‹ + 제목 */}
      <header className="sticky top-0 z-30 -mx-4 mb-3 flex h-[52px] items-center bg-b27-paper pl-3 pr-4">
        <BackButton
          href={mode === 'edit' && initial ? `/projects/${initial.id}` : '/projects'}
          label={mode === 'edit' ? '프로젝트 수정' : '새 프로젝트'}
          variant="text"
        />
      </header>

      {/* 제목 → 설명 → [시작·마감] → 중요도 → 상태 → 사역 분류 → 첨부 */}
      <div className="flex flex-col">
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
        <div className="my-5 h-px bg-b27-line" />

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

        {/* 중요도 — 살구 블록 4칸(할 일과 동일) */}
        <div className="mt-5">
          <FieldLabel ko="중요도" en="Stars" />
          <div className="grid grid-cols-4 gap-[3px] overflow-hidden rounded-xl bg-b27-paper" role="radiogroup" aria-label="중요도">
            {Array.from({ length: IMPORTANCE_MAX + 1 }).map((_, n) => {
              const on = importance === n
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={n === 0 ? '중요도 없음' : `중요도 ${n}`}
                  onClick={() => setImportance(n)}
                  className="flex h-11 items-center justify-center text-[13px] font-semibold tracking-[1px] transition active:opacity-80"
                  style={
                    on
                      ? { background: 'var(--b27-block-3)', color: '#fff', textShadow: blockHalo(3), boxShadow: 'inset 0 0 0 3px var(--b27-ink)' }
                      : { background: 'var(--b27-tint-3)', color: 'var(--b27-deep-3)' }
                  }
                >
                  {n === 0 ? '없음' : '★'.repeat(n)}
                </button>
              )
            })}
          </div>
        </div>

        {/* 상태 — 알약 세그먼트 */}
        <div className="mt-5">
          <FieldLabel ko="상태" en="Status" />
          <div className="flex gap-1 rounded-full bg-b27-card p-1" role="radiogroup" aria-label="상태">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={status === s.value}
                onClick={() => setStatus(normalizeStatus(s.value))}
                className={`flex-1 rounded-full py-2 text-[13px] transition active:opacity-70 ${
                  status === s.value ? 'bg-b27-ink font-medium text-white' : 'text-b27-muted'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 사역 분류 — 블록 선택 */}
        <div className="mt-5">
          <FieldLabel ko="사역 분류" en="Category" />
          <CategoryBlocks value={category} onChange={setCategory} />
        </div>

        {/* 첨부파일 */}
        <div className="mt-5">
          <FieldLabel ko="첨부파일" en="Files" />
          <AttachmentUpload userId={viewerId} value={attachments} onChange={setAttachments} />
        </div>
      </div>

      {msg && <p className="mt-4 text-center text-sm text-b27-expense">{msg}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="mt-6 w-full rounded-2xl bg-b27-ink py-4 text-[15px] font-medium text-white transition active:opacity-80 disabled:opacity-50"
      >
        {saving ? '저장 중…' : mode === 'edit' ? '수정 저장' : '저장'}
      </button>
    </main>
  )
}
