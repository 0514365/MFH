// MFH-QT-PAGE-V2
// 오늘의 QT — 최신(가장 최근 qt_date) 1행 + 하단 "지난 QT" 아카이브 링크.
// 데이터 생성 = Claude Code /qt-update (daily_qt, 매일 05시 자동 또는 수동). 이 페이지는 읽기 전용.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import QtView, { hasQtContent, QT_SELECT, type QtRow } from './QtView'
import '../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

export default async function QtPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 최신 = 가장 최근 날짜의 가장 최근 생성분.
  const { data } = await supabase
    .from('daily_qt')
    .select(QT_SELECT)
    .order('qt_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const row = data as QtRow | null

  return (
    <main className="app-theme mx-auto max-w-2xl px-5 py-8">
      <PageHeader title="오늘의 QT" />

      {hasQtContent(row) ? (
        <QtView row={row} />
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="text-base font-semibold text-primary">아직 오늘 QT가 없습니다</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            매일 새벽 5시에 성서유니온 매일성경 본문으로 묵상을 준비합니다.
            <br />
            바로 보려면 Cowork(아이폰 원격) 또는 터미널에서{' '}
            <code className="rounded bg-paper px-1 py-0.5 font-mono text-xs">/qt-update</code> 를 실행하세요.
          </p>
        </div>
      )}

      {/* 지난 QT 아카이브 */}
      <div className="mt-8 text-center">
        <Link
          href="/qt/archive"
          className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition hover:underline"
        >
          지난 QT 보기
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </main>
  )
}
