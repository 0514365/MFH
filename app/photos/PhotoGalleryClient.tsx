'use client'
// MFH-PHOTO-GALLERY-CLIENT-V3
// 월 선택 → 사역 분류별 사진 그리드.
//  · 기본: 사진을 탭하면 라이트박스로 크게 보기. '선택' 모드에서만 다중선택 → ZIP 내보내기.
//  · ZIP: 선택 사진의 Signed URL 을 브라우저에서 fetch → 분류 폴더로 묶어 다운로드(서버 부하 0).
//  · 캡션: 표시 = 수동(caption) 우선 → AI(ai_caption). 라이트박스에서 본인(또는 마스터) 사진은 수동 캡션 직접 입력/수정.
//    수동 캡션은 그 일지의 photos jsonb 배열에 저장(RLS 본인·마스터). AI 재스캔이 수동을 덮지 않음(표시 우선).
//  · 헤더(홈 로고·Calendar·Insights·Photos)는 page.tsx 의 PageHeader 가 담당.
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import JSZip from 'jszip'
import { JOURNAL_CATEGORIES } from '@/lib/constants'
import { createClient } from '@/lib/supabase-browser'
import { canEditEntry } from '@/lib/members'
import { downloadFile, filenameFromPathOrUrl } from '@/lib/download'

// 사진 출처 — 일지 / 할 일 / 프로젝트. 캡션 저장 시 갱신할 테이블·컬럼을 가른다.
export type PhotoSource = 'journal' | 'task' | 'project'

// 출처별 캡션 저장 대상(테이블·jsonb 컬럼). journal=photos, task/project=attachments.
const SOURCE_CFG: Record<PhotoSource, { table: string; col: 'photos' | 'attachments'; label: string | null }> = {
  journal: { table: 'journal_entries', col: 'photos', label: null },
  task: { table: 'tasks', col: 'attachments', label: '할 일' },
  project: { table: 'projects', col: 'attachments', label: '프로젝트' },
}

// 캡션을 가진 jsonb 요소(JournalPhoto·Attachment 공통 형태).
type Captionable = { path?: string; caption?: string | null; ai_caption?: string | null }

export type PhotoItem = {
  url: string
  // 그리드용 썸네일(없으면 url). 라이트박스·ZIP 은 url=원본.
  thumbUrl: string
  path: string
  date: string | null
  category: string | null
  headline: string | null
  takenAt: string | null
  // 표시용(수동 우선 → AI).
  caption: string | null
  // 편집 대상(수동) + 참고용(AI).
  manualCaption: string | null
  aiCaption: string | null
  // 출처 + 저장 대상 행 id(journal 일지 / task·project 행).
  source: PhotoSource
  rowId: string
  // 출처 항목 제목(task/project — 라이트박스 맥락). journal 은 null.
  sourceTitle: string | null
  ownerId: string
}

