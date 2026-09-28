// MFH-BIBLE-STUDY-CACHE-V1 — /api/bible/chapter 클라이언트 캐시(버전:장 키). 패널·찾기 시트(절 그리드)가 공유.
// 같은 장을 동시에 요청하면 in-flight Promise 를 재사용. 앞뒤 장 prefetch 도 여기로.
import type { BibleVersion, VerseRow } from '@/lib/bible/texts'
import { MAX_SEQ } from '@/lib/bible/ref'

export type Chapter = { served: BibleVersion; seq: number; verses: VerseRow[] }

const cache = new Map<string, Chapter>()
const inflight = new Map<string, Promise<Chapter>>()

export function getCached(ver: BibleVersion, seq: number): Chapter | undefined {
  return cache.get(`${ver}:${seq}`)
}

export function fetchChapter(ver: BibleVersion, seq: number): Promise<Chapter> {
  const key = `${ver}:${seq}`
  const hit = cache.get(key)
  if (hit) return Promise.resolve(hit)
  const pending = inflight.get(key)
  if (pending) return pending
  const p = fetch(`/api/bible/chapter?ver=${ver}&seq=${seq}`)
    .then(async (res) => {
      if (!res.ok) throw new Error(String(res.status))
      const json = (await res.json()) as Chapter
      cache.set(key, json)
      return json
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

export function prefetchAround(ver: BibleVersion, seq: number) {
  for (const s of [seq - 1, seq + 1]) {
    if (s >= 1 && s <= MAX_SEQ && !cache.has(`${ver}:${s}`)) fetchChapter(ver, s).catch(() => {})
  }
}
