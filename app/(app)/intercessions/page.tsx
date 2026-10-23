// MFH-INTERCESSIONS-PAGE-V2 — 2027(4-5): theme-2027 · 남색 글자 · 연회색/블러시 면 · 강조 = 진한 블러시 · 굵기 600 이하 · 영문 대문자 머리글 해제.
// MFH-INTERCESSIONS-PAGE-V1
// /intercessions — 멤버 전용 중보기도 메시지함. RLS 로 멤버만 열람.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import IntercessionsList, { type Intercession } from './IntercessionsList'

export const dynamic = 'force-dynamic'

export default async function IntercessionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('intercessions')
    .select('id, visitor_name, message, is_read, created_at')
    .order('created_at', { ascending: false })
  const items = (data ?? []) as Intercession[]

  return (
    <main className="mx-auto max-w-md px-5 pb-8">
      <PageHeader title="중보기도" />
      <p className="-mt-1 mb-5 text-xs text-b27-muted">공개 페이지 방문자가 남긴 기도·응원</p>
      <IntercessionsList initial={items} />
    </main>
  )
}
