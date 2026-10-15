'use client'
// MFH-ITEM-ADD-BUTTON-V1
// 항목(분류) 즉석 추가 — 작은 '+' 버튼 → 모달(이름 · 대분류 선택/직접 입력) → saveItem → 콤보 갱신(router.refresh) + onCreated(새 id).
// 기록 폼(항목 드롭다운 옆)과 승인대기 상단에서 공용. 구분(수입/지출)은 호출부가 넘긴다.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveItem } from './actions'

const inp =
  'h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition focus:border-primary'
const CUSTOM = '__custom__'

export default function ItemAddButton({
  gubun,
  categories,
  onCreated,
  label,
}: {
  gubun: '수입' | '지출'
  categories: string[] // 기존 대분류(해당 구분)
  onCreated?: (id: string) => void
  label?: string // 미지정 = '+' 아이콘 버튼
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [cat, setCat] = useState(categories[0] ?? CUSTOM)
  const [catCustom, setCatCustom] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function close() {
    setOpen(false)
    setName('')
    setCatCustom('')
    setErr('')
  }

  async function onSave() {
    const category = cat === CUSTOM ? catCustom : cat
    setErr('')
    setSaving(true)
    const res = await saveItem({ gubun, name, category })
    setSaving(false)
    if (!res.ok || !res.id) {
      setErr(res.error ?? '저장 실패')
      return
    }
    const id = res.id
    close()
    router.refresh()
    onCreated?.(id)
  }

  return (
    <>
      {label ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-9 rounded-lg border border-line px-3 text-xs font-medium text-muted transition hover:border-primary hover:text-primary"
        >
          {label}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="항목 추가"
          title="항목 추가"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-line text-[13px] leading-none text-muted transition hover:border-primary hover:text-primary"
        >
          +
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 @md:items-center"
          onClick={close}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="항목 추가"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-ink">
                {gubun} 항목 추가
              </h3>
              <button type="button" onClick={close} className="text-xs text-muted hover:text-primary">
                닫기
              </button>
            </div>
            <label className="mb-1 block text-[11px] font-medium text-faint">항목 이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={gubun === '지출' ? '예: 반려동물' : '예: 강사료'}
              className={inp}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && onSave()}
            />
            <label className="mb-1 mt-3 block text-[11px] font-medium text-faint">대분류</label>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className={inp}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={CUSTOM}>직접 입력…</option>
            </select>
            {cat === CUSTOM && (
              <input
                value={catCustom}
                onChange={(e) => setCatCustom(e.target.value)}
                placeholder="새 대분류 이름"
                className={`${inp} mt-2`}
              />
            )}
            {err && <p className="mt-2 text-xs font-medium text-accent">{err}</p>}
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !name.trim()}
              className="mt-4 h-11 w-full rounded-xl bg-accent text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-40"
            >
              {saving ? '저장 중…' : '추가'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
