'use client'
// MFH-AUTHOR-SELECT-V1
// 마스터(김우진)에게만 보이는 '작성자' 드롭다운. 비마스터에겐 아무것도 렌더하지 않는다.
//  · 멤버 목록(app_members)을 스스로 로드.
//  · 신규(빈 값) 진입 시 기본 작성자를 본인으로 채운다(저장 시 본인 명의 유지).
//  · 편집 시엔 부모가 넘긴 기존 작성자 값을 그대로 두고, 마스터가 다른 멤버로 바꿀 수 있다.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { isMaster } from '@/lib/members'

export default function AuthorSelect({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (userId: string) => void
  className?: string
}) {
  const [members, setMembers] = useState<{ id: string; name: string }[]>([])
  const [viewerId, setViewerId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null
      setViewerId(uid)
      // 신규(빈 값)면 기본 작성자를 본인으로.
      if (uid && !value) onChange(uid)
    })
    void supabase
      .from('app_members')
      .select('user_id, display_name')
      .then(({ data }) => {
        const rows = (data ?? []) as { user_id: string; display_name: string }[]
        setMembers(rows.map((r) => ({ id: r.user_id, name: r.display_name })))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 마스터가 아니면 작성자 선택 UI 자체를 숨긴다.
  if (!isMaster(viewerId)) return null

  return (
    <div className="mb-4">
      <label className="mb-1 block text-xs text-muted">작성자</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  )
}
