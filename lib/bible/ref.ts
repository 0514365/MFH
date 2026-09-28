// MFH-BIBLE-REF-V1 — /bible/study(성경 읽기·검색·비교) 공용 순수 유틸(서버·클라이언트 공용, 훅 없음).
//   · chap_seq(1..1189) ↔ 책·장 변환, 절 위치 라벨("요 3:16")
//   · 구절 입력 파싱("요 3:16" · "요한복음 3" · "요3:16" · "John 3:16"(영문 약어 일부))
//   · LOGOS 식 66권 그리드용 책 묶음(율법·역사·시가·대선지·소선지·복음·행전·서신·공동서신·계시) + 색
import { BIBLE_BOOKS, type BibleBook } from './data'
import { chapSeqOf } from './texts'

export type Loc = { seq: number; verse: number }

// chap_seq → 책·장
export function bookOfSeq(seq: number): { book: BibleBook; chapter: number } {
  let acc = 1
  for (const b of BIBLE_BOOKS) {
    if (seq < acc + b.chapters) return { book: b, chapter: seq - acc + 1 }
    acc += b.chapters
  }
  const last = BIBLE_BOOKS[BIBLE_BOOKS.length - 1]
  return { book: last, chapter: last.chapters }
}

export const MAX_SEQ = 1189

export function locLabel(loc: Loc, full = false): string {
  const { book, chapter } = bookOfSeq(loc.seq)
  return `${full ? book.name : book.abbr} ${chapter}:${loc.verse}`
}
export function chapterLabel(seq: number, full = false): string {
  const { book, chapter } = bookOfSeq(seq)
  return `${full ? book.name : book.abbr} ${chapter}`
}

// 영문 약어(ESV 이용자 편의) → 정경 순서
const EN_ABBR: Record<string, number> = {
  gen: 1, ex: 2, exo: 2, lev: 3, num: 4, deut: 5, deu: 5, josh: 6, jos: 6, judg: 7, jdg: 7, ruth: 8, rut: 8,
  '1sam': 9, '1sa': 9, '2sam': 10, '2sa': 10, '1kgs': 11, '1ki': 11, '2kgs': 12, '2ki': 12, '1chr': 13, '1ch': 13,
  '2chr': 14, '2ch': 14, ezra: 15, ezr: 15, neh: 16, esth: 17, est: 17, job: 18, ps: 19, psa: 19, prov: 20, pro: 20,
  eccl: 21, ecc: 21, song: 22, sos: 22, isa: 23, jer: 24, lam: 25, ezek: 26, eze: 26, dan: 27, hos: 28, joel: 29,
  amos: 30, amo: 30, obad: 31, oba: 31, jonah: 32, jon: 32, mic: 33, nah: 34, hab: 35, zeph: 36, zep: 36, hag: 37,
  zech: 38, zec: 38, mal: 39, matt: 40, mat: 40, mk: 41, mark: 41, mar: 41, lk: 42, luke: 42, luk: 42, jn: 43,
  john: 43, joh: 43, acts: 44, act: 44, rom: 45, '1cor': 46, '1co': 46, '2cor': 47, '2co': 47, gal: 48, eph: 49,
  phil: 50, php: 50, col: 51, '1thess': 52, '1th': 52, '2thess': 53, '2th': 53, '1tim': 54, '1ti': 54, '2tim': 55,
  '2ti': 55, titus: 56, tit: 56, phlm: 57, phm: 57, heb: 58, jas: 59, '1pet': 60, '1pe': 60, '2pet': 61, '2pe': 61,
  '1jn': 62, '1john': 62, '2jn': 63, '2john': 63, '3jn': 64, '3john': 64, jude: 65, jud: 65, rev: 66,
}

// 책 이름 조각(한글 정식·약어, 영문 약어) → 책. 한글은 약어 길이가 긴 것부터(요일 > 요).
export function findBook(raw: string): BibleBook | null {
  const s = (raw ?? '').trim()
  if (!s) return null
  const exact = BIBLE_BOOKS.find((b) => b.name === s || b.abbr === s)
  if (exact) return exact
  const ko = [...BIBLE_BOOKS].sort((a, b) => b.abbr.length - a.abbr.length).find((b) => s.startsWith(b.abbr) || s.startsWith(b.name))
  if (ko) return ko
  const en = s.toLowerCase().replace(/\s|\./g, '')
  const order = EN_ABBR[en]
  return order ? BIBLE_BOOKS[order - 1] : null
}

// "요 3:16" · "요한복음 3" · "요3:16" · "1 John 3:16" → Loc(절 없으면 1절). 장 범위 밖이면 null.
export function parseRefInput(raw: string): Loc | null {
  const s = (raw ?? '').trim().replace(/\s+/g, ' ')
  const m = /^(.+?)\s*(\d+)(?:\s*[:：장]\s*(\d+)절?)?\s*$/.exec(s)
  if (!m) {
    const b = findBook(s)
    return b ? { seq: chapSeqOf(b.order, 1), verse: 1 } : null
  }
  const book = findBook(m[1])
  if (!book) return null
  const chapter = Number(m[2])
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return null
  const verse = m[3] ? Math.max(1, Number(m[3])) : 1
  return { seq: chapSeqOf(book.order, chapter), verse }
}

// LOGOS 식 책 묶음 + 색(밝은 배경 톤). 순서 = 정경 순서.
export type BookGroup = { key: string; label: string; from: number; to: number; cls: string }
export const BOOK_GROUPS: BookGroup[] = [
  { key: 'law', label: '율법', from: 1, to: 5, cls: 'bg-[#EEEBD0] text-[#5B5716]' },
  { key: 'hist', label: '역사', from: 6, to: 17, cls: 'bg-[#D5EAEA] text-[#1F5F63]' },
  { key: 'poet', label: '시가', from: 18, to: 22, cls: 'bg-[#EEDCCB] text-[#7A4A20]' },
  { key: 'major', label: '대선지', from: 23, to: 27, cls: 'bg-[#D9EBD3] text-[#2F5E23]' },
  { key: 'minor', label: '소선지', from: 28, to: 39, cls: 'bg-[#EEDAE0] text-[#7B2A45]' },
  { key: 'gospel', label: '복음', from: 40, to: 43, cls: 'bg-[#EEEBD0] text-[#5B5716]' },
  { key: 'acts', label: '역사', from: 44, to: 44, cls: 'bg-[#D5EAEA] text-[#1F5F63]' },
  { key: 'paul', label: '서신', from: 45, to: 57, cls: 'bg-[#EEDCCB] text-[#7A4A20]' },
  { key: 'general', label: '공동서신', from: 58, to: 65, cls: 'bg-[#D9EBD3] text-[#2F5E23]' },
  { key: 'rev', label: '계시', from: 66, to: 66, cls: 'bg-[#EEDAE0] text-[#7B2A45]' },
]
export function groupOf(order: number): BookGroup {
  return BOOK_GROUPS.find((g) => order >= g.from && order <= g.to) ?? BOOK_GROUPS[0]
}

// 검색 범위
export type SearchScope = 'all' | 'ot' | 'nt' | `book:${number}`
export function parseScope(raw: string | null | undefined): SearchScope {
  if (raw === 'ot' || raw === 'nt') return raw
  const m = /^book:(\d{1,2})$/.exec(raw ?? '')
  if (m) {
    const n = Number(m[1])
    if (n >= 1 && n <= 66) return `book:${n}`
  }
  return 'all'
}

// 본문의 인라인 소제목(<…>) 제거 — 검색 결과·미리보기용
export function stripHeadings(body: string): string {
  return body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
