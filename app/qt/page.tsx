// MFH-QT-PAGE-V1
// 오늘의 QT — 최신(가장 최근 qt_date) 1행. 데이터 생성 = Claude Code /qt-update (daily_qt, 매일 05:00 자동 또는 수동).
// 본문은 성서유니온 매일성경 메타 + 개역개정 핵심절, 묵상·적용·기도는 일지·사역 접목 자체 생성. 이 페이지는 읽기 전용.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import QtView, { hasQtContent, QT_SELECT, type QtRow } from './QtView'

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
    <main className="mx-auto max-w-2xl px-5 py-8">
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
    </main>
  )
}
