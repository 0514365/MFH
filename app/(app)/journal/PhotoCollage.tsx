'use client'
// MFH-JOURNAL-PHOTO-COLLAGE-V5 — 원본 지연 서명: url 이 비어 있고 path 가 있으면 확대할 때 브라우저가 직접 서명 URL 을 받는다(목록 전송량 절감).
// MFH-JOURNAL-PHOTO-COLLAGE-V4 — 장수 제한 없는 비율 기반 줄 맞춤 콜라주(가로·세로 구성에 따라 줄 나눔) · max 로 「+N」 접기.
// MFH-JOURNAL-PHOTO-COLLAGE-V3 — 2027(4-1): 남색 글자 · 연회색 면 · b27 선 · 굵기 600 이하 · 삭제 = 지출 빨강.
// 일지 사진 콜라주 + 클릭 확대 라이트박스(좌우 이동·키보드·스와이프).
// 배치: 사진 비율(가로/세로)의 합이 줄 목표치에 가깝도록 줄을 나누고, 한 줄 안에서는 비율대로 폭을 나눠 높이를 맞춘다.
//   → 가로·세로 사진이 섞여도 거의 잘리지 않는다. 첫 줄은 목표치가 작아 더 크게 보인다.
// wide: 상세 페이지 전용 — 데스크탑(≥@xl)에서는 줄당 장수를 늘린 배치를 따로 쓴다.
// max: 목록 카드·미리보기용 — 앞 max 장만 그리고 마지막 칸에 「+N」(라이트박스는 전체).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { downloadFile, filenameFromPathOrUrl } from '@/lib/download'
import { createClient } from '@/lib/supabase-browser'

const BUCKET = 'journal-photos'

export type CollagePhoto = {
  // 원본 서명 URL. 목록은 '' 로 두고 path 만 보낸다 → 확대할 때 서명.
  url: string
  // 원본 Storage 경로(url 이 비었을 때 지연 서명용).
  path?: string | null
  // 콜라주 셀·목록용 썸네일(없으면 url 폴백). 라이트박스(확대)는 항상 url=원본.
  thumb_url?: string | null
  place_name: string | null
  taken_at: string | null
  lat: number | null
  lng: number | null
  // 가로·세로 px(업로드 시 저장). 없으면 썸네일 로드 때 측정.
  w?: number | null
  h?: number | null
}

// 줄 나눔 기준 — first/rest: 첫 줄/이후 줄의 비율 합 목표, maxPer: 줄당 최대 장수,
// minSum: 줄 비율 합 하한(이보다 작으면 셀을 가로로 넓혀 지나치게 길어지지 않게 한다).
type Variant = { first: number; rest: number; maxPer: number; minSum: number }
const NARROW: Variant = { first: 2.4, rest: 3.4, maxPer: 4, minSum: 1.0 }
const WIDE: Variant = { first: 4.0, rest: 5.5, maxPer: 7, minSum: 1.5 }

const RATIO_MIN = 0.56 // 9:16
const RATIO_MAX = 2.2

function clampRatio(r: number): number {
  return Math.min(RATIO_MAX, Math.max(RATIO_MIN, r))
}

// 비율 배열 → 줄별 [시작, 끝) 구간. 각 줄의 (비율 합 − 목표)² 총합이 최소가 되는 분할(DP).
function layoutRows(ratios: number[], v: Variant): [number, number][] {
  const n = ratios.length
  const best: number[] = [0]
  const prev: number[] = [0]
  for (let i = 1; i <= n; i++) {
    best[i] = Infinity
    prev[i] = i - 1
    let sum = 0
    for (let j = i - 1; j >= Math.max(0, i - v.maxPer); j--) {
      sum += ratios[j]
      const d = sum - (j === 0 ? v.first : v.rest)
      const cost = best[j] + d * d
      if (cost < best[i]) {
        best[i] = cost
        prev[i] = j
      }
    }
  }
  const rows: [number, number][] = []
  for (let i = n; i > 0; i = prev[i]) rows.unshift([prev[i], i])
  return rows
}

