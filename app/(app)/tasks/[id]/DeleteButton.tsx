'use client'
// MFH-TASK-DELETE-BUTTON-V2 — 2027(4-2): 연한 빨강 면 + 빨강 글자(상세 하단 버튼 줄 높이 맞춤).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import RecurrenceScopeModal from '@/components/RecurrenceScopeModal'
import { deleteRecurringFollowing, type RecurrenceScope } from '@/lib/recurrence'

export default function DeleteButton({
  id,
  recurrenceId,
  dueDate,
}: {
  id: string
  recurrenceId?: string | null
  dueDate?: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState(false)

  async function runDelete(scope: RecurrenceScope) {
    setModal(false)
    setBusy(true)
    const supabase = createClient()
    if (scope === 'following' && recurrenceId) {
      const res = await deleteRecurringFollowing({
        recurrenceId,
        fromDueDate: dueDate ?? null,
        currentId: id,
      })
      if (!res.ok) {
        setBusy(false)
        window.alert('삭제 실패: ' + (res.error ?? ''))
        return
      }
    } else {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) {
        setBusy(false)
        window.alert('삭제 실패: ' + error.message)
        return
      }
    }
    router.replace('/tasks')
    router.refresh()
  }

  function onClick() {
    // 반복 항목이면 범위 모달, 아니면 단건 confirm.
    if (recurrenceId) {
      setModal(true)
      return
    }
    if (!window.confirm('이 할 일을 삭제할까요?')) return
    void runDelete('one')
  }

  return (
    <>
      <button
        onClick={onClick}
        disabled={busy}
        className="rounded-2xl bg-b27-expense-soft px-5 py-3.5 text-[14px] font-medium text-b27-expense transition active:opacity-70 disabled:opacity-50"
      >
        {busy ? '삭제 중…' : '삭제'}
      </button>
      {modal && (
        <RecurrenceScopeModal
          title="반복 항목 삭제"
          message="어디까지 삭제할까요? ‘남은 모두’는 완료되지 않은 이후 반복 항목을 함께 삭제합니다(완료된 과거 항목은 보존)."
          oneLabel="이 항목만 삭제"
          followingLabel="남은(미완료) 반복 모두 삭제"
          busy={busy}
          onChoose={(s) => runDelete(s)}
          onCancel={() => setModal(false)}
        />
      )}
    </>
  )
}
