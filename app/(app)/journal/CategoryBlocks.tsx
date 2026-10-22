'use client'

// MFH-JOURNAL-CATEGORY-BLOCKS-V1 — 2027(4-1): 일지 쓰기 사역 분류 = 블록 선택(4열 · 직각 · 틈 3px).
//   선택 = 진한 파스텔 + 흰 글자 할로 + ✓ + 남색 안쪽 3px / 나머지 = 같은 색 틴트 + 진한 톤 글자(홈 투톤 블록 규칙).
//   분류 색 = JOURNAL_CATEGORY_BLOCK, 목록에 없는 분류는 순서대로 순환. 「＋ 새 분류」 = categories 테이블 insert(CategorySelect 와 동일).
import { useState } from 'react'
import { useCategories } from '@/lib/useCategories'
import { JOURNAL_CATEGORY_BLOCK } from '@/lib/constants'
import { blockColor, blockHalo, blockTint } from '@/lib/palette'

export default function CategoryBlocks({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { categories, addCategory } = useCategories()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // 현재 값이 목록에 없으면(과거 자유입력 등) 앞에 함께 노출
  const options = value && !categories.includes(value) ? [value, ...categories] : categories

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

  const cell = 'flex h-[52px] min-w-0 items-end px-2 pb-1.5 text-left text-[12px] font-semibold leading-tight transition active:opacity-80'

  return (
    <div>
      <div className="grid grid-cols-4 gap-[3px] overflow-hidden rounded-2xl bg-b27-paper">
        {options.map((c, i) => {
          const n = JOURNAL_CATEGORY_BLOCK[c] ?? (i % 8) + 1
          const on = c === value
          const { bg } = blockColor(n)
          const { tint, deep } = blockTint(n)
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(on ? '' : c)}
              aria-pressed={on}
              className={cell}
              style={
                on
                  ? { background: bg, color: '#fff', textShadow: blockHalo(n), boxShadow: 'inset 0 0 0 3px var(--b27-ink)' }
                  : { background: tint, color: deep }
              }
            >
              <span className="line-clamp-2 break-keep">
                {on && '✓ '}
                {c}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => {
            setAdding(true)
            setDraft('')
            setErr(null)
          }}
          className={`${cell} bg-b27-card text-b27-muted`}
        >
          ＋ 새 분류
        </button>
      </div>

      {adding && (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-xl bg-b27-card px-4 py-3 text-sm text-b27-ink outline-none placeholder:text-b27-muted"
            placeholder="새 분류 이름"
            autoFocus
          />
          <button
            type="button"
            onClick={confirmAdd}
            disabled={busy}
            className="shrink-0 rounded-xl bg-b27-ink px-4 py-3 text-sm font-medium text-white transition active:opacity-80 disabled:opacity-50"
          >
            {busy ? '추가 중…' : '추가'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false)
              setErr(null)
            }}
            className="shrink-0 rounded-xl px-2 py-3 text-sm text-b27-muted"
          >
            취소
          </button>
        </div>
      )}
      {err && <p className="mt-1 text-[11px] text-b27-expense">{err}</p>}
    </div>
  )
}
