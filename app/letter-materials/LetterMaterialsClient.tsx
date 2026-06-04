'use client'
// MFH-LETTER-MATERIALS-CLIENT-V1
// 월 선택 → 텍스트 재료 복사 + 그달 사진 그리드(분류별)·다운로드.
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { JOURNAL_CATEGORIES } from '@/lib/constants'

export type PhotoItem = {
  url: string
  date: string | null
  category: string | null
  headline: string | null
  takenAt: string | null
}

export default function LetterMaterialsClient({
  month,
  entryCount,
  markdown,
  photos,
}: {
  month: string
  entryCount: number
  markdown: string
  photos: PhotoItem[]
}) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  function changeMonth(delta: number) {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    const nm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    router.push(`/letter-materials?month=${nm}`)
  }

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 클립보드 권한 없음 — 무시(사용자가 직접 선택 복사).
    }
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

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-xl font-extrabold text-ink">편지 재료 내보내기</h1>
      <p className="mt-1 text-sm text-muted">
        그달 일지·사진을 모아 선교편지 재료로 내보냅니다. 텍스트는 복사하고 사진은 저장해 Claude에 주세요.
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

      {/* 텍스트 재료 */}
      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-primary">텍스트 재료</h2>
          <button
            onClick={copyMarkdown}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
          >
            {copied ? '복사됨 ✓' : '재료 복사'}
          </button>
        </div>
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface-subtle p-3 text-[11px] leading-relaxed text-ink">
          {markdown}
        </pre>
      </section>

      {/* 사진 */}
      <section className="mt-7">
        <h2 className="text-sm font-bold text-primary">사진 ({photos.length})</h2>
        {photos.length === 0 ? (
          <p className="mt-2 text-xs text-faint">이 달엔 사진이 없습니다.</p>
        ) : (
          grouped.map(([cat, items]) => (
            <div key={cat} className="mt-4">
              <div className="mb-2 text-xs font-bold text-muted">
                {cat} ({items.length})
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {items.map((p, i) => (
                  <a
                    key={`${cat}-${i}`}
                    href={p.url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                    title={`${p.headline ?? ''} ${p.date ?? ''}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt=""
                      className="aspect-square w-full rounded-lg border border-line object-cover transition hover:opacity-80"
                    />
                    <div className="mt-1 truncate text-[10px] text-faint">
                      {p.date}
                      {p.takenAt && p.takenAt !== p.date ? ` · 촬영 ${p.takenAt}` : ''}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <p className="mt-8 rounded-xl border border-line bg-surface-subtle px-4 py-3 text-xs leading-relaxed text-muted">
        💡 <b className="text-primary">사용법</b> — ① 위 ‘재료 복사’로 텍스트를 복사하고 ② 사진을 저장한 뒤
        ③ Claude에 함께 주면, 마스터 템플릿으로 그달 선교편지를 만들 수 있습니다.
      </p>
    </main>
  )
}
