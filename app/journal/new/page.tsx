'use client'

import Link from 'next/link'
import { useEffect, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { JOURNAL_CATEGORIES } from '@/lib/constants'
import { readPhotoMeta, uploadJournalPhoto, type PhotoMeta } from '@/lib/photo'
import type { Project, Task } from '@/lib/types'

function todayStr() {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export default function NewJournal() {
  const router = useRouter()
  const [entryDate, setEntryDate] = useState(todayStr())
  const [category, setCategory] = useState('')
  const [headline, setHeadline] = useState('')
  const [todayText, setTodayText] = useState('')
  const [thanks, setThanks] = useState('')
  const [meditation, setMeditation] = useState('')
  const [prayer, setPrayer] = useState('')
  const [prayerCandidate, setPrayerCandidate] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [meta, setMeta] = useState<PhotoMeta | null>(null)
  const [dateAuto, setDateAuto] = useState(false)
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
    setMeta(null)
    setDateAuto(false)
    if (!f) {
      setFile(null)
      setPreview(null)
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    const m = await readPhotoMeta(f)
    setMeta(m)
    if (m.takenAt) {
      setEntryDate(m.takenAt.slice(0, 10))
      setDateAuto(true)
    }
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

    let photoPath: string | null = null
    if (file) {
      try {
        photoPath = await uploadJournalPhoto(supabase, user.id, file)
      } catch (err) {
        setSaving(false)
        setMsg('사진 업로드 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'))
        return
      }
    }

    const { error } = await supabase.from('journal_entries').insert({
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
      photo_taken_at: meta?.takenAt ?? null,
      photo_lat: meta?.lat ?? null,
      photo_lng: meta?.lng ?? null,
      photo_meta: meta?.raw ?? null,
    })
    setSaving(false)
    if (error) {
      setMsg('저장 실패: ' + error.message)
      return
    }
    router.replace('/journal')
    router.refresh()
  }

  const input =
    'w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-brand-primary'
  const big = 'mb-1 mt-5 block text-sm font-bold text-brand-primary'
  const small = 'mb-1 mt-4 block text-xs text-ink/60'

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <Link href="/journal" className="text-xs text-muted underline">
        ← 일지
      </Link>
      <h1 className="mb-4 mt-2 font-display text-2xl font-extrabold text-brand-primary">새 일지</h1>

      <label className="mb-1 block text-xs text-ink/60">날짜</label>
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
      <input type="file" accept="image/*" onChange={onPick} className="block w-full text-sm text-ink/70" />
      {preview && (
        <div className="mt-3">
          <img src={preview} alt="" className="w-full rounded-xl border border-line" />
          <div className="mt-2 space-y-0.5 text-xs text-ink/60">
            <div>
              {meta?.takenAt ? `촬영일 ${meta.takenAt.slice(0, 10)}` : '촬영일 정보 없음'}
              {dateAuto && ' · 날짜 자동 적용됨'}
            </div>
            <div>
              {meta?.lat != null && meta?.lng != null ? (
                <a
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://maps.google.com/?q=${meta.lat},${meta.lng}`}
                >
                  위치 {meta.lat.toFixed(5)}, {meta.lng.toFixed(5)}
                </a>
              ) : (
                '위치 정보 없음'
              )}
            </div>
          </div>
        </div>
      )}

      <label className="mt-4 flex items-center gap-2 text-sm text-ink/70">
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
        className="mt-6 w-full rounded-xl bg-brand-primary py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? '저장 중…' : '저장'}
      </button>
    </main>
  )
}
