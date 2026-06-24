'use client'

// MFH-TASK-FORM-V6
// 할 일 입력 폼 — 단일 카드(프로젝트 폼과 통일). app-theme + Airbnb 절제 + 영문캡스 마룬 라벨.
// 순서: 제목 → 설명 → [마감일·시간] → [반복·장소] → [중요도·상태] → [상위프로젝트·사역분류] → 첨부 → 완료토글.
// 선행/후속(프로젝트 선택 시)·반복 종료일(주기 선택 시)은 조건부 펼침.
// 저장·검증·완료↔상태연동·반복 생성/편집(범위 모달)·복제·삭제·작성자·이전/다음 편집순회 로직은 V5 그대로 보존.
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
import type { Task, Attachment } from '@/lib/types'
import DateField from '../journal/DateField'
import CategorySelect from '@/components/CategorySelect'
import AttachmentUpload from '@/components/AttachmentUpload'
import BackButton from '@/components/BackButton'
import DetailNav from '@/components/DetailNav'
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
import '../p/portfolio-theme.css'

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

// 프로젝트 내 맨 끝 순서값(max+10). 비어 있으면 10. ↑↓ 재배치(patch95)를 위한 10단위 간격.
async function nextSortOrder(supabase: ReturnType<typeof createClient>, projId: string): Promise<number> {
  const { data } = await supabase
    .from('tasks')
    .select('sort_order')
    .eq('project_id', projId)
    .order('sort_order', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  const max = (data?.sort_order as number | null) ?? 0
  return max + 10
}

// 필드 라벨: 한글(잉크 medium) + 작은 영문 캡스(마룬) — 프로젝트 폼과 동일
function FieldLabel({ ko, en, required }: { ko: string; en: string; required?: boolean }) {
  return (
    <label className="mb-2 flex items-baseline gap-1.5">
      <span className="text-[14px] font-medium text-ink">
        {ko}
        {required && <span className="ml-0.5 text-accent">*</span>}
      </span>
      <span className="font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">{en}</span>
    </label>
  )
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
  const [attachments, setAttachments] = useState<Attachment[]>(initial?.attachments ?? [])
  // 첨부 업로드용 현재 로그인 사용자 id(본인 폴더 정책). 마운트 시 채움.
  const [viewerId, setViewerId] = useState('')
  // 반복 등록(새 할 일 한정). 마감일을 첫 날짜로, 종료일까지 같은 할 일을 일괄 생성.
  const [repeatFreq, setRepeatFreq] = useState<RepeatFreq>('none')
  const [repeatUntil, setRepeatUntil] = useState('')
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([])
  // 선행/후속 선택용: 현재 프로젝트의 할 일 목록(자기 자신 제외) + 각 1개 선택.
  const [projectTasks, setProjectTasks] = useState<{ id: string; title: string }[]>([])
  const [predecessorId, setPredecessorId] = useState<string>(initial?.predecessor_ids?.[0] ?? '')
  const [successorId, setSuccessorId] = useState<string>(initial?.successor_ids?.[0] ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  // 반복 항목 편집/삭제 범위 모달.
  const [scopeModal, setScopeModal] = useState<null | 'save' | 'delete'>(null)

  // 우선순위는 UI에서 제거됨(데이터 보존용 상수)
  const priority = initial?.priority ?? 'med'
  const isRecurring = !!initial?.recurrence_id

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => setViewerId(data.user?.id ?? ''))
    void supabase
      .from('projects')
      .select('id, title')
      .order('created_at', { ascending: false })
      .then(({ data }) => setProjects((data ?? []) as { id: string; title: string }[]))
  }, [])

  // 관련 프로젝트가 바뀌면 그 프로젝트 할 일만 선행/후속 후보로 로드(자기 자신 제외).
  // 후보에 없어진 기존 선택은 정리한다.
  useEffect(() => {
    if (!projectId) {
      setProjectTasks([])
      return
    }
    const supabase = createClient()
    void supabase
      .from('tasks')
      .select('id, title')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const list = ((data ?? []) as { id: string; title: string }[]).filter(
          (t) => t.id !== initial?.id,
        )
        setProjectTasks(list)
        const valid = new Set(list.map((t) => t.id))
        setPredecessorId((prev) => (valid.has(prev) ? prev : ''))
        setSuccessorId((prev) => (valid.has(prev) ? prev : ''))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

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
      attachments: attachments.length ? attachments : null,
      // 선행/후속(patch96). 각 1개만 — 배열에 0~1개. 프로젝트 없으면 비움.
      predecessor_ids: projectId && predecessorId ? [predecessorId] : null,
      successor_ids: projectId && successorId ? [successorId] : null,
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
    const ownerId = resolveOwnerId({ existingOwnerId: initial?.user_id, viewerId: user.id })
    // 프로젝트에 연결되면 그 프로젝트 맨 끝(max+10)으로 배치(patch95). 단독 할 일은 null.
    const baseSo = projectId ? await nextSortOrder(supabase, projectId) : null
    if (recurring) {
      const rid = crypto.randomUUID()
      const rows = recurDates.map((d, i) => ({
        ...buildBase(),
        user_id: ownerId,
        due_date: d,
        recurrence_id: rid,
        recurrence_freq: repeatFreq,
        sort_order: baseSo == null ? null : baseSo + i * 10,
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
        .insert({ ...buildBase(), user_id: ownerId, due_date: dueDate || null, sort_order: baseSo })
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
    const ownerId = resolveOwnerId({ existingOwnerId: initial.user_id, viewerId: user.id })
    // 프로젝트가 바뀌면 새 프로젝트 맨 끝으로 sort_order 재부여(안 바뀌면 기존 순서 보존).
    const projectChanged = (initial.project_id ?? '') !== (projectId || '')
    const sortPatch = projectChanged
      ? { sort_order: projectId ? await nextSortOrder(supabase, projectId) : null }
      : {}
    const { error } = await supabase
      .from('tasks')
      .update({ ...buildBase(), user_id: ownerId, due_date: dueDate || null, ...sortPatch })
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
    'w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-sm text-ink outline-none focus:border-primary'

  return (
    <main className="app-theme mx-auto max-w-md px-4 pb-10 sm:max-w-2xl">
      {/* 상단바(미니멀) — 프로젝트 폼과 통일: 캐럿 + 중앙 제목 + (편집)이전/다음 */}
      <header className="relative -mx-4 mb-5 flex items-center justify-between border-b border-line px-4 py-3">
        <BackButton href={navQuery ? `/tasks?${navQuery}` : '/tasks'} label="" variant="text" />
        <h1 className="absolute left-1/2 -translate-x-1/2 font-display text-[15px] font-extrabold uppercase tracking-[0.2em] text-ink">
          {mode === 'edit' ? 'Edit To-Do' : 'New To-Do'}
        </h1>
        {mode === 'edit' && nav ? (
          <DetailNav
            basePath="/tasks"
            suffix="/edit"
            prevId={nav.prevId}
            nextId={nav.nextId}
            index={nav.index}
            total={nav.total}
            query={navQuery}
            variant="minimal"
          />
        ) : (
          <span className="w-10" aria-hidden="true" />
        )}
      </header>

      {/* 반복 시리즈 배너(편집 + 반복 항목) */}
      {isRecurring && (
        <div className="-mx-4 mb-5 flex flex-col items-center gap-1.5 border-b border-line bg-primary-soft px-4 py-3">
          <RecurrenceBadge freq={initial?.recurrence_freq} />
          <p className="text-center text-[11px] font-medium text-primary">
            저장·삭제 시 “이 항목만” 또는 “이후 모두”를 묻습니다.
          </p>
        </div>
      )}

      {/* 단일 카드 — 제목→설명→[마감일·시간]→[반복·장소]→[중요도·상태]→[상위프로젝트·사역분류]→첨부→완료 */}
      <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        {/* 제목 */}
        <div>
          <FieldLabel ko="제목" en="Title" required />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={input}
            placeholder="예: 건축 설계 도면 검토"
          />
        </div>

        {/* 설명 — 입력에 따라 자동 확장 */}
        <div className="mt-5">
          <FieldLabel ko="설명" en="Desc" />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={`${input} min-h-[64px] resize-none leading-relaxed [field-sizing:content]`}
            placeholder="간단한 메모"
          />
        </div>

        {/* 구분선 */}
        <div className="my-5 h-px bg-line" />

        {/* 마감일 · 마감 시간 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <FieldLabel ko="마감일" en="Due" />
            <DateField value={dueDate} onChange={setDueDate} placeholder="마감일 (선택)" />
          </div>
          <div className="min-w-0">
            <FieldLabel ko="마감 시간" en="Time" />
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
          <p className="mt-1.5 text-[11px] text-faint">마감일을 먼저 정하면 시간을 추가할 수 있어요.</p>
        )}

        {/* 반복 · 장소 (반복은 새 할 일에서만 / 편집은 장소 단독) */}
        {mode === 'new' ? (
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <FieldLabel ko="반복" en="Repeat" />
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
            <div className="min-w-0">
              <FieldLabel ko="장소" en="Place" />
              <input
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                className={input}
                placeholder="예: 자포탈 더좋은교회"
              />
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <FieldLabel ko="장소" en="Place" />
            <input
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              className={input}
              placeholder="예: 자포탈 더좋은교회"
            />
          </div>
        )}

        {/* 반복 종료일 — 주기 선택 시 펼침 */}
        {mode === 'new' && repeatFreq !== 'none' && (
          <div className="mt-3 rounded-2xl bg-surface-subtle p-4">
            <FieldLabel ko="반복 종료일" en="Until" />
            <DateField value={repeatUntil} onChange={setRepeatUntil} placeholder="반복 종료일" />
            <p className={`mt-2 text-[11px] ${!dueDate || !repeatUntil ? 'text-danger' : 'text-faint'}`}>
              {!dueDate
                ? '먼저 위에서 마감일(첫 날짜)을 정해 주세요.'
                : !repeatUntil
                  ? '종료일을 정해야 저장됩니다 — 종료일까지만 생성되고 그 뒤로는 만들지 않습니다.'
                  : `마감일(${dueDate})부터 종료일(${repeatUntil})까지 ${
                      repeatFreq === 'daily' ? '매일' : repeatFreq === 'weekly' ? '매주' : '매월'
                    } 같은 할 일을 만듭니다.`}
            </p>
          </div>
        )}

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
                      width="26"
                      height="26"
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
        </div>

        {/* 상위 프로젝트 · 사역 분류 */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <FieldLabel ko="상위 프로젝트" en="Project" />
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={input}>
              <option value="">없음 (단독 할 일)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <FieldLabel ko="사역 분류" en="Category" />
            <CategorySelect value={category} onChange={setCategory} className={input} emptyLabel="분류 없음" />
          </div>
        </div>

        {/* 선행 · 후속 작업 — 상위 프로젝트 선택 시 펼침 */}
        {projectId && projectTasks.length > 0 && (
          <div className="mt-3 rounded-2xl bg-surface-subtle p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <FieldLabel ko="선행 작업" en="Prev" />
                <select
                  value={predecessorId}
                  onChange={(e) => setPredecessorId(e.target.value)}
                  className={input}
                >
                  <option value="">없음</option>
                  {projectTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <FieldLabel ko="후속 작업" en="Next" />
                <select
                  value={successorId}
                  onChange={(e) => setSuccessorId(e.target.value)}
                  className={input}
                >
                  <option value="">없음</option>
                  {projectTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 첨부파일 */}
        <div className="mt-5">
          <FieldLabel ko="첨부파일" en="Files" />
          <AttachmentUpload userId={viewerId} value={attachments} onChange={setAttachments} />
        </div>

        {/* 완료됨 토글 */}
        <div className="mt-5 flex items-center justify-between border-t border-line pt-5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[14px] font-medium text-ink">완료됨</span>
            <span className="font-display text-[9px] font-bold uppercase tracking-[0.15em] text-faint">Completed</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={done}
            aria-label="완료됨"
            onClick={() => onToggleDone(!done)}
            className={`relative inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full transition-colors ${
              done ? 'bg-[#0F6E56]' : 'bg-line'
            }`}
          >
            <span
              className={`inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow-sm transition ${
                done ? 'translate-x-[20px]' : 'translate-x-[2px]'
              }`}
            />
          </button>
        </div>
      </div>

      {msg && <p className="mt-4 text-center text-sm text-danger">{msg}</p>}

      {/* 저장 + (편집) 복제·삭제 */}
      <button
        onClick={save}
        disabled={saving}
        className="mt-6 w-full rounded-xl bg-accent py-4 font-display text-[15px] font-bold uppercase tracking-[0.15em] text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {saving
          ? '저장 중…'
          : mode === 'edit'
            ? 'Update To-Do'
            : repeatFreq !== 'none'
              ? '반복 만들기'
              : 'Save To-Do'}
      </button>
      {mode === 'edit' && initial && (
        <div className="mt-6 flex items-center justify-center gap-8 text-[13px] font-medium text-muted">
          <button
            type="button"
            onClick={() => router.push(`/tasks/new?from=${initial.id}`)}
            disabled={saving}
            className="transition hover:text-ink disabled:opacity-50"
          >
            복제
          </button>
          <button
            type="button"
            onClick={del}
            disabled={saving}
            className="transition hover:text-accent disabled:opacity-50"
          >
            삭제
          </button>
        </div>
      )}

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
