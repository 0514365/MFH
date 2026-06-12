'use client'

// MFH-TASK-FORM-V4
import { useEffect, useRef, useState } from 'react'
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
import DetailNav from '@/components/DetailNav'
import AuthorSelect from '@/components/AuthorSelect'
import RecurrenceBadge from '@/components/RecurrenceBadge'
import RecurrenceScopeModal from '@/components/RecurrenceScopeModal'
import {
  dayDelta,
  updateRecurringFollowing,
  deleteRecurringFollowing,
  type RecurrenceScope,
} from '@/lib/recurrence'
import type { ListNav } from '@/lib/listNav'
import { resolveOwnerId } from '@/lib/members'

type Props = {
  mode: 'new' | 'edit'
  initial?: Task | null
  presetProjectId?: string | null
  // 편집 모드에서 목록(필터 반영) 기준 이전/다음 편집 순회.
  nav?: ListNav | null
  navQuery?: string
}

// ── 반복 등록(새 할 일 한정) ───────────────────────────────
type RepeatFreq = 'none' | 'daily' | 'weekly' | 'monthly'
// 한 번에 만들 최대 개수(무한 방지). 매일 ≈ 1년.
const MAX_OCCURRENCES = 366

const pad2 = (n: number) => String(n).padStart(2, '0')
function fmtLocalDate(dt: Date): string {
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}
// dateStr(YYYY-MM-DD) 에서 빈도만큼 다음 날짜. 매월은 같은 일(day) 유지, 말일 초과 시 그 달 말일로 클램프.
function nextDate(dateStr: string, freq: 'daily' | 'weekly' | 'monthly'): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (freq === 'daily') return fmtLocalDate(new Date(y, m - 1, d + 1))
  if (freq === 'weekly') return fmtLocalDate(new Date(y, m - 1, d + 7))
  const nm = m === 12 ? 1 : m + 1
  const ny = m === 12 ? y + 1 : y
  const lastDay = new Date(ny, nm, 0).getDate() // nm월의 말일
  return `${ny}-${pad2(nm)}-${pad2(Math.min(d, lastDay))}`
}
// start~until(포함) 사이 발생일 목록. 문자열 비교(YYYY-MM-DD 제로패딩)로 안전.
function buildOccurrences(start: string, until: string, freq: 'daily' | 'weekly' | 'monthly'): string[] {
  const dates: string[] = []
  let cur = start
  while (cur <= until && dates.length < MAX_OCCURRENCES) {
    dates.push(cur)
    cur = nextDate(cur, freq)
  }
  return dates
}