function Cell({
  p,
  i,
  ratio,
  more,
  onOpen,
  onMeasure,
}: {
  p: CollagePhoto
  i: number
  ratio: number
  more: number
  onOpen: (i: number) => void
  onMeasure: (src: string, w: number, h: number) => void
}) {
  const src = p.thumb_url || p.url
  const needMeasure = !(p.w && p.h)
  return (
    <button
      type="button"
      onClick={() => onOpen(i)}
      style={{ flex: `${ratio} 1 0%`, aspectRatio: String(ratio) }}
      className="group relative min-w-0 overflow-hidden rounded-lg border border-b27-line bg-b27-card"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={p.place_name ?? ''}
        loading="lazy"
        decoding="async"
        // 캐시된 이미지는 hydration 전에 load 가 끝나므로 ref 에서도 한 번 확인.
        ref={(el) => {
          if (needMeasure && el && el.complete && el.naturalWidth) onMeasure(src, el.naturalWidth, el.naturalHeight)
        }}
        onLoad={(e) => {
          const el = e.currentTarget
          if (needMeasure && el.naturalWidth) onMeasure(src, el.naturalWidth, el.naturalHeight)
        }}
        className="absolute inset-0 h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
      />
      {more > 0 ? (
        <span className="absolute inset-0 flex items-center justify-center bg-[rgba(43,49,96,0.55)] font-num text-[18px] font-semibold text-white">
          +{more}
        </span>
      ) : (
        p.place_name && (
          <span className="absolute bottom-1 left-1 max-w-[92%] truncate rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
            📍 {p.place_name}
          </span>
        )
      )}
    </button>
  )
}

