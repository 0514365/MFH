// MFH-JOURNAL-REDESIGN-V3
'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { readPhotoMeta, uploadJournalPhoto } from '@/lib/photo'
import CategorySelect from '@/components/CategorySelect'
import BackButton from '@/components/BackButton'
import { haversineMeters } from '@/lib/geo'
import type { JournalEntry, Project, Task } from '@/lib/types'
import DateField from './DateField'

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

type PastPlace = { id: string; name: string; lat: number; lng: number }

type SubKey = 'thanks' | 'meditation'

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

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (preview) URL.revokeObjectURL(preview)
    if (!f) {
      setFile(null)
      setPreview(null)
      setPhotoNote(null)
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

    if (m.takenAt || m.lat != null) {
      const parts: string[] = []
      if (m.takenAt) parts.push('촬영일')
      if (m.lat != null) parts.push('위치')
      setPhotoNote(`사진에서 ${parts.join(' · ')} 정보를 불러왔습니다.`)
    } else {
      setPhotoNote(
        '이 사진에는 촬영일·위치 정보가 없습니다. 편집본이나 메신저로 받은 사진일 수 있어요. 필요하면 아래에서 촬영일을 직접 입력하세요.'
      )
    }
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
    setPhotoNote(null)
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
  const small = 'mb-1 mt-4 block text-xs text-muted'
  const sectionTitle = 'mb-1 block text-sm font-bold text-primary'
  const showPhoto = preview ?? existingUrl
  const hasPhotoInfo = Boolean(showPhoto || file)
  const placeMatches = placeNames
    .filter((n) => n !== placeName && (!placeName || n.toLowerCase().includes(placeName.toLowerCase())))
    .slice(0, 6)

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

  // 카드(기재구역): 흰 면 + 테두리 + 라운드. paper 배경 위에서 구역이 또렷해진다.
  const card = 'rounded-2xl border border-line bg-surface p-4 sm:p-5'
  // 카드 안의 하위 묶음(사진정보·기도제목): 한 단계 안쪽 톤.
  const innerBox = 'rounded-2xl border border-line bg-surface-subtle p-4'

  return (
    <main className="mx-auto max-w-md px-4 py-8 sm:max-w-3xl lg:max-w-6xl">
      <BackButton
        href={mode === 'edit' && initial ? `/journal/${initial.id}` : '/journal'}
        label="Log"
      />
      <h1 className="mb-4 mt-2 font-display text-2xl font-extrabold text-primary">
        {mode === 'edit' ? 'Edit Log' : 'New Log'}
      </h1>

      {/* 헤더 줄: 날짜+오늘 / 사역분류 — 카드로 묶음 */}
      <div className={`${card} mb-4`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted">일지 날짜</label>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <DateField value={entryDate} onChange={setEntryDate} placeholder="날짜 선택" />
              </div>
              <button
                type="button"
                onClick={() => setEntryDate(todayStr())}
                className="shrink-0 rounded-lg border border-accent px-3 py-2 text-xs font-semibold text-accent"
              >
                오늘
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">사역 분류</label>
            <CategorySelect value={category} onChange={setCategory} className={input} emptyLabel="선택 안 함" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.5fr_1fr] lg:grid-cols-[1.8fr_1fr]">
        {/* ── 좌측 카드: 본문 ── */}
        <div className={`${card} min-w-0`}>
          <label className="mb-1 block text-xs text-muted">한 줄 머리말</label>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className={input}
            placeholder="오늘의 핵심을 한 문장으로"
          />

          <label className={`${sectionTitle} mt-5`}>🌿 오늘 있었던 일</label>
          <textarea
            value={todayText}
            onChange={(e) => setTodayText(e.target.value)}
            rows={5}
            className={`${input} resize-y`}
            placeholder="오늘 한 일·만난 사람·있었던 일을 사실대로 기록하세요"
          />

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
                    className={`${input} mt-2`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* 기도제목: 기본 펼침 + 편지후보 체크 — 강조 묶음 */}
          <div className="mt-4 rounded-2xl border border-primary bg-surface-subtle p-4">
            <label className={sectionTitle}>📌 기도제목</label>
            <textarea
              value={prayer}
              onChange={(e) => setPrayer(e.target.value)}
              rows={3}
              className={input}
              placeholder="예: 자포탈 교회 건축 / 가정 평강"
            />
            <label className="mt-2 flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={prayerCandidate}
                onChange={(e) => setPrayerCandidate(e.target.checked)}
              />
              이번 달 편지 후보로 표시
            </label>
          </div>
        </div>

        {/* ── 우측 카드: 사진 + 연계 ── */}
        <div className={`${card} min-w-0`}>
          <div className="flex items-center justify-between gap-2">
            <span className="shrink-0 whitespace-nowrap text-sm font-bold text-primary">📷 사진</span>
            <label className="shrink-0 cursor-pointer whitespace-nowrap rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:border-primary">
              파일 선택
              <input type="file" accept="image/*" onChange={onPick} className="hidden" />
            </label>
          </div>
          {showPhoto && (
            <div className="mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={showPhoto} alt="" className="w-full rounded-xl border border-line" />
              <button
                type="button"
                onClick={removeCurrentPhoto}
                className="mt-2 text-xs text-danger underline"
              >
                사진 제거
              </button>
            </div>
          )}
          {photoNote && <p className="mt-2 text-xs text-faint">{photoNote}</p>}

          {/* 사진 정보 묶음 — 사진 있을 때만 펼침 */}
          {hasPhotoInfo ? (
            <div className={`mt-4 ${innerBox}`}>
              <p className="mb-3 text-xs font-bold text-muted">사진 정보 (선택 시 자동 채움)</p>

              <label className="mb-1 block text-xs text-muted">장소 (사진 위치 이름)</label>
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

          {/* 연계 한 줄 */}
          <label className={`${sectionTitle} mt-5`}>🔗 연계 (선택)</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={input}>
              <option value="">프로젝트 없음</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className={input}>
              <option value="">할 일 없음</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {msg && <p className="mt-4 text-sm text-danger">{msg}</p>}

          <button
            onClick={save}
            disabled={saving}
            className="mt-6 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? '저장 중…' : mode === 'edit' ? '수정 저장' : '저장'}
          </button>
        </div>
      </div>
    </main>
  )
}
