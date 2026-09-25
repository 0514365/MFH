// MFH-BIBLE-TEXTS-V1 — 인앱 성경 본문(patch105 bible_texts) 조회 + 버전 상수 + 절 범위 조회(QT 「본문 읽기」용). Manna lib/bible/texts.ts V2 이식.
// 본문 원자료는 repo 밖(../Manna/Bible, BIBLE_DIR) — 시딩은 scripts/bible-seed.ts(service role)만. 읽기 = 멤버 RLS(is_member).
// 읽기 화면은 정경 순서 장 번호(chap_seq 1..1189)로 조회한다. 계획의 start_seq/end_seq(읽기 순서)와 다름에 주의.
import type { SupabaseClient } from '@supabase/supabase-js'
import { BIBLE_BOOKS } from './data'
import type { ChapterRef } from './plan'

export const BIBLE_VERSIONS = ['nkrv', 'nkt', 'esv'] as const
export type BibleVersion = (typeof BIBLE_VERSIONS)[number]

export const BIBLE_VERSION_LABEL: Record<BibleVersion, string> = {
  nkrv: '개역개정',
  nkt: '새한글',
  esv: 'ESV',
}

// 본문 버전 쿠키 — 다크 모드(theme)와 같은 방식. 기본 개역개정.
export const BIBLE_VERSION_COOKIE = 'bible_ver'
export function parseBibleVersion(raw: string | undefined | null): BibleVersion {
  return BIBLE_VERSIONS.includes(raw as BibleVersion) ? (raw as BibleVersion) : 'nkrv'
}

// 책별 정경 시작 chap_seq(1-based) 누적표. 창1 = 1 … 계1 = 1168.
const bookStartSeq: number[] = (() => {
  const out: number[] = []
  let acc = 1
  for (const b of BIBLE_BOOKS) {
    out.push(acc)
    acc += b.chapters
  }
  return out
})()

export function chapSeqOf(bookOrder: number, chapter: number): number {
  return bookStartSeq[bookOrder - 1] + chapter - 1
}

// 책명(정식) 또는 약어 → 정경 순서. 모르면 null.
export function bookOrderOf(name: string): number | null {
  const n = (name ?? '').trim()
  const b = BIBLE_BOOKS.find((b) => b.name === n || b.abbr === n)
  return b ? b.order : null
}

// QT passage.range 파싱: '8:1-21' · '8:1-9:3' · '8:1 - 9:3' · '8'(장 전체)
export type PassageRange = { c1: number; v1: number; c2: number; v2: number }
export function parsePassageRange(range: string): PassageRange | null {
  const r = (range ?? '').replace(/\s/g, '')
  let m = /^(\d+):(\d+)-(\d+):(\d+)$/.exec(r)
  if (m) return { c1: +m[1], v1: +m[2], c2: +m[3], v2: +m[4] }
  m = /^(\d+):(\d+)-(\d+)$/.exec(r)
  if (m) return { c1: +m[1], v1: +m[2], c2: +m[1], v2: +m[3] }
  m = /^(\d+):(\d+)$/.exec(r)
  if (m) return { c1: +m[1], v1: +m[2], c2: +m[1], v2: +m[2] }
  m = /^(\d+)장?$/.exec(r)
  if (m) return { c1: +m[1], v1: 1, c2: +m[1], v2: 999 }
  return null
}

// 절 범위 본문(장 경계 넘기 허용). 합절(verse_end)은 범위와 겹치면 포함.
export async function getPassageVerses(
  supabase: SupabaseClient,
  version: BibleVersion,
  bookOrder: number,
  r: PassageRange,
): Promise<VerseRow[]> {
  const seqs: number[] = []
  for (let c = r.c1; c <= r.c2; c++) seqs.push(chapSeqOf(bookOrder, c))
  const { data } = await supabase
    .from('bible_texts')
    .select('chap_seq, book_order, chapter, verse, verse_end, body')
    .eq('version', version)
    .in('chap_seq', seqs)
    .order('chap_seq')
    .order('verse')
  const rows = (data ?? []) as VerseRow[]
  return rows.filter((v) => {
    const end = v.verse_end ?? v.verse
    if (v.chapter === r.c1 && end < r.v1) return false
    if (v.chapter === r.c2 && v.verse > r.v2) return false
    return true
  })
}

export type VerseRow = {
  chap_seq: number
  book_order: number
  chapter: number
  verse: number
  verse_end: number | null
  body: string
}

export type ChapterText = {
  chapSeq: number
  ref: ChapterRef
  verses: VerseRow[]
}

// 하루치 장 목록의 본문. 반환 chapters 는 요청 순서(읽기 순서) 그대로, 빠진 장은 missing 에 담는다.
export async function getChapterTexts(
  supabase: SupabaseClient,
  version: BibleVersion,
  refs: ChapterRef[],
): Promise<{ chapters: ChapterText[]; missing: ChapterRef[] }> {
  const seqs = refs.map((r) => chapSeqOf(r.book.order, r.chapter))
  const { data } = await supabase
    .from('bible_texts')
    .select('chap_seq, book_order, chapter, verse, verse_end, body')
    .eq('version', version)
    .in('chap_seq', seqs)
    .order('chap_seq')
    .order('verse')
  const rows = (data ?? []) as VerseRow[]
  const bySeq = new Map<number, VerseRow[]>()
  for (const r of rows) {
    const list = bySeq.get(r.chap_seq) ?? []
    list.push(r)
    bySeq.set(r.chap_seq, list)
  }
  const chapters: ChapterText[] = []
  const missing: ChapterRef[] = []
  refs.forEach((ref, i) => {
    const verses = bySeq.get(seqs[i])
    if (verses && verses.length > 0) chapters.push({ chapSeq: seqs[i], ref, verses })
    else missing.push(ref)
  })
  return { chapters, missing }
}
