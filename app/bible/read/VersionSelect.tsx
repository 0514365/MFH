'use client'

// MFH-BIBLE-VERSION-SELECT-V1 — 본문 버전 3단(개역개정·새한글·ESV). 쿠키(bible_ver) 저장 후 서버 재렌더.
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
              on ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface text-muted hover:border-primary'
            }`}
          >
            {BIBLE_VERSION_LABEL[v]}
          </button>
        )
      })}
    </div>
  )
}
