'use client'

// MFH-JOURNAL-PHOTO-COLLAGE-V1
// 일지 사진 콜라주(1~5장) + 클릭 확대 라이트박스(좌우 이동·키보드·스와이프).
import { useCallback, useEffect, useState } from 'react'
import { downloadFile, filenameFromPathOrUrl } from '@/lib/download'

export type CollagePhoto = {
  url: string
  // 콜라주 셀·목록용 썸네일(없으면 url 폴백). 라이트박스(확대)는 항상 url=원본.
  thumb_url?: string | null
  place_name: string | null
  taken_at: string | null
  lat: number | null
  lng: number | null
}

function Cell({
  p,
  i,
  aspect,
  onOpen,
}: {
  p: CollagePhoto
  i: number
  aspect: string
  onOpen: (i: number) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(i)}
      className={`group relative ${aspect} w-full overflow-hidden rounded-lg border border-line bg-surface-subtle`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={p.thumb_url || p.url}
        alt={p.place_name ?? ''}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
      />
      {p.place_name && (
        <span className="absolute bottom-1 left-1 max-w-[92%] truncate rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
          📍 {p.place_name}
        </span>
      )}
    </button>
  )
}

export default function PhotoCollage({ photos }: { photos: CollagePhoto[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const [touchX, setTouchX] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)
  const n = photos.length

  const close = useCallback(() => setOpen(null), [])
  const go = useCallback(
    (dir: number) => setOpen((cur) => (cur == null ? cur : (cur + dir + n) % n)),
    [n],
  )

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

  if (n === 0) return null

  const onOpen = (i: number) => setOpen(i)
  const cellProps = (i: number, aspect: string) => ({ p: photos[i], i, aspect, onOpen })
  const cur = open != null ? photos[open] : null

  async function onDownload() {
    if (!cur) return
    setDownloading(true)
    try {
      await downloadFile(cur.url, filenameFromPathOrUrl(cur.url))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      {n === 1 && <Cell {...cellProps(0, 'aspect-[4/3]')} />}

      {n === 2 && (
        <div className="grid grid-cols-2 gap-1.5">
          <Cell {...cellProps(0, 'aspect-square')} />
          <Cell {...cellProps(1, 'aspect-square')} />
        </div>
      )}

      {n === 3 && (
        <div className="grid grid-cols-3 gap-1.5">
          <Cell {...cellProps(0, 'aspect-square')} />
          <Cell {...cellProps(1, 'aspect-square')} />
          <Cell {...cellProps(2, 'aspect-square')} />
        </div>
      )}

      {n === 4 && (
        <div className="grid grid-cols-2 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <Cell key={i} {...cellProps(i, 'aspect-square')} />
          ))}
        </div>
      )}

      {n >= 5 && (
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <Cell {...cellProps(0, 'aspect-square')} />
            <Cell {...cellProps(1, 'aspect-square')} />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Cell {...cellProps(2, 'aspect-square')} />
            <Cell {...cellProps(3, 'aspect-square')} />
            <Cell {...cellProps(4, 'aspect-square')} />
          </div>
        </div>
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
                disabled={downloading}
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
            <img
              src={cur.url}
              alt={cur.place_name ?? ''}
              className="max-h-full max-w-full object-contain"
            />
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
