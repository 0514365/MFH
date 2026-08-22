// MFH-JOURNAL-REDESIGN-V3
'use client'

import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { readPhotoMeta, uploadJournalPhoto, type PhotoMeta } from '@/lib/photo'
import CategorySelect from '@/components/CategorySelect'
import LinkedPicker, { type PickerItem } from '@/components/LinkedPicker'
import AuthorSelect from '@/components/AuthorSelect'
import BackButton from '@/components/BackButton'
import { isMaster, resolveOwnerId } from '@/lib/members'
import { haversineMeters } from '@/lib/geo'
import { MAX_JOURNAL_PHOTOS } from '@/lib/types'
import type { JournalEntry, JournalPhoto, Project, Task } from '@/lib/types'
import DateField from './DateField'
import '../p/portfolio-theme.css'

function todayStr() {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

// 편집 진입 시 서버가 채워 주는 기존 사진(서명 URL 포함).
export type InitialPhoto = {
  path: string
  thumb_path?: string | null
  url: string
  place_name: string | null
  taken_at: string | null
  lat: number | null
  lng: number | null
  meta: Record<string, unknown> | null
}

type Props = {
  mode: 'new' | 'edit'
  initial?: JournalEntry | null
  initialPhotos?: InitialPhoto[]
  initialIntercessionId?: string // new?intercession=<id> 로 연계 진입
  initialCategory?: string // new?category=<name> — QT 묵상일지 등 분류 프리필
  initialHeadline?: string // new?headline=<text> — QT 묵상일지 머릿말 프리필
}

// 폼 내부 사진 슬롯(미리보기 URL·새 파일·사진별 메타). 첫 슬롯 = 대표.
type PhotoSlot = {
  key: string
  path?: string // 기존 저장 경로(편집). 새 파일은 업로드 후 채워짐.
  thumb_path?: string | null // 썸네일 경로(편집 시 보존 / 새 파일은 업로드 후 채워짐).
  url: string // 미리보기(서명 URL 또는 ObjectURL)
  isObjectUrl: boolean
  file?: File
  placeName: string // 사진별 장소('' = 대표 상속)
  takenAt: string // 'YYYY-MM-DD' | ''
  lat: number | null
  lng: number | null
  meta: Record<string, unknown> | null
}

let slotSeq = 0
function newSlotKey() {
  slotSeq += 1
  return `slot-${slotSeq}-${Date.now()}`
}

type LinkedIntercession = { id: string; visitor_name: string; message: string }

type PastPlace = { id: string; name: string; lat: number; lng: number }

type SubKey = 'thanks' | 'meditation'

export default function JournalForm({ mode, initial, initialPhotos, initialIntercessionId, initialCategory, initialHeadline }: Props) {
  const router = useRouter()

  const [entryDate, setEntryDate] = useState(initial?.entry_date ?? todayStr())
  const [category, setCategory] = useState(initial?.category ?? initialCategory ?? '')
  const [headline, setHeadline] = useState(initial?.headline ?? initialHeadline ?? '')
  const [todayText, setTodayText] = useState(initial?.today ?? '')
  const [thanks, setThanks] = useState(initial?.thanks ?? '')
  const [meditation, setMeditation] = useState(initial?.meditation ?? '')
  const [prayer, setPrayer] = useState(initial?.prayer ?? '')
  const [prayerCandidate, setPrayerCandidate] = useState(initial?.prayer_candidate ?? false)
  // 비공개: 전 계정 / 비밀글: 마스터 계정에만 토글 노출(patch102 RLS 가 DB 레벨로도 강제).
  const [isPrivate, setIsPrivate] = useState(initial?.is_private ?? false)
  const [isSecret, setIsSecret] = useState(initial?.is_secret ?? false)

  // 배타 규칙: 비밀글 ON → 비공개·기도후보 해제+비활성 / 비공개 ON → 기도후보 해제+비활성.
  function changeSecret(v: boolean) {
    setIsSecret(v)
    if (v) {
      setIsPrivate(false)
      setPrayerCandidate(false)
    }
  }
  function changePrivate(v: boolean) {
    setIsPrivate(v)
    if (v) setPrayerCandidate(false)
  }
  const [projectId, setProjectId] = useState(initial?.project_id ?? '')
  const [taskId, setTaskId] = useState(initial?.task_id ?? '')
  const [intercessionId, setIntercessionId] = useState<string | null>(
    initial?.intercession_id ?? initialIntercessionId ?? null,
  )
  const [linkedIntercession, setLinkedIntercession] = useState<LinkedIntercession | null>(null)

  // 다중 사진 슬롯(최대 MAX_JOURNAL_PHOTOS). 첫 슬롯 = 대표.
  const [photos, setPhotos] = useState<PhotoSlot[]>(() =>
    (initialPhotos ?? []).map((p) => ({
      key: newSlotKey(),
      path: p.path,
      thumb_path: p.thumb_path ?? null,
      url: p.url,
      isObjectUrl: false,
      placeName: p.place_name ?? '',
      takenAt: p.taken_at ? p.taken_at.slice(0, 10) : '',
      lat: p.lat,
      lng: p.lng,
      meta: p.meta,
    })),
  )
  // 편집 중 제거된 기존 사진 경로(저장 시 Storage 에서 삭제).
  const [removedPaths, setRemovedPaths] = useState<string[]>([])
  const [photoNote, setPhotoNote] = useState<string | null>(null)

  const [photoTakenAt, setPhotoTakenAt] = useState(
    initial?.photo_taken_at ? initial.photo_taken_at.slice(0, 10) : ''
  )
  const [photoLat, setPhotoLat] = useState(initial?.photo_lat != null ? String(initial.photo_lat) : '')
  const [photoLng, setPhotoLng] = useState(initial?.photo_lng != null ? String(initial.photo_lng) : '')
  const [applyPhotoDate, setApplyPhotoDate] = useState(false)

  const [placeName, setPlaceName] = useState(initial?.place_name ?? '')
  const [pastPlaces, setPastPlaces] = useState<PastPlace[]>([])
  const [placeNames, setPlaceNames] = useState<string[]>([])
  const [placeSuggestion, setPlaceSuggestion] = useState<{ name: string; dist: number } | null>(null)

  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Record<string, string>>({})
  const [meId, setMeId] = useState<string | null>(null)
  // 작성자(user_id) — 마스터만 AuthorSelect 로 변경 가능. 신규는 컴포넌트가 본인으로 채움.
  const [authorId, setAuthorId] = useState(initial?.user_id ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // 리디자인 UI 상태 (저장 로직과 무관 — 펼침/접힘·위치버튼만)
  const [openSubs, setOpenSubs] = useState<Record<SubKey, boolean>>({
    thanks: Boolean(initial?.thanks),
    meditation: Boolean(initial?.meditation),
  })
  const [showManualCoord, setShowManualCoord] = useState(false)
  const [geoBusy, setGeoBusy] = useState(false)
  const [geoMsg, setGeoMsg] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null))
    void supabase
      .from('app_members')
      .select('user_id, display_name')
      .then(({ data }) => {
        const m: Record<string, string> = {}
        for (const r of (data ?? []) as { user_id: string; display_name: string }[]) m[r.user_id] = r.display_name
        setMembers(m)
      })
    void supabase
      .from('projects')
      .select('id, title, user_id, status')
      .order('created_at', { ascending: false })
      .then(({ data }) => setProjects((data ?? []) as Project[]))
    void supabase
      .from('tasks')
      .select('id, title, project_id, user_id, done, status')
      .order('created_at', { ascending: false })
      .then(({ data }) => setTasks((data ?? []) as Task[]))
    void supabase
      .from('journal_entries')
      .select('id, place_name, photo_lat, photo_lng')
      .not('place_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        const rows = (data ?? []) as {
          id: string
          place_name: string | null
          photo_lat: number | null
          photo_lng: number | null
        }[]
        const pp: PastPlace[] = []
        const names: string[] = []
        for (const r of rows) {
          if (r.id === initial?.id) continue
          const nm = (r.place_name ?? '').trim()
          if (!nm) continue
          if (!names.includes(nm)) names.push(nm)
          if (r.photo_lat != null && r.photo_lng != null) {
            pp.push({ id: r.id, name: nm, lat: r.photo_lat, lng: r.photo_lng })
          }
        }
        setPastPlaces(pp)
        setPlaceNames(names)
      })
  }, [initial?.id])

  // 좌표가 있고 장소가 비어 있으면, 과거 기록에서 가장 가까운 장소(200m 이내)를 추천
  useEffect(() => {
    if (placeName) {
      setPlaceSuggestion(null)
      return
    }
    const la = Number(photoLat)
    const ln = Number(photoLng)
    if (!photoLat || !photoLng || Number.isNaN(la) || Number.isNaN(ln) || pastPlaces.length === 0) {
      setPlaceSuggestion(null)
      return
    }
    let best: { name: string; dist: number } | null = null
    for (const p of pastPlaces) {
      const d = haversineMeters(la, ln, p.lat, p.lng)
      if (best === null || d < best.dist) best = { name: p.name, dist: d }
    }
    setPlaceSuggestion(best && best.dist <= 200 ? best : null)
  }, [photoLat, photoLng, pastPlaces, placeName])

  // 연계된 중보기도 정보 로드(배너 표시용)
  useEffect(() => {
    if (!intercessionId) {
      setLinkedIntercession(null)
      return
    }
    const supabase = createClient()
    void supabase
      .from('intercessions')
      .select('id, visitor_name, message')
      .eq('id', intercessionId)
      .maybeSingle()
      .then(({ data }) => setLinkedIntercession((data as LinkedIntercession) ?? null))
  }, [intercessionId])

  async function addFiles(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const all = Array.from(input.files ?? []) // FileList 는 live 참조 — value 비우기 전에 먼저 복사
    input.value = '' // 같은 파일 다시 선택 허용
    if (all.length === 0) return
    const room = MAX_JOURNAL_PHOTOS - photos.length
    if (room <= 0) {
      setPhotoNote(`사진은 최대 ${MAX_JOURNAL_PHOTOS}장까지 첨부할 수 있습니다.`)
      return
    }
    const picked = all.slice(0, room)
    const wasEmpty = photos.length === 0
    const slots: PhotoSlot[] = []
    let firstMeta: PhotoMeta | null = null
    let anyMeta = false
    for (const f of picked) {
      const m = await readPhotoMeta(f)
      if (!firstMeta) firstMeta = m
      if (m.takenAt || m.lat != null) anyMeta = true
      slots.push({
        key: newSlotKey(),
        url: URL.createObjectURL(f),
        isObjectUrl: true,
        file: f,
        placeName: '',
        takenAt: m.takenAt ? m.takenAt.slice(0, 10) : '',
        lat: m.lat,
        lng: m.lng,
        meta: m.raw,
      })
    }
    setPhotos((cur) => [...cur, ...slots])

    // 첫 사진이 처음 추가될 때만 대표 촬영일·좌표·일지 날짜 자동 채움(기존 단일 동작 유지).
    if (wasEmpty && firstMeta) {
      if (firstMeta.takenAt) {
        setPhotoTakenAt(firstMeta.takenAt.slice(0, 10))
        setApplyPhotoDate(true)
        setEntryDate(firstMeta.takenAt.slice(0, 10))
      }
      if (firstMeta.lat != null) setPhotoLat(String(firstMeta.lat))
      if (firstMeta.lng != null) setPhotoLng(String(firstMeta.lng))
    }

    const overflow = all.length > room
    setPhotoNote(
      (anyMeta
        ? '사진에서 촬영일·위치 정보를 불러왔습니다.'
        : '이 사진에는 촬영일·위치 정보가 없습니다. 필요하면 촬영일·장소를 직접 입력하세요.') +
        (overflow ? ` (최대 ${MAX_JOURNAL_PHOTOS}장까지만 추가됨)` : ''),
    )
  }

  function removeSlot(key: string) {
    setPhotos((cur) => {
      const slot = cur.find((s) => s.key === key)
      if (slot?.isObjectUrl) URL.revokeObjectURL(slot.url)
      if (slot?.path) setRemovedPaths((r) => (r.includes(slot.path!) ? r : [...r, slot.path!]))
      return cur.filter((s) => s.key !== key)
    })
  }

  function setSlotPlace(key: string, val: string) {
    setPhotos((cur) => cur.map((s) => (s.key === key ? { ...s, placeName: val } : s)))
  }

  function changeTakenAt(val: string) {
    setPhotoTakenAt(val)
    if (applyPhotoDate && val) setEntryDate(val)
  }

  function toggleApply(checked: boolean) {
    setApplyPhotoDate(checked)
    if (checked && photoTakenAt) setEntryDate(photoTakenAt)
  }

  // 「현재 위치」 — 좌표만 채움. 장소 추천은 기존 200m 로직이 자동 처리.
  function useCurrentLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoMsg('이 기기에서는 위치를 사용할 수 없습니다.')
      return
    }
    setGeoBusy(true)
    setGeoMsg(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPhotoLat(String(pos.coords.latitude))
        setPhotoLng(String(pos.coords.longitude))
        setGeoBusy(false)
        setGeoMsg('현재 위치 좌표를 불러왔습니다.')
      },
      (err) => {
        setGeoBusy(false)
        setGeoMsg(
          err.code === err.PERMISSION_DENIED
            ? '위치 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요.'
            : '현재 위치를 가져오지 못했습니다.'
        )
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function save() {
    if (!headline.trim() && !todayText.trim()) {
      setMsg('제목 또는 오늘의 기록을 입력해 주세요.')
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

    // 새 파일이 있는 슬롯만 업로드 → 슬롯별 path 확정.
    let finalSlots: PhotoSlot[]
    try {
      finalSlots = []
      for (const s of photos) {
        if (s.file && !s.path) {
          const { path, thumb_path } = await uploadJournalPhoto(supabase, user.id, s.file)
          finalSlots.push({ ...s, path, thumb_path })
        } else {
          finalSlots.push(s)
        }
      }
    } catch (err) {
      setSaving(false)
      setMsg('사진 업로드 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'))
      return
    }

    const photosPayload: JournalPhoto[] = finalSlots
      .filter((s) => s.path)
      .map((s, i) => ({
        path: s.path as string,
        thumb_path: s.thumb_path ?? null,
        // 첫 사진(대표)은 대표 장소칸을, 나머지는 사진별 입력값을 사용.
        place_name: (i === 0 ? placeName.trim() : s.placeName.trim()) || null,
        // 첫 사진은 대표 촬영일(일지 날짜 연동)을 우선 사용.
        taken_at: (i === 0 ? photoTakenAt || s.takenAt : s.takenAt) || null,
        lat: s.lat,
        lng: s.lng,
        meta: s.meta,
      }))
    const first = photosPayload[0] ?? null

    const latNum = photoLat.trim() ? Number(photoLat) : null
    const lngNum = photoLng.trim() ? Number(photoLng) : null
    const repLat = latNum != null && !Number.isNaN(latNum) ? latNum : null
    const repLng = lngNum != null && !Number.isNaN(lngNum) ? lngNum : null

    const payload = {
      user_id: resolveOwnerId({ chosen: authorId, existingOwnerId: initial?.user_id, viewerId: user.id }),
      entry_date: entryDate,
      category: category || null,
      headline: headline.trim() || null,
      today: todayText.trim() || null,
      thanks: thanks.trim() || null,
      meditation: meditation.trim() || null,
      prayer: prayer.trim() || null,
      prayer_candidate: prayerCandidate,
      is_private: isPrivate,
      // 비밀글 지정은 마스터만 — 비마스터 편집 시 기존 값 유지(RLS 도 동일 규칙 강제).
      is_secret: isMaster(user.id) ? isSecret : (initial?.is_secret ?? false),
      project_id: projectId || null,
      task_id: taskId || null,
      intercession_id: intercessionId,
      photos: photosPayload.length ? photosPayload : null,
      // 레거시 단일 컬럼 — 첫 사진 기준으로 호환 유지.
      photo_path: first?.path ?? null,
      photo_taken_at: photoTakenAt || first?.taken_at || null,
      photo_lat: repLat ?? first?.lat ?? null,
      photo_lng: repLng ?? first?.lng ?? null,
      photo_meta: first?.meta ?? null,
      place_name: placeName.trim() || null,
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

    // 제거된 기존 사진 Storage 정리 — 최종 photos 에 없는 경로만(원본 + 그 썸네일).
    const finalPaths = new Set(photosPayload.map((p) => p.path))
    const toRemove = removedPaths.filter((p) => !finalPaths.has(p))
    const legacyPath = initial?.photo_path
    if (legacyPath && !finalPaths.has(legacyPath) && !toRemove.includes(legacyPath)) {
      toRemove.push(legacyPath)
    }
    // 제거 대상 원본의 썸네일도 함께 삭제(편집 진입 시점의 initialPhotos 기준).
    const thumbByOrig = new Map(
      (initialPhotos ?? [])
        .filter((ip) => ip.thumb_path)
        .map((ip) => [ip.path, ip.thumb_path as string]),
    )
    const allToRemove = [
      ...toRemove,
      ...toRemove.flatMap((p) => {
        const t = thumbByOrig.get(p)
        return t ? [t] : []
      }),
    ]
    if (allToRemove.length) {
      try {
        await supabase.storage.from('journal-photos').remove(allToRemove)
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
  const small = 'mb-1 mt-4 block text-xs text-muted'
  const sectionTitle = 'mb-1 block text-sm font-bold text-primary'
  const hasPhotoInfo = photos.length > 0
  const canAddPhoto = photos.length < MAX_JOURNAL_PHOTOS
  const placeMatches = placeNames
    .filter((n) => n !== placeName && (!placeName || n.toLowerCase().includes(placeName.toLowerCase())))
    .slice(0, 6)

  // ── 연계(프로젝트↔할일) 양방향 필터 + 완료 항목 분리 ──
  // 현재 선택값의 표시명(완료·필터 제외 항목이어도 항상 보이게).
  const projectLabel = useMemo(
    () => projects.find((p) => p.id === projectId)?.title ?? '',
    [projects, projectId],
  )
  const taskLabel = useMemo(() => tasks.find((t) => t.id === taskId)?.title ?? '', [tasks, taskId])
  // 작성자 보조표기(내 것이 아니면 이름).
  const subOf = (uid: string) => (uid && uid !== meId && members[uid] ? members[uid] : undefined)

  // 프로젝트 후보: 할일을 먼저 고르면 그 할일의 프로젝트로 좁힘. 완료(status='done')는 따로.
  const projectItems = useMemo(() => {
    const selTask = tasks.find((t) => t.id === taskId)
    const cand =
      taskId && selTask?.project_id
        ? projects.filter((p) => p.id === selTask.project_id)
        : projects
    const active: PickerItem[] = []
    const done: PickerItem[] = []
    for (const p of cand) {
      const item: PickerItem = { id: p.id, title: p.title, sub: subOf(p.user_id) }
      ;(p.status === 'done' ? done : active).push(item)
    }
    return { active, done }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, tasks, taskId, meId, members])

  // 할일 후보: 프로젝트를 먼저 고르면 그 프로젝트 소속만. 완료(done 또는 status='done')는 따로.
  const taskItems = useMemo(() => {
    const cand = projectId ? tasks.filter((t) => t.project_id === projectId) : tasks
    const active: PickerItem[] = []
    const done: PickerItem[] = []
    for (const t of cand) {
      const item: PickerItem = { id: t.id, title: t.title, sub: subOf(t.user_id) }
      ;(t.done || t.status === 'done' ? done : active).push(item)
    }
    return { active, done }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, projectId, meId, members])

  function pickProject(id: string) {
    setProjectId(id)
    // 프로젝트를 바꿔 기존 선택 할일이 안 맞으면 할일 해제.
    if (id && taskId) {
      const t = tasks.find((x) => x.id === taskId)
      if (t && t.project_id !== id) setTaskId('')
    }
  }
  function pickTask(id: string) {
    setTaskId(id)
    // 할일을 고르면 그 할일의 프로젝트로 자동 설정.
    if (id) {
      const t = tasks.find((x) => x.id === id)
      if (t?.project_id) setProjectId(t.project_id)
    }
  }

  function toggleSub(k: SubKey) {
    setOpenSubs((s) => ({ ...s, [k]: !s[k] }))
  }

  const subFilled: Record<SubKey, boolean> = {
    thanks: Boolean(thanks.trim()),
    meditation: Boolean(meditation.trim()),
  }
  const subLabel: Record<SubKey, string> = {
    thanks: '🙏 감사·응답',
    meditation: '💭 묵상·깨달음',
  }
  const subValue: Record<SubKey, string> = { thanks, meditation }
  const subSet: Record<SubKey, (v: string) => void> = { thanks: setThanks, meditation: setMeditation }

  // 카드(기재구역): 흰 면 + 테두리 + 라운드(24px) + 옅은 그림자. paper 배경 위에서 또렷.
  const card = 'rounded-3xl border border-line bg-surface p-5 shadow-sm'
  // 카드 안의 하위 묶음(사진정보·기도제목): 한 단계 안쪽 톤(테두리 없이 채움).
  const innerBox = 'rounded-2xl bg-surface-subtle p-4'

  return (
    <main className="app-theme mx-auto max-w-md px-4 pb-10 sm:max-w-3xl lg:max-w-6xl">
      {/* 상단바(미니멀): ‹ Log + 중앙 제목 */}
      <header className="relative -mx-4 mb-5 flex items-center justify-between border-b border-line px-4 py-3">
        <BackButton
          href={mode === 'edit' && initial ? `/journal/${initial.id}` : '/journal'}
          label=""
          variant="text"
        />
        <h1 className="absolute left-1/2 -translate-x-1/2 font-display text-lg font-extrabold uppercase tracking-[0.15em] text-primary">
          {mode === 'edit' ? 'Edit Log' : 'New Log'}
        </h1>
        <span className="w-10" aria-hidden="true" />
      </header>

      {mode === 'edit' && (
        <AuthorSelect value={authorId} onChange={setAuthorId} className={input} />
      )}

      {/* 헤더 줄: 날짜+오늘 / 사역분류 — 카드로 묶음 */}
      <div className={`${card} mb-4`}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1 flex h-7 items-center gap-2">
              <label className="text-sm font-bold text-primary">날짜</label>
              <button
                type="button"
                onClick={() => setEntryDate(todayStr())}
                className="rounded-md border border-accent px-2 py-0.5 text-[11px] font-semibold text-accent"
              >
                오늘
              </button>
            </div>
            <DateField value={entryDate} onChange={setEntryDate} placeholder="날짜 선택" />
          </div>
          <div>
            <div className="mb-1 flex h-7 items-center">
              <label className="text-sm font-bold text-primary">사역 분류</label>
            </div>
            <CategorySelect value={category} onChange={setCategory} className={input} emptyLabel="선택 안 함" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.5fr_1fr] lg:grid-cols-[1.8fr_1fr]">
        {/* ── 좌측 카드: 본문 ── */}
        <div className={`${card} min-w-0`}>
          <label className={sectionTitle}>✏️ 제목</label>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className={input}
            placeholder="오늘의 핵심을 한 문장으로"
          />

          <label className={`${sectionTitle} mt-5`}>🌿 오늘의 기록</label>
          <textarea
            value={todayText}
            onChange={(e) => setTodayText(e.target.value)}
            rows={5}
            className={`${input} resize-y min-h-[110px] [field-sizing:content]`}
            placeholder="오늘 한 일·만난 사람·있었던 일을 사실대로 기록하세요"
          />
          <p className="mt-1 text-[11px] leading-relaxed text-faint">
            마크다운 지원 — **볼드** · *기울임* · # 제목 · - 목록 · 1. 번호 · &gt; 인용 · [링크](주소) · 표 · ---
          </p>

          {/* 감사·묵상: 접이식. 데스크탑은 2열 칩, 모바일은 세로 스택. */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(['thanks', 'meditation'] as SubKey[]).map((k) => (
              <div key={k}>
                <button
                  type="button"
                  onClick={() => toggleSub(k)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                    openSubs[k] || subFilled[k]
                      ? 'border-primary bg-surface-subtle text-primary'
                      : 'border-line bg-surface-subtle text-muted hover:border-primary'
                  }`}
                >
                  <span>{subLabel[k]}</span>
                  <span className="text-xs">
                    {subFilled[k] && !openSubs[k] ? '작성됨' : openSubs[k] ? '▾' : '＋'}
                  </span>
                </button>
                {openSubs[k] && (
                  <textarea
                    value={subValue[k]}
                    onChange={(e) => subSet[k](e.target.value)}
                    rows={3}
                    className={`${input} mt-2 min-h-[76px] [field-sizing:content]`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* 기도제목: 기본 펼침 + 편지후보 체크 — 마룬 틴트 강조 묶음 */}
          <div className="mt-4 rounded-2xl bg-accent-soft p-4">
            <label className="mb-1 block text-sm font-bold text-accent">📌 기도제목</label>
            <textarea
              value={prayer}
              onChange={(e) => setPrayer(e.target.value)}
              rows={3}
              className={`${input} min-h-[64px] [field-sizing:content]`}
              placeholder="예: 자포탈 교회 건축 / 가정 평강"
            />
          </div>

          {/* 기도후보·비공개·비밀글 — 한 섹션, 명칭+체크박스만(배타 규칙은 changeSecret/changePrivate). */}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-surface-subtle p-4">
            <label
              className={`flex items-center gap-2 text-sm ${
                isPrivate || isSecret ? 'text-faint opacity-50' : 'text-muted'
              }`}
            >
              <input
                type="checkbox"
                checked={prayerCandidate}
                disabled={isPrivate || isSecret}
                onChange={(e) => setPrayerCandidate(e.target.checked)}
              />
              기도후보
            </label>
            <label
              className={`flex items-center gap-2 text-sm ${
                isSecret ? 'text-faint opacity-50' : 'text-muted'
              }`}
            >
              <input
                type="checkbox"
                checked={isPrivate}
                disabled={isSecret}
                onChange={(e) => changePrivate(e.target.checked)}
              />
              비공개
            </label>
            {isMaster(meId) && (
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={isSecret}
                  onChange={(e) => changeSecret(e.target.checked)}
                />
                비밀글
              </label>
            )}
          </div>
        </div>

        {/* ── 우측 카드: 사진 + 연계 ── */}
        <div className={`${card} min-w-0`}>
          <div className="flex items-center justify-between gap-2">
            <span className="shrink-0 whitespace-nowrap text-sm font-bold text-primary">
              📷 사진{' '}
              <span className="text-xs font-normal text-faint">
                ({photos.length}/{MAX_JOURNAL_PHOTOS})
              </span>
            </span>
            <label
              className={`shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                canAddPhoto
                  ? 'cursor-pointer border-line text-muted hover:border-primary'
                  : 'cursor-not-allowed border-line text-faint opacity-50'
              }`}
            >
              사진 추가
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={addFiles}
                disabled={!canAddPhoto}
                className="hidden"
              />
            </label>
          </div>

          {photos.length > 0 && (
            <ul className="mt-3 space-y-2">
              {photos.map((s, i) => (
                <li
                  key={s.key}
                  className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.url}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg border border-line object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    {i === 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-block rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                          대표
                        </span>
                        <span className="text-[11px] text-faint">장소는 아래 ‘대표 장소’ 적용</span>
                      </div>
                    ) : (
                      <input
                        value={s.placeName}
                        onChange={(e) => setSlotPlace(s.key, e.target.value)}
                        className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                        placeholder={placeName ? `대표: ${placeName}` : '이 사진 장소 (선택)'}
                      />
                    )}
                    {(s.takenAt || s.lat != null) && (
                      <p className="mt-1 text-[11px] text-faint">
                        {s.takenAt && <span>📅 {s.takenAt}</span>}
                        {s.takenAt && s.lat != null && <span> · </span>}
                        {s.lat != null && <span>📍 위치 있음</span>}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSlot(s.key)}
                    className="shrink-0 rounded-lg border border-line px-2 py-1 text-xs text-danger hover:border-danger"
                    aria-label="사진 제거"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          {photoNote && <p className="mt-2 text-xs text-faint">{photoNote}</p>}

          {/* 사진 정보 묶음 — 사진 있을 때만 펼침 */}
          {hasPhotoInfo ? (
            <div className={`mt-4 ${innerBox}`}>
              <p className="mb-3 text-xs font-bold text-muted">사진 정보 (선택 시 자동 채움)</p>

              <label className="mb-1 block text-xs text-muted">대표 장소 (목록·검색 표시)</label>
              <input
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                className={input}
                placeholder="장소 — 예: 자포탈 더좋은교회"
              />
              {placeSuggestion && (
                <button
                  type="button"
                  onClick={() => setPlaceName(placeSuggestion.name)}
                  className="mt-2 block text-xs font-semibold text-accent underline"
                >
                  📍 근처 기록 위치: ‘{placeSuggestion.name}’ 사용 (약 {Math.round(placeSuggestion.dist)}m)
                </button>
              )}
              {placeMatches.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {placeMatches.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPlaceName(n)}
                      className="rounded-full bg-surface px-2.5 py-1 text-[11px] text-muted"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}

              <label className="mb-1 mt-4 block text-xs text-muted">촬영일 (메타데이터 · 수정 가능)</label>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <DateField value={photoTakenAt} onChange={changeTakenAt} placeholder="촬영일 없음" />
                </div>
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={geoBusy}
                  className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-primary hover:border-primary disabled:opacity-50"
                >
                  {geoBusy ? '확인 중…' : '◎ 위치'}
                </button>
              </div>
              <label
                className={`mt-2 flex items-center gap-2 text-xs ${
                  photoTakenAt ? 'text-muted' : 'text-faint'
                }`}
              >
                <input
                  type="checkbox"
                  checked={applyPhotoDate}
                  disabled={!photoTakenAt}
                  onChange={(e) => toggleApply(e.target.checked)}
                />
                촬영일을 일지 날짜로 사용
              </label>

              {(photoLat || photoLng) && (
                <p className="mt-2 text-xs text-faint">
                  좌표: {photoLat || '—'}, {photoLng || '—'}
                </p>
              )}
              {geoMsg && <p className="mt-1 text-xs text-faint">{geoMsg}</p>}

              <button
                type="button"
                onClick={() => setShowManualCoord((v) => !v)}
                className="mt-2 text-xs text-muted underline"
              >
                {showManualCoord ? '직접 입력 닫기' : '좌표 직접 입력'}
              </button>
              {showManualCoord && (
                <div className="mt-2 flex gap-2">
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
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs text-faint">
              사진을 선택하면 장소·촬영일·위치 정보를 입력할 수 있습니다.
            </p>
          )}

          {/* 연계된 중보기도 배너 */}
          {linkedIntercession && (
            <div className="mt-5 rounded-2xl border border-primary bg-primary-soft p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-primary">🙏 중보기도 연계</span>
                <button
                  type="button"
                  onClick={() => setIntercessionId(null)}
                  className="text-[11px] font-semibold text-primary/70 underline"
                >
                  연결 해제
                </button>
              </div>
              <p className="mt-1 text-xs font-semibold text-ink">{linkedIntercession.visitor_name}</p>
              <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-muted">
                {linkedIntercession.message}
              </p>
            </div>
          )}

          {/* 연계 한 줄 — 프로젝트↔할일 양방향 필터 + 완료 항목 접이식 */}
          <label className={`${sectionTitle} mt-5`}>🔗 연계 (선택)</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <LinkedPicker
              value={projectId}
              onChange={pickProject}
              activeItems={projectItems.active}
              doneItems={projectItems.done}
              selectedLabel={projectLabel}
              placeholder="프로젝트 없음"
              emptyLabel="프로젝트 없음"
              doneLabel="완료된 프로젝트"
            />
            <LinkedPicker
              value={taskId}
              onChange={pickTask}
              activeItems={taskItems.active}
              doneItems={taskItems.done}
              selectedLabel={taskLabel}
              placeholder="할 일 없음"
              emptyLabel="할 일 없음"
              doneLabel="완료된 할 일"
            />
          </div>

          {msg && <p className="mt-4 text-sm text-danger">{msg}</p>}

          <button
            onClick={save}
            disabled={saving}
            className="mt-6 w-full rounded-xl bg-accent py-4 font-display text-[15px] font-bold uppercase tracking-[0.15em] text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? '저장 중…' : 'Save Log'}
          </button>
        </div>
      </div>
    </main>
  )
}
