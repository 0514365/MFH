// MFH-OFFLINE-PAGE-V2 — 오프라인 폴백 + 로컬 스냅샷 열람 (오프라인 2a·2b)
// force-dynamic 을 쓰지 않아 정적 prerender 된다 → SW(V5) 가 precache 해 회선이 끊겨도 뜬다.
// IndexedDB(lib/offlineStore) 의 최근 일지·할일·썸네일을 읽어 오프라인에서 열람한다.
'use client'

import { useEffect, useState } from 'react'
import {
  loadJournals,
  loadTasks,
  loadThumb,
  type OfflineJournal,
  type OfflineTask,
} from '@/lib/offlineStore'

function fmtDate(d: string | null): string {
  if (!d) return ''
  const [, m, day] = d.split('-')
  if (!m || !day) return d
  return `${Number(m)}.${Number(day)}`
}

function fmtSaved(ms: number): string {
  const dt = new Date(ms)
  const hh = String(dt.getHours()).padStart(2, '0')
  const mm = String(dt.getMinutes()).padStart(2, '0')
  return `${dt.getMonth() + 1}.${dt.getDate()} ${hh}:${mm}`
}

export default function OfflinePage() {
  // null = 미확정(SSR/hydration). 클라이언트 마운트 후 navigator.onLine 으로 확정.
  const [online, setOnline] = useState<boolean | null>(null)
  const [journals, setJournals] = useState<OfflineJournal[]>([])
  const [tasks, setTasks] = useState<OfflineTask[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string>>({}) // thumbPath → objectURL
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  useEffect(() => {
    const created: string[] = []
    ;(async () => {
      try {
        const [jSnap, tSnap] = await Promise.all([loadJournals(), loadTasks()])
        const js = jSnap?.items ?? []
        setJournals(js)
        setTasks(tSnap?.items ?? [])
        const at = Math.max(jSnap?.savedAt ?? 0, tSnap?.savedAt ?? 0)
        setSavedAt(at > 0 ? at : null)
        const map: Record<string, string> = {}
        for (const j of js) {
          if (!j.thumbPath) continue
          const blob = await loadThumb(j.thumbPath)
          if (blob) {
            const u = URL.createObjectURL(blob)
            map[j.thumbPath] = u
            created.push(u)
          }
        }
        setThumbs(map)
      } catch {
        // 무시 — 스냅샷 없음으로 처리
      } finally {
        setLoaded(true)
      }
    })()
    return () => {
      created.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [])

  const empty = loaded && journals.length === 0 && tasks.length === 0

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8 pb-24">
      <p className="font-display text-xs font-semibold tracking-[0.25em] text-accent">
        MISSION FOR HONDURAS
      </p>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl font-extrabold text-primary">오프라인</h1>
        {savedAt && <span className="shrink-0 text-[11px] text-faint">저장 {fmtSaved(savedAt)}</span>}
      </div>

      {online === true && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
          <p className="text-sm">인터넷에 다시 연결되었습니다.</p>
          <button
            onClick={() => {
              window.location.href = '/'
            }}
            className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            홈으로
          </button>
        </div>
      )}

      {online === false && (
        <p className="mt-2 text-sm text-muted">인터넷 연결이 없습니다. 저장된 최근 기록을 봅니다.</p>
      )}

      {empty && (
        <p className="mt-8 text-sm text-muted">
          저장된 기록이 없습니다. 온라인일 때 일지·할일 화면을 한 번 열면 자동으로 저장됩니다.
        </p>
      )}

      {journals.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-2 font-display text-sm font-bold text-primary">최근 일지</h2>
          <ul className="space-y-2">
            {journals.map((j) => (
              <li key={j.id} className="flex gap-3 rounded-xl border border-line bg-surface p-3">
                {j.thumbPath && thumbs[j.thumbPath] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbs[j.thumbPath]}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold">
                      {j.headline || '(제목 없음)'}
                    </span>
                    <span className="shrink-0 text-[11px] text-faint">{fmtDate(j.entry_date)}</span>
                  </div>
                  {j.today && (
                    <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted">
                      {j.today}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tasks.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-2 font-display text-sm font-bold text-primary">할 일 (미완료)</h2>
          <ul className="space-y-1.5">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2.5"
              >
                <span className="truncate text-sm">{t.title}</span>
                {t.due_date && (
                  <span className="shrink-0 text-[11px] text-faint">{fmtDate(t.due_date)}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
