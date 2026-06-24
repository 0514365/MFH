'use client'

// MFH-SUPPORTERS-LIST-V1
// 후원자 목록 — 아바타 카드 + 이름/소속/지역/나이 + 헌금 USD 누계. 검색·필터(정기/활성).
import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { Supporter } from '@/lib/types'
import { ageFromBirth, formatUsd } from '@/lib/supporters'

type Props = {
  supporters: Supporter[]
  totals: Record<string, number>
  photoUrls: Record<string, string>
  currentUserId?: string
}

function Avatar({ url, name }: { url?: string; name: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
  }
  const initial = name.trim().charAt(0) || '?'
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-lg font-bold text-accent">
      {initial}
    </div>
  )
}

export default function SupportersList({ supporters, totals, photoUrls }: Props) {
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

  const chip = 'rounded-xl border px-3 py-1.5 text-xs font-semibold transition'
  const chipOff = 'border-line text-muted hover:border-primary'
  const chipOn = 'border-primary bg-primary text-white'

  return (
    <>
      {/* 검색 + 필터 */}
      <div className="mb-3 space-y-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름·소속·지역 검색"
          className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none focus:border-primary"
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
          <span className="ml-auto text-xs text-faint">{filtered.length}명</span>
        </div>
      </div>

      {supporters.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-faint">
          아직 후원자가 없습니다.
          <br />첫 후원자를 등록해 보세요.
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-faint">
          조건에 맞는 후원자가 없습니다.
        </p>
      ) : (
        <ul className="space-y-3 min-[740px]:grid min-[740px]:grid-cols-2 min-[740px]:gap-3 min-[740px]:space-y-0">
          {filtered.map((s) => {
            const age = ageFromBirth(s.birth_date)
            const total = totals[s.id] ?? 0
            const meta = [s.affiliation, s.role, s.region, age != null ? `${age}세` : null]
              .filter(Boolean)
              .join(' · ')
            return (
              <li key={s.id}>
                <Link
                  href={`/supporters/${s.id}`}
                  className="block rounded-2xl border border-line bg-surface p-4 shadow-[0_4px_18px_-6px_rgba(34,34,34,0.16)] transition hover:border-primary"
                >
                  <div className="flex items-center gap-3">
                    <Avatar url={photoUrls[s.id]} name={s.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-bold text-ink">{s.name}</span>
                        {s.is_recurring && (
                          <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
                            정기
                          </span>
                        )}
                        {!s.is_active && (
                          <span className="shrink-0 rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-medium text-faint">
                            보관
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted">{meta || '정보 없음'}</div>
                    </div>
                    {total > 0 && (
                      <div className="shrink-0 text-right">
                        <div className="font-display text-[8px] font-bold uppercase tracking-[0.15em] text-faint">
                          Total
                        </div>
                        <div className="font-display text-[13px] font-bold text-ink">{formatUsd(total)}</div>
                      </div>
                    )}
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