export default function TaskForm({ mode, initial, presetProjectId, nav, navQuery }: Props) {
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
  // 작성자(user_id) — 마스터만 AuthorSelect 로 변경 가능. 신규는 컴포넌트가 본인으로 채움.
  const [authorId, setAuthorId] = useState(initial?.user_id ?? '')
  // 반복 등록(새 할 일 한정). 마감일을 첫 날짜로, 종료일까지 같은 할 일을 일괄 생성.
  const [repeatFreq, setRepeatFreq] = useState<RepeatFreq>('none')
  const [repeatUntil, setRepeatUntil] = useState('')
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  // 반복 항목 편집/삭제 범위 모달.
  const [scopeModal, setScopeModal] = useState<null | 'save' | 'delete'>(null)

  // 우선순위는 UI에서 제거됨(데이터 보존용 상수)
  const priority = initial?.priority ?? 'med'
  const isRecurring = !!initial?.recurrence_id

  // 설명 textarea 자동 높이(입력 길이에 맞춰 늘어남, 최소 2줄)
  const descRef = useRef<HTMLTextAreaElement>(null)
  function syncDescHeight() {
    const el = descRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }
  useEffect(() => {
    syncDescHeight()
  }, [description])

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

  // 마감일 외 공통 필드(user_id·due_date·recurrence 제외). insert/update 공용.
  function buildBase() {
    const isDone = done || status === 'done'
    return {
      title: title.trim(),
      description: description.trim() || null,
      project_id: projectId || null,
      category: category || null,
      place_name: placeName.trim() || null,
      priority,
      importance,
      status,
      // 마감일이 없으면 시간만 단독 저장하지 않음(캘린더 표시 기준이 날짜이므로)
      due_time: dueDate && dueTime ? dueTime : null,
      done: isDone,
      completed_at: isDone ? (initial?.completed_at ?? new Date().toISOString()) : null,
    }
  }

  async function save() {
    if (!title.trim()) {
      setMsg('할 일 제목을 입력해 주세요.')
      return
    }

    // 반복 등록(새 할 일 한정) 검증 + 발생일 산출.
    const recurring = mode === 'new' && repeatFreq !== 'none'
    let recurDates: string[] = []
    if (recurring) {
      if (!dueDate) {
        setMsg('반복하려면 먼저 마감일(첫 날짜)을 정해 주세요.')
        return
      }
      if (!repeatUntil) {
        setMsg('반복 종료일을 정해 주세요.')
        return
      }
      if (repeatUntil < dueDate) {
        setMsg('종료일은 시작일(마감일) 이후여야 합니다.')
        return
      }
      recurDates = buildOccurrences(dueDate, repeatUntil, repeatFreq as 'daily' | 'weekly' | 'monthly')
      if (recurDates.length === 0) {
        setMsg('생성할 날짜가 없습니다. 종료일을 확인해 주세요.')
        return
      }
      const capped = recurDates.length >= MAX_OCCURRENCES
      const ok = confirm(
        `${recurDates.length}개의 반복 할 일을 만듭니다${capped ? ` (최대 ${MAX_OCCURRENCES}개까지)` : ''}. 진행할까요?`,
      )
      if (!ok) return
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }

    // 편집: 반복 항목이고 뒤에 남은(미완료) 항목이 있으면 범위 모달.
    if (mode === 'edit' && initial) {
      if (initial.recurrence_id) {
        let cq = supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('recurrence_id', initial.recurrence_id)
          .neq('id', initial.id)
          .eq('done', false)
        if (initial.due_date) cq = cq.gte('due_date', initial.due_date)
        const { count } = await cq
        if ((count ?? 0) > 0) {
          setScopeModal('save')
          return
        }
      }
      await runEditCommit('one')
      return
    }

    // 새 항목
    setSaving(true)
    setMsg(null)
    const ownerId = resolveOwnerId({ chosen: authorId, existingOwnerId: initial?.user_id, viewerId: user.id })
    if (recurring) {
      const rid = crypto.randomUUID()
      const rows = recurDates.map((d) => ({
        ...buildBase(),
        user_id: ownerId,
        due_date: d,
        recurrence_id: rid,
        recurrence_freq: repeatFreq,
      }))
      const { error } = await supabase.from('tasks').insert(rows)
      if (error) {
        setSaving(false)
        setMsg('저장 실패: ' + error.message)
        return
      }
    } else {
      const { error } = await supabase
        .from('tasks')
        .insert({ ...buildBase(), user_id: ownerId, due_date: dueDate || null })
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

  // 편집 커밋. scope='following' 이면 같은 시리즈의 이후(미완료) 항목에도 정의 필드 + 마감일 시프트 적용.
  async function runEditCommit(scope: RecurrenceScope) {
    if (!initial) return
    setScopeModal(null)
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
    const ownerId = resolveOwnerId({ chosen: authorId, existingOwnerId: initial.user_id, viewerId: user.id })
    const { error } = await supabase
      .from('tasks')
      .update({ ...buildBase(), user_id: ownerId, due_date: dueDate || null })
      .eq('id', initial.id)
    if (error) {
      setSaving(false)
      setMsg('저장 실패: ' + error.message)
      return
    }
    if (scope === 'following' && initial.recurrence_id) {
      const delta = initial.due_date && dueDate ? dayDelta(initial.due_date, dueDate) : 0
      const res = await updateRecurringFollowing({
        recurrenceId: initial.recurrence_id,
        currentId: initial.id,
        fromDueDate: initial.due_date,
        dateDelta: delta,
        template: {
          title: title.trim(),
          description: description.trim() || null,
          category: category || null,
          place_name: placeName.trim() || null,
          importance,
          due_time: dueDate && dueTime ? dueTime : null,
        },
      })
      if (!res.ok) {
        setSaving(false)
        setMsg('이후 항목 변경 실패: ' + (res.error ?? ''))
        return
      }
    }
    setSaving(false)
    router.replace('/tasks')
    router.refresh()
  }

  function del() {
    if (!initial) return
    if (initial.recurrence_id) {
      setScopeModal('delete')
      return
    }
    if (!confirm('이 할 일을 삭제할까요?')) return
    void runDelete('one')
  }

  async function runDelete(scope: RecurrenceScope) {
    if (!initial) return
    setScopeModal(null)
    setSaving(true)
    const supabase = createClient()
    if (scope === 'following' && initial.recurrence_id) {
      const res = await deleteRecurringFollowing({
        recurrenceId: initial.recurrence_id,
        fromDueDate: initial.due_date,
        currentId: initial.id,
      })
      if (!res.ok) {
        setSaving(false)
        setMsg('삭제 실패: ' + (res.error ?? ''))
        return
      }
    } else {
      const { error } = await supabase.from('tasks').delete().eq('id', initial.id)
      if (error) {
        setSaving(false)
        setMsg('삭제 실패: ' + error.message)
        return
      }
    }
    router.replace('/tasks')
    router.refresh()
  }

  const input =
    'w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-primary'
  const cellLabel = 'mb-1 block text-xs text-muted'

  return (
    <main className="mx-auto max-w-md px-5 py-8 min-[740px]:max-w-5xl">
      <div className="flex items-center justify-between gap-2">
        <BackButton href={navQuery ? `/tasks?${navQuery}` : '/tasks'} label="To-Do" />
        {mode === 'edit' && nav && (
          <DetailNav
            basePath="/tasks"
            suffix="/edit"
            prevId={nav.prevId}
            nextId={nav.nextId}
            index={nav.index}
            total={nav.total}
            query={navQuery}
          />
        )}
      </div>
      <div className="mb-4 mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-extrabold text-primary">
          {mode === 'edit' ? 'Edit To-Do' : 'New To-Do'}
        </h1>
        {isRecurring && <RecurrenceBadge freq={initial?.recurrence_freq} />}
      </div>
      {isRecurring && (
        <p className="mb-4 -mt-2 text-xs text-muted">
          이 할 일은 반복 시리즈의 한 항목입니다. 저장·삭제 시 “이 항목만 / 이후 모두”를 물어봅니다.
        </p>
      )}

      {mode === 'edit' && (
        <AuthorSelect value={authorId} onChange={setAuthorId} className={input} />
      )}

      {/* 데스크탑 2열: 왼쪽 제목·설명·프로젝트 / 오른쪽 메타 */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 min-[740px]:grid-cols-2">
        {/* 왼쪽 */}
        <div className="space-y-4 min-w-0">
          <div>
            <label className={cellLabel}>제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={input}
              placeholder="예: 건축 설계 도면 검토"
            />
          </div>

          <div>
            <label className={cellLabel}>설명 (선택)</label>
            <textarea
              ref={descRef}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                syncDescHeight()
              }}
              rows={2}
              className={`${input} resize-none overflow-hidden`}
              placeholder="간단한 메모"
            />
          </div>

          <div>
            <label className={cellLabel}>관련 프로젝트 (선택)</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={input}>
              <option value="">없음 (단독 할 일)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 오른쪽 */}
        <div className="space-y-4 min-w-0">
          {/* 사역분류 · 장소 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className={cellLabel}>사역분류 (선택)</label>
              <CategorySelect value={category} onChange={setCategory} className={input} emptyLabel="분류 없음" />
            </div>
            <div className="min-w-0">
              <label className={cellLabel}>장소 (선택)</label>
              <input
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                className={input}
                placeholder="예: 자포탈 더좋은교회"
              />
            </div>
          </div>

          {/* 상태 · 중요도 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className={cellLabel}>상태</label>
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
            </div>
            <div className="min-w-0">
              <label className={cellLabel}>중요도</label>
              <div className="flex h-[46px] items-center gap-1.5">
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
            </div>
          </div>

          {/* 마감일 · 마감 시간 */}
          <div>
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className={cellLabel}>마감일</label>
                <DateField value={dueDate} onChange={setDueDate} placeholder="마감일 (선택)" />
              </div>
              <div className="min-w-0">
                <label className={cellLabel}>마감 시간 (선택)</label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  disabled={!dueDate}
                  className={`${input} disabled:opacity-50`}
                />
              </div>
            </div>
            {!dueDate && (
              <p className="mt-1 text-[11px] text-faint">마감일을 먼저 정하면 시간을 추가할 수 있어요.</p>
            )}
          </div>

          {/* 반복 등록 — 새 할 일에서만. 마감일을 첫 날짜로, 종료일까지 일괄 생성. */}
          {mode === 'new' && (
            <div className="rounded-xl border border-line bg-surface-subtle p-3">
              <div className="text-xs font-semibold text-muted">반복 (선택)</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className={cellLabel}>주기</label>
                  <select
                    value={repeatFreq}
                    onChange={(e) => setRepeatFreq(e.target.value as RepeatFreq)}
                    className={input}
                  >
                    <option value="none">반복 안 함</option>
                    <option value="daily">매일</option>
                    <option value="weekly">매주</option>
                    <option value="monthly">매월</option>
                  </select>
                </div>
                {repeatFreq !== 'none' && (
                  <div className="min-w-0">
                    <label className={cellLabel}>종료일 (필수)</label>
                    <DateField value={repeatUntil} onChange={setRepeatUntil} placeholder="반복 종료일" />
                  </div>
                )}
              </div>
              {repeatFreq !== 'none' && (
                <p className={`mt-2 text-[11px] ${!dueDate || !repeatUntil ? 'text-danger' : 'text-faint'}`}>
                  {!dueDate
                    ? '먼저 위에서 마감일(첫 날짜)을 정해 주세요.'
                    : !repeatUntil
                      ? '종료일을 정해야 저장됩니다 — 종료일까지만 생성되고 그 뒤로는 만들지 않습니다.'
                      : `마감일(${dueDate})부터 종료일(${repeatUntil})까지 ${
                          repeatFreq === 'daily' ? '매일' : repeatFreq === 'weekly' ? '매주' : '매월'
                        } 같은 할 일을 만듭니다.`}
                </p>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={done} onChange={(e) => onToggleDone(e.target.checked)} />
            완료됨
          </label>
        </div>
      </div>

      {msg && <p className="mt-6 text-sm text-danger">{msg}</p>}

      {/* 푸터: 저장 + (편집 시) 복제·삭제 */}
      <div className="mt-8 flex flex-col gap-3 min-[740px]:flex-row min-[740px]:items-center">
        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 min-[740px]:w-auto min-[740px]:px-12"
        >
          {saving
            ? '저장 중…'
            : mode === 'edit'
              ? '수정 저장'
              : repeatFreq !== 'none'
                ? '반복 만들기'
                : '저장'}
        </button>
        {mode === 'edit' && initial && (
          <div className="flex items-center gap-4 min-[740px]:ml-2">
            <button
              type="button"
              onClick={() => router.push(`/tasks/new?from=${initial.id}`)}
              disabled={saving}
              className="text-xs font-semibold text-primary underline disabled:opacity-50"
            >
              복제
            </button>
            <button
              type="button"
              onClick={del}
              disabled={saving}
              className="text-xs text-danger underline disabled:opacity-50"
            >
              삭제
            </button>
          </div>
        )}
      </div>

      {scopeModal === 'save' && (
        <RecurrenceScopeModal
          title="반복 항목 수정"
          message="이 변경을 어디까지 적용할까요? ‘이후 모두’는 같은 반복의 남은(미완료) 항목에 함께 적용됩니다. 마감일을 바꾸면 이후 항목도 같은 간격으로 이동합니다."
          oneLabel="이 항목만 변경"
          followingLabel="이 항목 + 이후 모두 변경"
          busy={saving}
          onChoose={(s) => runEditCommit(s)}
          onCancel={() => setScopeModal(null)}
        />
      )}
      {scopeModal === 'delete' && (
        <RecurrenceScopeModal
          title="반복 항목 삭제"
          message="어디까지 삭제할까요? ‘남은 모두’는 완료되지 않은 이후 반복 항목을 함께 삭제합니다(완료된 과거 항목은 보존)."
          oneLabel="이 항목만 삭제"
          followingLabel="남은(미완료) 반복 모두 삭제"
          busy={saving}
          onChoose={(s) => runDelete(s)}
          onCancel={() => setScopeModal(null)}
        />
      )}
    </main>
  )
}