export default function PhotoGalleryClient({
  month,
  entryCount,
  photos,
  currentUserId,
}: {
  month: string
  entryCount: number
  photos: PhotoItem[]
  currentUserId: string
}) {
  const router = useRouter()
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [lightbox, setLightbox] = useState<PhotoItem | null>(null)
  const [downloadingOrig, setDownloadingOrig] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  // 서버에서 받은 사진의 로컬 사본 — 캡션 편집을 즉시 반영(월 이동 시 prop 동기화).
  const [items, setItems] = useState<PhotoItem[]>(photos)
  useEffect(() => {
    setItems(photos)
  }, [photos])

  // 라이트박스 캡션 편집 상태.
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionDraft, setCaptionDraft] = useState('')
  const [savingCaption, setSavingCaption] = useState(false)
  const [captionMsg, setCaptionMsg] = useState('')

  function changeMonth(delta: number) {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    const nm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    router.push(`/photos?month=${nm}`)
  }

  function toggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }
  function selectAll() {
    setSelected(new Set(items.map((p) => p.path)))
  }
  function clearSel() {
    setSelected(new Set())
  }
  function exitSelect() {
    setSelecting(false)
    clearSel()
    setMsg('')
  }

  // 라이트박스 열기 — 편집 상태 초기화.
  function openLightbox(p: PhotoItem) {
    setLightbox(p)
    setEditingCaption(false)
    setCaptionMsg('')
  }
  function closeLightbox() {
    setLightbox(null)
    setEditingCaption(false)
    setCaptionMsg('')
  }

  // 라이트박스의 원본을 기기에 저장(목록은 썸네일이라 원본 url 로 받는다).
  async function onDownloadOriginal() {
    if (!lightbox) return
    setDownloadingOrig(true)
    try {
      await downloadFile(lightbox.url, filenameFromPathOrUrl(lightbox.path))
    } finally {
      setDownloadingOrig(false)
    }
  }

  // 사진 탭 — 선택 모드면 토글, 아니면 라이트박스로 크게 보기.
  function onPhotoClick(p: PhotoItem) {
    if (selecting) toggle(p.path)
    else openLightbox(p)
  }

  function startEditCaption() {
    if (!lightbox) return
    setCaptionDraft(lightbox.manualCaption ?? '')
    setCaptionMsg('')
    setEditingCaption(true)
  }

  // 수동 캡션 저장 — 출처(일지/할 일/프로젝트) 행의 jsonb 배열에서 path 매칭 요소의 caption 갱신(RLS 본인·마스터).
  async function saveCaption() {
    if (!lightbox) return
    setSavingCaption(true)
    setCaptionMsg('')
    const text = captionDraft.trim()
    const supabase = createClient()
    const cfg = SOURCE_CFG[lightbox.source]
    const { data, error: selErr } = await supabase
      .from(cfg.table)
      .select(cfg.col)
      .eq('id', lightbox.rowId)
      .single()
    if (selErr || !data) {
      setSavingCaption(false)
      setCaptionMsg('저장 실패: 항목을 찾지 못했습니다.')
      return
    }
    const raw = (data as Record<string, unknown>)[cfg.col]
    const arr = (Array.isArray(raw) ? raw : []) as Captionable[]
    if (!arr.some((p) => p?.path === lightbox.path)) {
      setSavingCaption(false)
      setCaptionMsg('이 사진은 캡션 저장을 지원하지 않습니다(레거시 단일 사진).')
      return
    }
    const manual = text || null
    const next = arr.map((p) => (p?.path === lightbox.path ? { ...p, caption: manual } : p))
    const { error } = await supabase
      .from(cfg.table)
      .update({ [cfg.col]: next })
      .eq('id', lightbox.rowId)
    if (error) {
      setSavingCaption(false)
      setCaptionMsg('저장 실패: ' + error.message)
      return
    }
    const eff = manual ?? lightbox.aiCaption
    const same = (p: PhotoItem) =>
      p.path === lightbox.path && p.rowId === lightbox.rowId && p.source === lightbox.source
    setItems((prev) =>
      prev.map((p) => (same(p) ? { ...p, caption: eff, manualCaption: manual } : p)),
    )
    setLightbox((prev) => (prev ? { ...prev, caption: eff, manualCaption: manual } : prev))
    setSavingCaption(false)
    setEditingCaption(false)
  }

  // 분류별 그룹(시드 카테고리 순서 → 그 외 → 미분류).
  const grouped = useMemo(() => {
    const map = new Map<string, PhotoItem[]>()
    for (const p of items) {
      const k = p.category && p.category.trim() ? p.category.trim() : '미분류'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(p)
    }
    const order = [...JOURNAL_CATEGORIES]
    return Array.from(map.entries()).sort((a, b) => {
      const ia = order.indexOf(a[0] as (typeof JOURNAL_CATEGORIES)[number])
      const ib = order.indexOf(b[0] as (typeof JOURNAL_CATEGORIES)[number])
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    })
  }, [items])

  // 선택 사진 ZIP 내보내기(클라). Signed URL fetch → 분류 폴더로 묶기 → 다운로드.
  async function exportZip() {
    const targets = items.filter((p) => selected.has(p.path))
    if (targets.length === 0) {
      setMsg('선택된 사진이 없습니다.')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      const zip = new JSZip()
      let idx = 0
      for (const p of targets) {
        idx++
        const res = await fetch(p.url)
        if (!res.ok) continue
        const blob = await res.blob()
        const ext = (p.path.split('.').pop() || 'jpg').toLowerCase()
        const cat = p.category && p.category.trim() ? p.category.trim() : '미분류'
        zip.file(`${cat}/${p.date ?? 'nodate'}-${String(idx).padStart(2, '0')}.${ext}`, blob)
      }
      const out = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(out)
      const a = document.createElement('a')
      a.href = url
      a.download = `mfh-photos-${month}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setMsg(`${targets.length}장을 ZIP으로 내보냈습니다.`)
    } catch {
      setMsg('내보내기에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const selCount = selected.size
  const [yLabel, mLabel] = month.split('-')
  const monthLabel = `${yLabel}년 ${Number(mLabel)}월`

  return (
    <>
      {/* 월 선택 — 큰 잉크 제목 + 좌우 원형 네비 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => changeMonth(-1)}
          aria-label="이전 달"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:border-primary"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[22px] font-semibold tracking-tight text-ink">{monthLabel}</div>
          <div className="mt-0.5 text-[12px] text-muted">
            일지 {entryCount}건 · 사진 {items.length}장
          </div>
        </div>
        <button
          onClick={() => changeMonth(1)}
          aria-label="다음 달"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:border-primary"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* 도구 막대 — 기본: 안내 + '선택' / 선택 모드: 다중선택 도구 */}
      {items.length > 0 && (
        <div className="sticky top-[64px] z-10 mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface/95 px-3 py-2 backdrop-blur">
          {!selecting ? (
            <>
              <span className="text-xs text-muted">사진을 탭하면 크게 보고 캡션을 넣을 수 있어요</span>
              <button
                onClick={() => setSelecting(true)}
                className="ml-auto rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent transition hover:opacity-80"
              >
                선택
              </button>
            </>
          ) : (
            <>
              <span className="text-xs text-muted">
                {selCount > 0 ? `${selCount}장 선택됨` : '사진을 탭해 선택'}
              </span>
              <button
                onClick={selectAll}
                className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted transition hover:border-primary"
              >
                전체 선택
              </button>
              <button
                onClick={clearSel}
                disabled={selCount === 0}
                className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted transition hover:border-primary disabled:opacity-40"
              >
                해제
              </button>
              <button
                onClick={exportZip}
                disabled={busy || selCount === 0}
                className="ml-auto rounded-full bg-accent px-3.5 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {busy ? '내보내는 중…' : 'ZIP 내보내기'}
              </button>
              <button
                onClick={exitSelect}
                className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted transition hover:border-primary"
              >
                완료
              </button>
            </>
          )}
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}

      {/* 사진 그리드 */}
      <section className="mt-5">
        {items.length === 0 ? (
          <p className="text-xs text-faint">이 달엔 사진이 없습니다.</p>
        ) : (
          grouped.map(([cat, list]) => (
            <div key={cat} className="mt-4">
              <div className="mb-3 flex items-baseline gap-1.5">
                <span className="text-[17px] font-semibold tracking-tight text-ink">{cat}</span>
                <span className="text-[12px] font-medium text-muted">{list.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {list.map((p) => {
                  const on = selected.has(p.path)
                  const badge = SOURCE_CFG[p.source].label
                  return (
                    <button
                      key={`${p.source}-${p.rowId}-${p.path}`}
                      onClick={() => onPhotoClick(p)}
                      className="group relative block text-left"
                      title={p.caption ?? p.headline ?? ''}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.thumbUrl}
                        alt={p.caption ?? ''}
                        loading="lazy"
                        decoding="async"
                        className={
                          on
                            ? 'aspect-square w-full rounded-2xl border-2 border-accent object-cover'
                            : 'aspect-square w-full rounded-2xl border border-line object-cover transition group-hover:opacity-90'
                        }
                      />
                      {badge && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-semibold text-ink shadow-sm">
                          {badge}
                        </span>
                      )}
                      {selecting && (
                        <span
                          className={
                            on
                              ? 'absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white'
                              : 'absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/80 bg-black/20 text-[11px] text-white'
                          }
                        >
                          {on ? '✓' : ''}
                        </span>
                      )}
                      <div className="mt-1 truncate text-[10px] text-faint">
                        {p.date}
                        {p.takenAt && p.takenAt !== p.date ? ` · 촬영 ${p.takenAt}` : ''}
                      </div>
                      {p.caption && (
                        <div className="truncate text-[10px] leading-snug text-muted">{p.caption}</div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </section>

      {/* 라이트박스 — 사진 크게 보기 + 캡션 보기/편집(본인·마스터) */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-h-full w-auto max-w-2xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.caption ?? ''}
              className="mx-auto max-h-[70vh] w-auto rounded-lg object-contain"
            />
            <button
              onClick={onDownloadOriginal}
              disabled={downloadingOrig}
              className="absolute left-2 top-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              aria-label="원본 저장"
            >
              {downloadingOrig ? '저장 중…' : '원본 저장'}
            </button>
            <button
              onClick={closeLightbox}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white"
              aria-label="닫기"
            >
              ✕
            </button>

            <div className="mt-2 rounded-lg bg-surface px-3 py-2">
              {!editingCaption ? (
                <>
                  {lightbox.caption ? (
                    <p className="text-sm text-ink">{lightbox.caption}</p>
                  ) : (
                    <p className="text-sm text-faint">캡션이 없습니다.</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted">
                    {lightbox.date}
                    {lightbox.takenAt && lightbox.takenAt !== lightbox.date
                      ? ` · 촬영 ${lightbox.takenAt}`
                      : ''}
                    {lightbox.category ? ` · ${lightbox.category}` : ''}
                    {lightbox.sourceTitle && SOURCE_CFG[lightbox.source].label
                      ? ` · ${SOURCE_CFG[lightbox.source].label}: ${lightbox.sourceTitle}`
                      : ''}
                  </p>
                  {canEditEntry(lightbox.ownerId, currentUserId) && (
                    <button
                      onClick={startEditCaption}
                      className="mt-2 text-xs font-semibold text-accent underline"
                    >
                      캡션 {lightbox.manualCaption ? '수정' : '직접 입력'}
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={captionDraft}
                    onChange={(e) => setCaptionDraft(e.target.value)}
                    rows={2}
                    placeholder="사진 설명을 입력하세요"
                    autoFocus
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
                  />
                  {lightbox.aiCaption && (
                    <p className="text-[11px] text-faint">AI 캡션: {lightbox.aiCaption}</p>
                  )}
                  {captionMsg && <p className="text-[11px] text-danger">{captionMsg}</p>}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveCaption}
                      disabled={savingCaption}
                      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      {savingCaption ? '저장 중…' : '저장'}
                    </button>
                    <button
                      onClick={() => setEditingCaption(false)}
                      disabled={savingCaption}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:border-primary disabled:opacity-50"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
