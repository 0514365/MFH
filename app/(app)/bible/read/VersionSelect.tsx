'use client'
// MFH-BIBLE-VERSION-SELECT-V3 — 2027(4-5): theme-2027 · 남색 글자 · 연회색/블러시 면 · 강조 = 진한 블러시 · 굵기 600 이하 · 영문 대문자 머리글 해제.

// MFH-BIBLE-VERSION-SELECT-V2 — 본문 버전 4단(개역개정·새한글·ESV·RVR1960). 쿠키(bible_ver) 저장 후 서버 재렌더.
// Manna VersionSelect V1 이식(SegmentedTabs → 인라인 세그먼트, DayCard 방법 칩과 같은 스타일). QT 접이식과 쿠키 공유.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BIBLE_VERSION_COOKIE, BIBLE_VERSION_LABEL, BIBLE_VERSIONS, type BibleVersion } from '@/lib/bible/texts'

export default function VersionSelect({ initial }: { initial: BibleVersion }) {
  const router = useRouter()
  const [value, setValue] = useState<BibleVersion>(initial)
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex gap-1.5" role="group" aria-label="성경 버전">
      {BIBLE_VERSIONS.map((v) => {
        const on = v === value
        return (
          <button
            key={v}
            type="button"
            disabled={pending}
            aria-pressed={on}
            onClick={() => {
              if (on) return
              setValue(v)
              document.cookie = `${BIBLE_VERSION_COOKIE}=${v}; path=/; max-age=31536000; samesite=lax`
              startTransition(() => router.refresh())
            }}
            className={`flex-1 rounded-full border px-2 py-1.5 text-[11px] font-semibold transition disabled:opacity-70 ${
              on ? 'border-b27-ink bg-b27-ink text-on-primary' : 'border-b27-line bg-b27-paper text-b27-muted hover:border-b27-muted'
            }`}
          >
            {BIBLE_VERSION_LABEL[v]}
          </button>
        )
      })}
    </div>
  )
}
