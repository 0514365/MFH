'use client'

// MFH-TASK-FORM-V2
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import {
  IMPORTANCE_MAX,
  STATUSES,
  normalizeStatus,
  TASK_DEFAULT_STATUS,
  type StatusValue,
} from '@/lib/constants'
import type { Task } from '@/lib/types'
import DateField from '../journal/DateField'
import CategorySelect from '@/components/CategorySelect'
import BackButton from '@/components/BackButton'

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
  const [category, setCategory] = useState(initial?.category ?? '')
  const [placeName, setPlaceName] = useState(initial?.place_name ?? '')
  const [importance, setImportance] = useState<number>(initial?.importance ?? 0)
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '')
  const [dueTime, setDueTime] = useState((initial?.due_time ?? '').slice(0, 5))
  const [status, setStatus] = useState<StatusValue>(
    initial ? normalizeStatus(initial.status) : TASK_DEFAULT_STATUS,
  )
  const [done, setDone] = useState(initial?.done ?? false)
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // 우선순위는 UI에서 제거됨(데이터 보존용 상수)
  const priority = initial?.priority ?? 'med'

  useEffect(() => {
    const supabase = createClient()
    void supabase
      .from('projects')
      .select('id, title')
      .order('created_at', { ascending: false })
      .then(({ data }) => setProjects((data ?? []) as { id: string; title: string }[]))
  }, [])

  // 완료 체크 ↔ Status 연동: 완료=done, 해제 시 done이면 upcoming으로 되돌림
  function onToggleDone(next: boolean) {
    setDone(next)
    if (next) setStatus('done')
    else if (status === 'done') setStatus('upcoming')
  }

  function onChangeStatus(next: StatusValue) {
    setStatus(next)
    if (next === 'done') setDone(true)
    else if (done) setDone(false)
  }

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
    const isDone = done || status === 'done'
    const payload = {
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      project_id: projectId || null,
      category: category || null,
      place_name: placeName.trim() || null,
      priority,
      importance,
      status,
      due_date: dueDate || null,
      // 마감일이 없으면 시간만 단독 저장하지 않음(캘린더 표시 기준이 날짜이므로)
      due_time: dueDate && dueTime ? dueTime : null,
      done: isDone,
      completed_at: isDone ? (initial?.completed_at ?? new Date().toISOString()) : null,
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
      <BackButton href="/tasks" label="To-Do" />
      <h1 className="mb-4 mt-2 font-display text-2xl font-extrabold text-primary">
        {mode === 'edit' ? 'Edit To-Do' : 'New To-Do'}
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

      <label className={small}>사역분류 (선택)</label>
      <CategorySelect value={category} onChange={setCategory} className={input} emptyLabel="분류 없음" />

      <label className={small}>장소 (선택)</label>
      <input
        value={placeName}
        onChange={(e) => setPlaceName(e.target.value)}
        className={input}
        placeholder="예: 자포탈 더좋은교회"
      />

      <label className={small}>상태</label>
      <select
        value={status}
        onChange={(e) => onChangeStatus(e.target.value as StatusValue)}
        className={input}
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
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

      <label className={small}>마감 시간 (선택)</label>
      <input
        type="time"
        value={dueTime}
        onChange={(e) => setDueTime(e.target.value)}
        disabled={!dueDate}
        className={`${input} disabled:opacity-50`}
      />
      {!dueDate && <p className="mt-1 text-[11px] text-faint">마감일을 먼저 정하면 시간을 추가할 수 있어요.</p>}

      <label className="mt-4 flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={done} onChange={(e) => onToggleDone(e.target.checked)} />
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
