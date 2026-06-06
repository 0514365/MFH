// MFH-LINKED-PICKER-V1
// 로그 작성 "연계" 선택용 커스텀 드롭다운.
// native <select> 로는 "완료된 항목 N개 보기" 토글 펼침이 불가능 → 커스텀 구현.
// 미완료 항목 기본 노출 + 완료 항목은 하단 토글로 펼침. 외부 클릭 시 닫힘.
'use client'

import { useEffect, useRef, useState } from 'react'

export type PickerItem = { id: string; title: string; sub?: string }

type Props = {
  value: string
  onChange: (id: string) => void
  activeItems: PickerItem[]
  doneItems: PickerItem[]
  selectedLabel: string // 현재 선택값의 표시명('' = 미선택). 완료/필터 제외 항목도 표시되게 부모가 전달.
  placeholder: string
  emptyLabel: string // "선택 안 함" 행 라벨 (= placeholder 와 동일 문구 권장)
  doneLabel: string // "완료된 프로젝트" 등
}

export default function LinkedPicker({
  value,
  onChange,
  activeItems,
  doneItems,
  selectedLabel,
  placeholder,
  emptyLabel,
  doneLabel,
}: Props) {
  const [open, setOpen] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // 트리거가 화면 하단이면(아래 공간 부족) 드롭다운을 위로 펼친다.
  function toggleOpen() {
    setOpen((v) => {
      const next = !v
      if (next && rootRef.current) {
        const rect = rootRef.current.getBoundingClientRect()
        setDropUp(window.innerHeight - rect.bottom < 320)
      }
      return next
    })
  }

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function pick(id: string) {
    onChange(id)
    setOpen(false)
  }

  const trigger =
    'flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-primary'
  const row =
    'flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-surface-subtle'

  function Item({ it }: { it: PickerItem }) {
    const on = it.id === value
    return (
      <button
        type="button"
        onClick={() => pick(it.id)}
        className={`${row} ${on ? 'font-semibold text-primary' : 'text-ink'}`}
      >
        <span className="min-w-0 truncate">
          {it.title}
          {it.sub ? <span className="text-faint"> · {it.sub}</span> : null}
        </span>
        {on && <span className="shrink-0 text-primary">✓</span>}
      </button>
    )
  }

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={toggleOpen} className={trigger}>
        <span className={`min-w-0 truncate ${selectedLabel ? 'text-ink' : 'text-faint'}`}>
          {selectedLabel || placeholder}
        </span>
        <span className="shrink-0 text-faint">▾</span>
      </button>

      {open && (
        <div
          className={`absolute left-0 right-0 z-30 max-h-72 overflow-auto rounded-xl border border-line bg-surface py-1 shadow-lg ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          {/* 선택 해제 */}
          <button
            type="button"
            onClick={() => pick('')}
            className={`${row} ${!value ? 'font-semibold text-primary' : 'text-muted'}`}
          >
            <span>{emptyLabel}</span>
            {!value && <span className="shrink-0 text-primary">✓</span>}
          </button>

          {activeItems.map((it) => (
            <Item key={it.id} it={it} />
          ))}
          {activeItems.length === 0 && (
            <p className="px-4 py-2.5 text-xs text-faint">표시할 항목이 없습니다.</p>
          )}

          {doneItems.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowDone((v) => !v)}
                className="mt-1 flex w-full items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-left text-xs font-semibold text-muted transition hover:bg-surface-subtle"
              >
                <span>
                  {doneLabel} {doneItems.length}개 보기
                </span>
                <span className="shrink-0">{showDone ? '▾' : '▸'}</span>
              </button>
              {showDone && doneItems.map((it) => <Item key={it.id} it={it} />)}
            </>
          )}
        </div>
      )}
    </div>
  )
}
