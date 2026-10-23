'use client'
// MFH-SUPPORTERS-LIST-V2 — 2027(4-7): theme-2027 · 남색 글자 · 연회색/살구 면 · 강조 = 진한 살구 · 굵기 600 이하.

// MFH-SUPPORTERS-LIST-V1
// 후원자 목록 — 아바타 카드 + 이름/소속/지역/나이. 검색·필터(정기/활성).
import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { Supporter } from '@/lib/types'
import { ageFromBirth } from '@/lib/supporters'

type Props = {
  supporters: Supporter[]
  photoUrls: Record<string, string>
  currentUserId?: string
}

function Avatar({ url, name }: { url?: string; name: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
  }
  const initial = name.trim().charAt(0) || '?'
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-b27-tint-3 text-[16px] font-semibold text-[#855000]">
      {initial}
    </div>
  )
}

export default function SupportersList({ supporters, photoUrls }: Props) {
  const [q, setQ] = useState('')
  const [onlyRecurring, setOnlyRecurring] = useState(false)
  const [onlyActive, setOnlyActive] = useState(true)

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return supporters.filter((s) => {
      if (onlyActive && !s.is_active) return false
      if (onlyRecurring && !s.is_recurring) return false
      if (kw) {
        const hay = `${s.name} ${s.affiliation ?? ''} ${s.region ?? ''} ${s.role ?? ''}`.toLowerCase()
        if (!hay.includes(kw)) return false
      }
      return true
    })
  }, [supporters, q, onlyRecurring, onlyActive])

  const chip = 'rounded-full px-3 py-1.5 text-xs font-medium transition active:opacity-70'
  const chipOff = 'bg-b27-paper text-b27-muted'
  const chipOn = 'bg-b27-ink text-white'

  return (
    <>
      {/* 검색 + 필터 */}
      <div className="mb-2 space-y-2.5 rounded-2xl bg-b27-card p-2.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름·소속·지역 검색"
          className="w-full rounded-full bg-b27-paper px-4 py-2 text-sm text-b27-ink outline-none placeholder:text-b27-muted"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyRecurring((v) => !v)}
            className={`${chip} ${onlyRecurring ? chipOn : chipOff}`}
          >
            정기후원
          </button>
          <button
            type="button"
            onClick={() => setOnlyActive((v) => !v)}
            className={`${chip} ${onlyActive ? chipOn : chipOff}`}
          >
            활성만
          </button>
          <span className="ml-auto text-xs text-b27-muted">{filtered.length}명</span>
        </div>
      </div>

      {supporters.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-b27-muted">
          아직 후원자가 없습니다.
          <br />첫 후원자를 등록해 보세요.
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-b27-muted">
          조건에 맞는 후원자가 없습니다.
        </p>
      ) : (
        <ul className="@xl:grid @xl:grid-cols-2 @xl:gap-x-6">
          {filtered.map((s) => {
            const age = ageFromBirth(s.birth_date)
            const meta = [s.affiliation, s.role, s.region, age != null ? `${age}세` : null]
              .filter(Boolean)
              .join(' · ')
            return (
              <li key={s.id} className="border-b border-b27-line last:border-b-0">
                <Link
                  href={`/supporters/${s.id}`}
                  className="block px-1 py-3 transition active:opacity-70"
                >
                  <div className="flex items-center gap-3">
                    <Avatar url={photoUrls[s.id]} name={s.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-medium text-b27-ink">{s.name}</span>
                        {s.is_recurring && (
                          <span className="shrink-0 rounded-full bg-b27-tint-3 px-2 py-0.5 text-[11px] font-medium text-[#855000]">
                            정기
                          </span>
                        )}
                        {!s.is_active && (
                          <span className="shrink-0 rounded-full bg-b27-card px-2 py-0.5 text-[11px] font-medium text-b27-muted">
                            보관
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate font-num text-[12px] text-b27-muted">{meta || '정보 없음'}</div>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
