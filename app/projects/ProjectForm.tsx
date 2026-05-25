'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { JOURNAL_CATEGORIES, PRIORITIES, PROJECT_STATUSES, IMPORTANCE_MAX } from '@/lib/constants'
import type { Project } from '@/lib/types'
import DateField from '../journal/DateField'

type Props = {
  mode: 'new' | 'edit'
  initial?: Project | null
}

export default function ProjectForm({ mode, initial }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [status, setStatus] = useState(initial?.status ?? 'active')
  const [priority, setPriority] = useState(initial?.priority ?? 'med')
  const [importance, setImportance] = useState<number>(initial?.importance ?? 0)
  const [startDate, setStartDate] = useState(initial?.start_date ?? '')
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

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
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      category: category || null,
      status,
      priority,
      importance,
      start_date: startDate || null,
      due_date: dueDate || null,
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
    'w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-primary'
  const small = 'mb-1 mt-4 block text-xs text-muted'

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <Link
        href={mode === 'edit' && initial ? `/projects/${initial.id}` : '/projects'}
        className="text-xs text-muted underline"
      >
        ← 프로젝트
      </Link>
      <h1 className="mb-4 mt-2 font-display text-2xl font-extrabold text-primary">
        {mode === 'edit' ? '프로젝트 수정' : '새 프로젝트'}
      </h1>

      <label className="mb-1 block text-xs text-muted">제목</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="예: 자포탈 더좋은교회 건축" />

      <label className={small}>설명</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={input} />

      <label className={small}>사역 분류</label>
      <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
        <option value="">선택 안 함</option>
        {JOURNAL_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <label className={small}>상태</label>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className={input}>
        {PROJECT_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <label className={small}>우선순위</label>
      <select value={priority} onChange={(e) => setPriority(e.target.value)} className={input}>
        {PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      <label className={small}>중요도</label>
      <div className="flex gap-1.5">
        {Array.from({ length: IMPORTANCE_MAX }).map((_, i) => {
          const n = i + 1
          return (
            <button
              key={n}
              type="button"
              onClick={() => setImportance(importance === n ? n - 1 : n)}
              className={`text-2xl leading-none ${n <= importance ? 'text-yellow-400' : 'text-faint'}`}
              aria-label={`중요도 ${n}`}
            >
              ★
            </button>
          )
        })}
      </div>

      <label className={small}>시작일</label>
      <DateField value={startDate} onChange={setStartDate} placeholder="시작일 (선택)" />

      <label className={small}>마감일</label>
      <DateField value={dueDate} onChange={setDueDate} placeholder="마감일 (선택)" />

      {msg && <p className="mt-4 text-sm text-danger">{msg}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="mt-6 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? '저장 중…' : mode === 'edit' ? '수정 저장' : '저장'}
      </button>
    </main>
  )
}