export default function PhotoCollage({
  photos,
  wide = false,
  max,
}: {
  photos: CollagePhoto[]
  wide?: boolean
  max?: number
}) {
  const [open, setOpen] = useState<number | null>(null)
  const [touchX, setTouchX] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)
  // 크기 정보가 없는 사진의 측정 비율(썸네일 src 기준).
  const [measured, setMeasured] = useState<Record<string, number>>({})
  // 지연 서명한 원본 URL(경로 기준).
  const [origUrls, setOrigUrls] = useState<Record<string, string>>({})
  const n = photos.length
  const shownCount = max && n > max ? max : n
  const more = n - shownCount

  const close = useCallback(() => setOpen(null), [])
  const go = useCallback(
    (dir: number) => setOpen((cur) => (cur == null ? cur : (cur + dir + n) % n)),
    [n],
  )
  const onMeasure = useCallback((src: string, w: number, h: number) => {
    setMeasured((cur) => (cur[src] ? cur : { ...cur, [src]: w / h }))
  }, [])

  useEffect(() => {
    if (open == null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, close, go])

  // 확대한 사진의 원본 URL 이 없으면 그때 서명(1시간). 실패하면 썸네일이 그대로 보인다.
  const openPhoto = open != null ? photos[open] : null
  const pendingPath = openPhoto && !openPhoto.url && openPhoto.path && !origUrls[openPhoto.path] ? openPhoto.path : null
  useEffect(() => {
    if (!pendingPath) return
    let alive = true
    createClient()
      .storage.from(BUCKET)
      .createSignedUrl(pendingPath, 3600)
      .then(({ data }) => {
        if (alive && data?.signedUrl) setOrigUrls((cur) => ({ ...cur, [pendingPath]: data.signedUrl }))
      })
    return () => {
      alive = false
    }
  }, [pendingPath])

  // 표시할 사진의 비율(저장된 크기 → 측정값 → 정사각 가정 순).
  const ratios = useMemo(
    () =>
      photos.slice(0, shownCount).map((p) => {
        const r = p.w && p.h ? p.w / p.h : (measured[p.thumb_url || p.url] ?? 1)
        return clampRatio(r)
      }),
    [photos, shownCount, measured],
  )
  const narrowRows = useMemo(() => layoutRows(ratios, NARROW), [ratios])
  const wideRows = useMemo(() => (wide ? layoutRows(ratios, WIDE) : null), [ratios, wide])

  if (n === 0) return null

  const onOpen = (i: number) => setOpen(i)
  const cur = open != null ? photos[open] : null
  // 원본(있으면) → 없으면 서명 대기 중 썸네일로 먼저 보여 준다.
  const curFull = cur ? cur.url || (cur.path ? origUrls[cur.path] : '') || '' : ''
  const curSrc = curFull || cur?.thumb_url || ''

  async function onDownload() {
    if (!cur || !curFull) return
    setDownloading(true)
    try {
      await downloadFile(curFull, filenameFromPathOrUrl(cur.path || curFull))
    } finally {
      setDownloading(false)
    }
  }

  function renderRows(rows: [number, number][], v: Variant) {
    return (
      <div className="flex flex-col gap-1.5">
        {rows.map(([from, to]) => {
          let sum = 0
          for (let i = from; i < to; i++) sum += ratios[i]
          // 줄이 너무 길쭉해지면(장수 적고 세로 사진) 셀을 가로로 넓혀 높이를 제한.
          const scale = sum < v.minSum ? v.minSum / sum : 1
          return (
            <div key={from} className="flex gap-1.5">
              {Array.from({ length: to - from }, (_, k) => from + k).map((i) => (
                <Cell
                  key={i}
                  p={photos[i]}
                  i={i}
                  ratio={ratios[i] * scale}
                  more={i === shownCount - 1 ? more : 0}
                  onOpen={onOpen}
                  onMeasure={onMeasure}
                />
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      {wide && wideRows ? (
        <>
          <div className="@xl:hidden">{renderRows(narrowRows, NARROW)}</div>
          <div className="hidden @xl:block">{renderRows(wideRows, WIDE)}</div>
        </>
      ) : (
        renderRows(narrowRows, NARROW)
      )}

      {cur && open != null && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="flex items-center justify-between px-4 py-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs text-white/80">
              {open + 1} / {n}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDownload}
                disabled={downloading || !curFull}
                aria-label="원본 저장"
                className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
              >
                {downloading ? '저장 중…' : '원본 저장'}
              </button>
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold hover:bg-white/20"
              >
                ✕
              </button>
            </div>
          </div>

          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden px-2"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => setTouchX(e.touches[0]?.clientX ?? null)}
            onTouchEnd={(e) => {
              if (touchX == null) return
              const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX
              if (dx > 50) go(-1)
              else if (dx < -50) go(1)
              setTouchX(null)
            }}
          >
            {n > 1 && (
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="이전"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-xl text-white hover:bg-white/20"
              >
                ‹
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {curSrc ? (
              <img
                src={curSrc}
                alt={cur.place_name ?? ''}
                className={`max-h-full max-w-full object-contain ${curFull ? '' : 'h-full w-full opacity-70 blur-[2px]'}`}
              />
            ) : (
              <span className="text-sm text-white/70">불러오는 중…</span>
            )}
            {n > 1 && (
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="다음"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-xl text-white hover:bg-white/20"
              >
                ›
              </button>
            )}
          </div>

          {(cur.place_name || cur.taken_at || (cur.lat != null && cur.lng != null)) && (
            <div
              className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-4 text-center text-xs text-white/80"
              onClick={(e) => e.stopPropagation()}
            >
              {cur.place_name && <span>📍 {cur.place_name}</span>}
              {cur.taken_at && <span>{cur.taken_at}</span>}
              {cur.lat != null && cur.lng != null && (
                <a
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://maps.google.com/?q=${cur.lat},${cur.lng}`}
                >
                  지도에서 열기
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
