// MFH-OFFLINE-STORE-V1 — 오프라인 읽기용 로컬 스냅샷(IndexedDB) (오프라인 2b)
// 온라인일 때 일지/할일 페이지가 최근 데이터와 썸네일을 여기에 적재하고,
// 회선이 끊기면 /offline 화면이 이 스냅샷을 읽어 열람하게 한다.
// 단일 사용자·개인 기기 전제(평문 저장). 썸네일은 512px WebP(~22KB)라 용량 부담이 작다.

const DB_NAME = 'mfh-offline'
const DB_VERSION = 1
const KV = 'kv' // 'journals' | 'tasks' → Snapshot
const THUMBS = 'thumbs' // storage path → Blob

export type OfflineJournal = {
  id: string
  entry_date: string
  category: string | null
  headline: string | null
  today: string | null
  place_name: string | null
  thumbPath: string | null // thumbs store 키(대표 썸네일). 없으면 null.
}

export type OfflineTask = {
  id: string
  title: string
  due_date: string | null
  due_time: string | null
  importance: number
  category: string | null
}

export type Snapshot<T> = { items: T[]; savedAt: number }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV)
      if (!db.objectStoreNames.contains(THUMBS)) db.createObjectStore(THUMBS)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// 단일 store 요청을 Promise 로 래핑(get/put/delete/getAllKeys 공용).
function run<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = fn(t.objectStore(store))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        t.oncomplete = () => db.close()
      }),
  )
}

export async function saveJournals(items: OfflineJournal[]): Promise<void> {
  await run(KV, 'readwrite', (s) => s.put({ items, savedAt: Date.now() }, 'journals'))
}

export async function loadJournals(): Promise<Snapshot<OfflineJournal> | null> {
  const v = await run<Snapshot<OfflineJournal> | undefined>(KV, 'readonly', (s) => s.get('journals'))
  return v ?? null
}

export async function saveTasks(items: OfflineTask[]): Promise<void> {
  await run(KV, 'readwrite', (s) => s.put({ items, savedAt: Date.now() }, 'tasks'))
}

export async function loadTasks(): Promise<Snapshot<OfflineTask> | null> {
  const v = await run<Snapshot<OfflineTask> | undefined>(KV, 'readonly', (s) => s.get('tasks'))
  return v ?? null
}

export async function loadThumb(path: string): Promise<Blob | null> {
  const v = await run<Blob | undefined>(THUMBS, 'readonly', (s) => s.get(path))
  return v ?? null
}

// 온라인 시: { thumbPath: signedUrl } 맵을 받아 각 썸네일을 blob 으로 내려받아 저장한다.
// 이미 저장돼 있으면 건너뛴다(중복 네트워크 방지).
export async function cacheThumbs(urlByPath: Record<string, string>): Promise<void> {
  for (const path of Object.keys(urlByPath)) {
    try {
      const existing = await loadThumb(path)
      if (existing) continue
      const res = await fetch(urlByPath[path])
      if (!res.ok) continue
      const blob = await res.blob()
      await run(THUMBS, 'readwrite', (s) => s.put(blob, path))
    } catch {
      // 개별 썸네일 실패는 무시
    }
  }
}

// 현재 스냅샷에 없는 옛 썸네일을 정리(일지가 교체되며 쌓이는 누적 방지).
export async function pruneThumbs(keepPaths: string[]): Promise<void> {
  const keep = new Set(keepPaths)
  const keys = await run<IDBValidKey[]>(THUMBS, 'readonly', (s) => s.getAllKeys())
  for (const k of keys) {
    if (typeof k === 'string' && !keep.has(k)) {
      await run(THUMBS, 'readwrite', (s) => s.delete(k))
    }
  }
}
