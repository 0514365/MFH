// MFH-SELECTION-MODE-V1
// 다중선택 모드 공통 hook. 일지·프로젝트·할일 목록이 공유.
// - selectMode = 모드 활성 여부 (헤더의 "선택" 버튼으로 토글)
// - selected = 선택된 id 집합 (Set, 순서 무관 빠른 조회/토글)
// - 모드 끄면(exit) 선택도 비움. 모드 켜면 빈 선택으로 시작.
import { useCallback, useState } from 'react'

export type SelectionMode = {
  selectMode: boolean
  selected: Set<string>
  count: number
  toggleMode: () => void
  exit: () => void
  enter: () => void
  toggleId: (id: string) => void
  selectAll: (ids: string[]) => void
  clear: () => void
  isSelected: (id: string) => boolean
}

export function useSelectionMode(): SelectionMode {
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  const exit = useCallback(() => {
    setSelectMode(false)
    setSelected(new Set())
  }, [])

  const enter = useCallback(() => {
    setSelectMode(true)
    setSelected(new Set())
  }, [])

  const toggleMode = useCallback(() => {
    setSelectMode((prev) => {
      if (prev) {
        // 끄는 길: 선택도 비움
        setSelected(new Set())
        return false
      }
      // 켜는 길: 빈 선택으로 시작
      setSelected(new Set())
      return true
    })
  }, [])

  const toggleId = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelected(new Set(ids))
  }, [])

  const clear = useCallback(() => {
    setSelected(new Set())
  }, [])

  const isSelected = useCallback(
    (id: string): boolean => selected.has(id),
    [selected],
  )

  return {
    selectMode,
    selected,
    count: selected.size,
    toggleMode,
    exit,
    enter,
    toggleId,
    selectAll,
    clear,
    isSelected,
  }
}
