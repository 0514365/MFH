// MFH-USE-CATEGORIES-V1
// 사역분류 공유 소스. categories 테이블(DB) + 상수 시드(JOURNAL_CATEGORIES)를
// 합쳐 distinct·정렬해 제공. 새 분류 insert 헬퍼 포함(일지·프로젝트·할일 공용).
'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { JOURNAL_CATEGORIES } from '@/lib/constants'

const SEED = [...JOURNAL_CATEGORIES] as string[]

function mergeSort(dbNames: string[]): string[] {
  const set = new Set<string>()
  for (const n of SEED) set.add(n)
  for (const n of dbNames) if (n.trim()) set.add(n.trim())
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'))
}

export function useCategories() {
  const [categories, setCategories] = useState<string[]>(() => mergeSort([]))
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('categories').select('name').order('name')
    const names = ((data ?? []) as { name: string | null }[])
      .map((r) => (r.name ?? '').trim())
      .filter((n) => n.length > 0)
    setCategories(mergeSort(names))
    setLoaded(true)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // 새 분류를 categories 테이블에 추가(중복은 무시). 성공 시 정규화된 이름 반환.
  const addCategory = useCallback(
    async (raw: string): Promise<string | null> => {
      const name = raw.trim()
      if (!name) return null
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null
      // 이미 있으면 그냥 이름 반환(시드/타사용자 입력과 충돌 방지)
      await supabase
        .from('categories')
        .upsert({ user_id: user.id, name }, { onConflict: 'user_id,name', ignoreDuplicates: true })
      setCategories((prev) => (prev.includes(name) ? prev : mergeSort([...prev, name])))
      return name
    },
    [],
  )

  return { categories, loaded, reload, addCategory }
}
