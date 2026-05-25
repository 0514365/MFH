'use client'

import Link from 'next/link'
import { useEffect, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { JOURNAL_CATEGORIES } from '@/lib/constants'
import { readPhotoMeta, uploadJournalPhoto } from '@/lib/photo'
import type { JournalEntry, Project, Task } from '@/lib/types'

function todayStr() {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

type Props = {
  mode: 'new' | 'edit'
  initial?: JournalEntry | null
  initialPhotoUrl?: string | null
}

export default function JournalForm({ mode, initial, initialPhotoUrl }: Props) {
  const router = useRouter()

  const [entryDate, setEntryDate] = useState(initial?.entry_date ?? todayStr())
  const [category, setCategory] = useState(initial?.category ?? '')
  const [headline, setHeadline] = useState(initial?.headline ?? '')
  const [todayText, setTodayText] = useState(initial?.today ?? '')
  const [thanks, setThanks] = useState(initial?.thanks ?? '')
  const [meditation, setMeditation] = useState(initial?.meditation ?? '')
  const [prayer, setPrayer] = useState(initial?.prayer ?? '')
  const [prayerCandidate, setPrayerCandidate] = useState(initial?.prayer_candidate ?? false)
  const [projectId, setProjectId] = useState(initial?.project_id ?? '')
  const [taskId, setTaskId] = useState(initial?.task_id ?? '')

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [existingUrl, setExistingUrl] = useState<string | null>(initialPhotoUrl ?? null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [metaRaw, setMetaRaw] = useState<Record<string, unknown> | null>(initial?.photo_meta ?? null)

  const [photoTakenAt, setPhotoTakenAt] = useState(
    initial?.photo_taken_at ? initial.photo_taken_at.slice(0, 10) : ''
  )
  const [photoLat, setPhotoLat] = useState(initial?.photo_lat != null ? String(initial.photo_lat) : '')
  const [photoLng, setPhotoLng] = useState(initial?.photo_lng != null ? String(initial.photo_lng) : '')
  const [applyPhotoDate, setApplyPhotoDate] = useState(false)

  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void supabase
      .from('projects')
      .select('id, title')
      .order('created_at', { ascending: false })
      .then(({ data }) => setProjects((data ?? []) as Project[]))
    void supabase
      .from('tasks')
      .select('id, title, project_id')
      .order('created_at', { ascending: false })
      .then(({ data }) => setTasks((data ?? []) as Task[]))
  }, [])

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (preview) URL.revokeObjectURL(preview)
    if (!f) {
      setFile(null)
      setPreview(null)
      return
    }
    setFile(f)
    setRemovePhoto(false)
    setExistingUrl(null)
    setPreview(URL.createObjectURL(f))
    const m = await readPhotoMeta(f)
    setMetaRaw(m.raw)
    if (m.takenAt) {
      setPhotoTakenAt(m.takenAt.slice(0, 10))
      setApplyPhotoDate(true)
      setEntryDate(m.takenAt.slice(0, 10))
    }
    if (m.lat != null) setPhotoLat(String(m.lat))
    if (m.lng != null) setPhotoLng(String(m.lng))
  }

  function changeTakenAt(val: string) {
    setPhotoTakenAt(val)
    if (applyPhotoDate && val) setEntryDate(val)
  }

  function toggleApply(checked: boolean) {
    setApplyPhotoDate(checked)
    if (checked && photoTakenAt) setEntryDate(photoTakenAt)
  }

  function removeCurrentPhoto() {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    setExistingUrl(null)
    setRemovePhoto(true)
  }

  async function save() {
    if (!headline.trim() && !todayText.trim()) {
      setMsg('제목 또는 오늘 있었던 일을 입력해 주세요.')
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

    const oldPath = initial?.photo_path ?? null
    let photoPath: string | null = oldPath
    try {
      if (file) {
        photoPath = await uploadJournalPhoto(supabase, user.id, file)
      } else if (removePhoto) {
        photoPath = null
      }
    } catch (err) {
      setSaving(false)
      setMsg('사진 업로드 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'))
      return
    }

    const latNum = photoLat.trim() ? Number(photoLat) : null
    const lngNum = photoLng.trim() ? Number(photoLng) : null

    const payload = {
      user_id: user.id,
      entry_date: entryDate,
      category: category || null,
      headline: headline.trim() || null,
      today: todayText.trim() || null,
      thanks: thanks.trim() || null,
      meditation: meditation.trim() || null,
      prayer: prayer.trim() || null,
      prayer_candidate: prayerCandidate,
      project_id: projectId || null,
      task_id: taskId || null,
      photo_path: photoPath,
      photo_taken_at: photoTakenAt || null,
      photo_lat: latNum != null && !Number.isNaN(latNum) ? latNum : null,
      photo_lng: lngNum != null && !Number.isNaN(lngNum) ? lngNum : null,
      photo_meta: photoPath ? metaRaw : null,
    }

    let resultId = initial?.id ?? null
    if (mode === 'edit' && initial) {
      const { error } = await supabase.from('journal_entries').update(payload).eq('id', initial.id)
      if (error) {
        setSaving(false)
        setMsg('저장 실패: ' + error.message)
        return
      }
    } else {
      const { data, error } = await supabase
        .from('journal_entries')
        .insert(payload)
        .select('id')
        .single()
      if (error) {
        setSaving(false)
        setMsg('저장 실패: ' + error.message)
        return
      }
      resultId = (data as { id: string }).id
    }

    if (oldPath && oldPath !== photoPath) {
      try {
        await supabase.storage.from('journal-photos').remove([oldPath])
      } catch {
        // 이전 사진 삭제 실패는 무시
      }
    }

    setSaving(false)
    router.replace(mode === 'edit' && resultId ? `/journal/${resultId}` : '/journal')
    router.refresh()
  }

  const input =
    'w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-primary'
  const big = 'mb-1 mt-5 block text-sm font-bold text-primary'
  const small = 'mb-1 mt-4 block text-xs text-muted'
  const showPhoto = preview ?? existingUrl

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <Link
        href={mode === 'edit' && initial ? `/journal/${initial.id}` : '/journal'}
        className="text-xs text-muted underline"
      >
        ← 일지
      </Link>
      <h1 className="mb-4 mt-2 font-display text-2xl font-extrabold text-primary">
        {mode === 'edit' ? '일지 수정' : '새 일지'}
      </h1>

      <label className="mb-1 block text-xs text-muted">날짜</label>
      <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className={input} />

      <label className={small}>사역 분류</label>
      <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
        <option value="">선택 안 함</option>
        {JOURNAL_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <label className={small}>한 줄 머리말</label>
      <input value={headline} onChange={(e) => setHeadline(e.target.value)} className={input} placeholder="오늘의 한 줄" />

      <label className={big}>🌿 오늘 있었던 일</label>
      <textarea value={todayText} onChange={(e) => setTodayText(e.target.value)} rows={4} className={input} />

      <label className={big}>🙏 감사·응답</label>
      <textarea value={thanks} onChange={(e) => setThanks(e.target.value)} rows={3} className={input} />

      <label className={big}>💭 묵상·깨달음</label>
      <textarea value={meditation} onChange={(e) => setMeditation(e.target.value)} rows={3} className={input} />

      <label className={big}>📌 기도제목</label>
      <textarea value={prayer} onChange={(e) => setPrayer(e.target.value)} rows={3} className={input} />

      <label className={big}>📷 사진</label>
      <input type="file" accept="image/*" onChange={onPick} className="block w-full text-sm text-muted" />
      {showPhoto && (
        <div className="mt-3">
          <img src={showPhoto} alt="" className="w-full rounded-xl border border-line" />
          <button type="button" onClick={removeCurrentPhoto} className="mt-2 text-xs text-danger underline">
            사진 제거
          </button>
        </div>
      )}

      <label className={small}>촬영일 (메타데이터 · 수정 가능)</label>
      <input type="date" value={photoTakenAt} onChange={(e) => changeTakenAt(e.target.value)} className={input} />
      <label className="mt-2 flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" checked={applyPhotoDate} onChange={(e) => toggleApply(e.target.checked)} />
        촬영일을 일지 날짜로 사용
      </label>

      <label className={small}>위치 (위도 / 경도 · 수정 가능)</label>
      <div className="flex gap-2">
        <input
          value={photoLat}
          onChange={(e) => setPhotoLat(e.target.value)}
          className={input}
          placeholder="위도"
          inputMode="decimal"
        />
        <input
          value={photoLng}
          onChange={(e) => setPhotoLng(e.target.value)}
          className={input}
          placeholder="경도"
          inputMode="decimal"
        />
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={prayerCandidate} onChange={(e) => setPrayerCandidate(e.target.checked)} />
        편지 기도제목 후보로 표시
      </label>

      <label className={small}>관련 프로젝트 (선택)</label>
      <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={input}>
        <option value="">없음</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>

      <label className={small}>관련 할 일 (선택)</label>
      <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className={input}>
        <option value="">없음</option>
        {tasks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>

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
