'use client'

// MFH-OFFLINE-SYNC-V1 — 온라인일 때 최근 일지·할일·썸네일을 IndexedDB 스냅샷에 적재 (오프라인 2b)
// 일지/할일 페이지(서버 컴포넌트)가 보유한 데이터를 props 로 받아 백업만 한다(렌더 없음).
// 회선이 끊기면 정적 폴백 /offline.html 이 이 스냅샷을 읽어 열람한다.
import { useEffect } from 'react'
import {
  saveJournals,
  saveTasks,
  cacheThumbs,
  pruneThumbs,
  type OfflineJournal,
  type OfflineTask,
} from '@/lib/offlineStore'

export default function OfflineSync({
  journals,
  tasks,
  thumbUrls,
}: {
  journals?: OfflineJournal[]
  tasks?: OfflineTask[]
  thumbUrls?: Record<string, string> // thumbPath → signedUrl
}) {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    ;(async () => {
      try {
        if (journals) await saveJournals(journals)
        if (tasks) await saveTasks(tasks)
        if (thumbUrls) {
          await cacheThumbs(thumbUrls)
          await pruneThumbs(Object.keys(thumbUrls))
        }
      } catch {
        // 백업 실패는 조용히 무시(앱 동작에 영향 없음)
      }
    })()
    // 마운트 1회(페이지 진입 시 백업). props 는 페이지 로드마다 안정적.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
