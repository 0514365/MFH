// MFH-CATEGORY-SELECT-V1
// 사역분류 공통 입력. select 에 "+ 새 분류 만들기" 옵션 → 인라인 입력창 →
// categories 테이블에 즉시 insert → 선택값으로 반영(다른 폼에서도 다음부터 노출).
'use client'

import { useState } from 'react'
import { useCategories } from '@/lib/useCategories'

const ADD_SENTINEL = '__add_new__'

type Props = {
  value: string
  onChange: (v: string) => void
  className?: string
  emptyLabel?: string
}

export default function CategorySelect({
  value,
  onChange,
  className = '',
  emptyLabel = '선택 안 함',
}: Props) {
  const { categories, addCategory } = useCategories()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // 현재 값이 목록에 없으면(과거 자유입력 등) 옵션에 함께 노출
  const options = value && !categories.includes(value) ? [value, ...categories] : categories

  function onSelect(v: string) {
    if (v === ADD_SENTINEL) {
      setAdding(true)
      setDraft('')
      setErr(null)
      return
    }
    onChange(v)
  }

  async function confirmAdd() {
    const name = draft.trim()
    if (!name) {
      setErr('분류 이름을 입력해 주세요.')
      return
    }
    setBusy(true)
    setErr(null)
    const saved = await addCategory(name)
    setBusy(false)
    if (!saved) {
      setErr('분류 추가에 실패했습니다. 로그인 상태를 확인해 주세요.')
      return
    }
    onChange(saved)
    setAdding(false)
    setDraft('')
  }

  if (adding) {
    return (
      <div className={className ? '' : ''}>
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-xl border border-primary bg-surface px-4 py-3 text-sm outline-none"
            placeholder="새 분류 이름"
            autoFocus
          />
          <button
            type="button"
            onClick={confirmAdd}
            disabled={busy}
            className="shrink-0 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? '추가 중…' : '추가'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false)
              setErr(null)
            }}
            className="shrink-0 rounded-xl border border-line px-3 py-3 text-sm text-muted transition hover:border-primary"
          >
            취소
          </button>
        </div>
        {err && <p className="mt-1 text-[11px] text-danger">{err}</p>}
      </div>
    )
  }

  return (
    <select value={value} onChange={(e) => onSelect(e.target.value)} className={className}>
      <option value="">{emptyLabel}</option>
      {options.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
      <option value={ADD_SENTINEL}>＋ 새 분류 만들기…</option>
    </select>
  )
}
