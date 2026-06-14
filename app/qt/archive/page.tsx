// MFH-QT-ARCHIVE-PAGE-V1
// 지난 QT 목록(저장된 모든 날짜, 최신순). 항목 클릭 → /qt/[id] 상세. QT 는 하루 1건이라 넘버링 없음.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import { QT_SELECT, type QtRow } from '../QtView'

export const dynamic = 'force-dynamic'

export default async function QtArchivePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('daily_qt')
    .select(QT_SELECT)
    .order('qt_date', { ascending: false })
    .order('created_at', { ascending: false })
  const rows = (data ?? []) as QtRow[]

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <PageHeader title="지난 QT" />

      {/* 오늘로 */}
      <div className="mb-4">
        <Link href="/qt" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          오늘의 QT
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="text-base font-semibold text-primary">저장된 QT가 없습니다</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            매일 새벽 5시에 자동으로 쌓입니다. 바로 만들려면{' '}
            <code className="rounded bg-paper px-1 py-0.5 font-mono text-xs">/qt-update</code> 를 실행하세요.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-faint">총 {rows.length}일</p>
          <div className="space-y-2.5">
            {rows.map((r) => {
              const p = r.passage ?? {}
              const title = (p.title ?? '').trim()
              const ref = [p.book, p.range].filter((x) => (x ?? '').trim()).join(' ')
              return (
                <Link
                  key={r.id}
                  href={`/qt/${r.id}`}
                  className="block rounded-xl border border-line bg-surface p-4 transition hover:border-primary"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-lg font-bold text-primary">{r.qt_date}</span>
                    {ref && <span className="shrink-0 text-xs text-faint">{ref}</span>}
                  </div>
                  {title && <p className="mt-1 line-clamp-1 text-sm font-semibold text-ink">{title}</p>}
                </Link>
              )
            })}
          </div>
        </>
      )}
    </main>
  )
}
