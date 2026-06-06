'use client'
// MFH-PHOTO-GALLERY-CLIENT-V1
// 월 선택 → 사역 분류별 사진 그리드. 다중선택 → ZIP 내보내기(JSZip, 클라). 캡션(ai_caption) 표시.
//  · ZIP: 선택 사진의 Signed URL 을 브라우저에서 fetch → 분류 폴더로 묶어 다운로드(서버 부하 0).
//  · 캡션 생성은 Phase 3 Local 루틴. 여기서는 있으면 표시만.
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import JSZip from 'jszip'
import { JOURNAL_CATEGORIES } from '@/lib/constants'

export type PhotoItem = {
  url: string
  path: string
  date: string | null
  category: string | null
  headline: string | null
  takenAt: string | null
  caption: string | null
}

export default function PhotoGalleryClient({
  month,
  entryCount,
  photos,
}: {
  month: string
  entryCount: number
  photos: PhotoItem[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

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
    setSelected(new Set(photos.map((p) => p.path)))
  }
  function clearSel() {
    setSelected(new Set())
  }

  // 분류별 그룹(시드 카테고리 순서 → 그 외 → 미분류).
  const grouped = useMemo(() => {
    const map = new Map<string, PhotoItem[]>()
    for (const p of photos) {
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
  }, [photos])

  // 선택 사진 ZIP 내보내기(클라). Signed URL fetch → 분류 폴더로 묶기 → 다운로드.
  async function exportZip() {
    const targets = photos.filter((p) => selected.has(p.path))
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

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-xl font-extrabold text-ink">사진 모아보기</h1>
      <p className="mt-1 text-sm text-muted">
        그달 일지 사진을 사역 분류별로 모아 봅니다. 선택해서 ZIP으로 내보낼 수 있습니다.
      </p>

      {/* 월 선택 */}
      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={() => changeMonth(-1)}
          className="rounded-full border border-line px-3 py-1 text-sm text-primary hover:bg-primary-soft"
          aria-label="이전 달"
        >
          ‹
        </button>
        <span className="text-lg font-bold text-primary">{month}</span>
        <button
          onClick={() => changeMonth(1)}
          className="rounded-full border border-line px-3 py-1 text-sm text-primary hover:bg-primary-soft"
          aria-label="다음 달"
        >
          ›
        </button>
        <span className="ml-auto text-xs text-muted">
          일지 {entryCount}건 · 사진 {photos.length}장
        </span>
      </div>

      {/* 선택 도구 막대 */}
      {photos.length > 0 && (
        <div className="sticky top-0 z-10 mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface/95 px-3 py-2 backdrop-blur">
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
            className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? '내보내는 중…' : 'ZIP 내보내기'}
          </button>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}

      {/* 사진 그리드 */}
      <section className="mt-5">
        {photos.length === 0 ? (
          <p className="text-xs text-faint">이 달엔 사진이 없습니다.</p>
        ) : (
          grouped.map(([cat, items]) => (
            <div key={cat} className="mt-4">
              <div className="mb-2 text-xs font-bold text-muted">
                {cat} ({items.length})
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {items.map((p) => {
                  const on = selected.has(p.path)
                  return (
                    <button
                      key={p.path}
                      onClick={() => toggle(p.path)}
                      className="group relative block text-left"
                      title={p.caption ?? p.headline ?? ''}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.url}
                        alt={p.caption ?? ''}
                        className={
                          on
                            ? 'aspect-square w-full rounded-lg border-2 border-primary object-cover'
                            : 'aspect-square w-full rounded-lg border border-line object-cover transition group-hover:opacity-80'
                        }
                      />
                      <span
                        className={
                          on
                            ? 'absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white'
                            : 'absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/80 bg-black/20 text-[11px] text-white'
                        }
                      >
                        {on ? '✓' : ''}
                      </span>
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
    </main>
  )
}
