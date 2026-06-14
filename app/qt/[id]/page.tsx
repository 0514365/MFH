// MFH-QT-DETAIL-PAGE-V1
// 지난 QT — 고유 id 로 보는 상세(목록에서 클릭 시 진입). 렌더 본문은 QtView 공유(최신 페이지와 동일).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import QtView, { hasQtContent, QT_SELECT, type QtRow } from '../QtView'

export const dynamic = 'force-dynamic'

export default async function QtDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase.from('daily_qt').select(QT_SELECT).eq('id', id).maybeSingle()
  const row = data as QtRow | null

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <PageHeader title="QT" />

      {/* 네비: 목록 / 오늘 */}
      <div className="mb-4 flex items-center justify-between text-sm">
        <Link href="/qt/archive" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          목록
        </Link>
        <Link href="/qt" className="font-semibold text-muted transition hover:text-primary hover:underline">
          오늘의 QT →
        </Link>
      </div>

      {hasQtContent(row) ? (
        <QtView row={row} />
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="text-base font-semibold text-primary">QT를 찾을 수 없습니다</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            삭제되었거나 잘못된 주소입니다.
            <br />
            <Link href="/qt/archive" className="text-primary underline">
              지난 QT 목록
            </Link>
            에서 다시 선택해 주세요.
          </p>
        </div>
      )}
    </main>
  )
}
