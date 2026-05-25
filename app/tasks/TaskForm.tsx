'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { PRIORITIES, IMPORTANCE_MAX } from '@/lib/constants'
import type { Task } from '@/lib/types'
import DateField from '../journal/DateField'

type Props = {
  mode: 'new' | 'edit'
  initial?: Task | null
  presetProjectId?: string | null
}

export default function TaskForm({ mode, initial, presetProjectId }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [projectId, setProjectId] = useState(initial?.project_id ?? presetProjectId ?? '')
  const [priority, setPriority] = useState(initial?.priority ?? 'med')
  const [importance, setImportance] = useState<number>(initial?.importance ?? 0)
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '')
  const [done, setDone] = useState(initial?.done ?? false)
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void supabase
      .from('projects')
      .select('id, title')
      .order('created_at', { ascending: false })
      .then(({ data }) => setProjects((data ?? []) as { id: string; title: string }[]))
  }, [])

  async function save() {
    if (!title.trim()) {
      setMsg('할 일 제목을 입력해 주세요.')
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
      project_id: projectId || null,
      priority,
      importance,
      due_date: dueDate || null,
      done,
      completed_at: done ? (initial?.completed_at ?? new Date().toISOString()) : null,
    }
    if (mode === 'edit' && initial) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', initial.id)
      if (error) {
        setSaving(false)
        setMsg('저장 실패: ' + error.message)
        return
      }
    } else {
      const { error } = await supabase.from('tasks').insert(payload)
      if (error) {
        setSaving(false)
        setMsg('저장 실패: ' + error.message)
        return
      }
    }
    setSaving(false)
    const dest = mode === 'new' && presetProjectId ? `/projects/${presetProjectId}` : '/tasks'
    router.replace(dest)
    router.refresh()
  }

  async function del() {
    if (!initial) return
    if (!confirm('이 할 일을 삭제할까요?')) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('tasks').delete().eq('id', initial.id)
    if (error) {
      setSaving(false)
      setMsg('삭제 실패: ' + error.message)
      return
    }
    router.replace('/tasks')
    router.refresh()
  }

  const input =
    'w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-primary'
  const small = 'mb-1 mt-4 block text-xs text-muted'

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <Link href="/tasks" className="text-xs text-muted underline">
        ← 할 일
      </Link>
      <h1 className="mb-4 mt-2 font-display text-2xl font-extrabold text-primary">
        {mode === 'edit' ? '할 일 수정' : '새 할 일'}
      </h1>

      <label className="mb-1 block text-xs text-muted">제목</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="예: 건축 설계 도면 검토" />

      <label className={small}>설명 (선택)</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className={input}
        placeholder="간단한 메모"
      />

      <label className={small}>관련 프로젝트 (선택)</label>
      <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={input}>
        <option value="">없음 (단독 할 일)</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
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

      <label className={small}>마감일</label>
      <DateField value={dueDate} onChange={setDueDate} placeholder="마감일 (선택)" />

      <label className="mt-4 flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} />
        완료됨
      </label>

      {msg && <p className="mt-4 text-sm text-danger">{msg}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="mt-6 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? '저장 중…' : mode === 'edit' ? '수정 저장' : '저장'}
      </button>

      {mode === 'edit' && (
        <button onClick={del} disabled={saving} className="mt-3 block text-xs text-danger underline">
          삭제
        </button>
      )}
    </main>
  )
}
