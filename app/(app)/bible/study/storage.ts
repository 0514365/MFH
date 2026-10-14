// MFH-BIBLE-STUDY-STORAGE-V1 — /bible/study 기기별 저장(localStorage): 패널 상태·최근 사용·즐겨찾기. DB 없음.
// 모든 접근은 try/catch(프라이빗 모드·차단 대비). 서버에서는 기본값.
import type { BibleVersion } from '@/lib/bible/texts'
import type { Loc } from '@/lib/bible/ref'

export type PaneState = { ver: BibleVersion; seq: number }
export type StudyPrefs = { panes: [PaneState, PaneState]; linked: boolean; single: boolean }
export type SavedLoc = Loc & { label: string; t: number }

const K_PREFS = 'mfh.bible.study.prefs'
const K_RECENT = 'mfh.bible.study.recent'
const K_FAV = 'mfh.bible.study.fav'
const RECENT_MAX = 20

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export const loadPrefs = () => read<StudyPrefs>(K_PREFS)
export const savePrefs = (p: StudyPrefs) => write(K_PREFS, p)

export const loadRecent = (): SavedLoc[] => read<SavedLoc[]>(K_RECENT) ?? []
export function pushRecent(item: SavedLoc): SavedLoc[] {
  const next = [item, ...loadRecent().filter((r) => r.seq !== item.seq)].slice(0, RECENT_MAX)
  write(K_RECENT, next)
  return next
}

export const loadFav = (): SavedLoc[] => read<SavedLoc[]>(K_FAV) ?? []
export function toggleFav(item: SavedLoc): { list: SavedLoc[]; added: boolean } {
  const cur = loadFav()
  const idx = cur.findIndex((f) => f.seq === item.seq && f.verse === item.verse)
  const list = idx >= 0 ? cur.filter((_, i) => i !== idx) : [item, ...cur]
  write(K_FAV, list)
  return { list, added: idx < 0 }
}
export function removeFav(seq: number, verse: number): SavedLoc[] {
  const list = loadFav().filter((f) => !(f.seq === seq && f.verse === verse))
  write(K_FAV, list)
  return list
}
