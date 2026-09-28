'use client'

// MFH-BIBLE-STUDY-FINDER-V1 — LOGOS 식 찾기 시트(모바일 하단 시트 · lg 중앙 모달). 탭 4개:
//   구절: 입력창("요 3:16") + 66권 색상 그리드 → 장 그리드 → 절 그리드 → 실행
//   내용: 단어 검색(버전·범위, AND, 100건 페이지, 하이라이트) → 결과 탭 → 이동
//   최근 사용순 / 즐겨찾기: localStorage 목록(storage.ts)
// onGo(loc, words?) 로 부모(StudyClient)가 대상 패널을 이동시킨다.
import { useEffect, useMemo, useRef, useState } from 'react'
import { BIBLE_BOOKS, type BibleBook } from '@/lib/bible/data'
import { BIBLE_VERSIONS, BIBLE_VERSION_LABEL, chapSeqOf, type BibleVersion, type VerseRow } from '@/lib/bible/texts'
import { bookOfSeq, groupOf, locLabel, parseRefInput, stripHeadings, type Loc, type SearchScope } from '@/lib/bible/ref'
import { markText } from '@/components/VerseText'
import { fetchChapter } from './chapterCache'
import { loadFav, loadRecent, removeFav, type SavedLoc } from './storage'

export type FinderTab = 'ref' | 'search' | 'recent' | 'fav'

type Props = {
  open: boolean
  tab: FinderTab
  ver: BibleVersion // 검색·절 그리드 기본 버전(대상 패널의 버전)
  current: Loc
  onTab: (t: FinderTab) => void
  onClose: () => void
  onGo: (loc: Loc, words?: string[]) => void
}

const TABS: { key: FinderTab; label: string }[] = [
  { key: 'ref', label: '구절' },
  { key: 'search', label: '내용' },
  { key: 'recent', label: '최근 사용순' },
  { key: 'fav', label: '즐겨찾기' },
]
const CELL = 'flex h-11 items-center justify-center rounded-lg text-[14px] font-semibold transition active:scale-95'
const GRID_BTN = `${CELL} border border-line bg-surface text-ink hover:border-primary`
const PRIMARY_BTN = 'rounded-full bg-primary px-4 py-1.5 text-[13px] font-bold text-on-primary transition active:scale-95 disabled:opacity-40'

export default function FinderSheet({ open, tab, ver, current, onTab, onClose, onGo }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 min-[740px]:items-center" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-paper shadow-2xl min-[740px]:max-h-[85vh] min-[740px]:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단: 닫기 + 탭 */}
        <div className="flex shrink-0 items-center gap-2 px-3 pt-3">
          <button type="button" onClick={onClose} aria-label="닫기" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-muted">
            ✕
          </button>
          <div className="flex flex-1 rounded-full bg-surface-subtle p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => onTab(t.key)}
                className={`flex-1 rounded-full py-1.5 text-[12px] font-semibold transition ${tab === t.key ? 'bg-surface text-primary shadow-soft' : 'text-muted'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-3" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
          {tab === 'ref' && <RefTab ver={ver} current={current} onGo={onGo} />}
          {tab === 'search' && <SearchTab ver={ver} current={current} onGo={onGo} />}
          {tab === 'recent' && <ListTab kind="recent" onGo={onGo} />}
          {tab === 'fav' && <ListTab kind="fav" onGo={onGo} />}
        </div>
      </div>
    </div>
  )
}

/* ---------------- 구절 ---------------- */
function RefTab({ ver, current, onGo }: { ver: BibleVersion; current: Loc; onGo: (l: Loc) => void }) {
  const [input, setInput] = useState('')
  const [book, setBook] = useState<BibleBook | null>(null)
  const [chapter, setChapter] = useState<number | null>(null)
  const [verseCount, setVerseCount] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const parsed = useMemo(() => (input.trim() ? parseRefInput(input) : null), [input])

  // 장 선택 → 절 수(패널 버전 기준, 폴백 포함) 조회
  useEffect(() => {
    if (!book || !chapter) return
    let alive = true
    setVerseCount(null)
    fetchChapter(ver, chapSeqOf(book.order, chapter))
      .then((c) => alive && setVerseCount(Math.max(1, ...c.verses.map((v) => v.verse_end ?? v.verse))))
      .catch(() => alive && setVerseCount(1))
    return () => {
      alive = false
    }
  }, [book, chapter, ver])

  function run(verse?: number) {
    if (parsed && !book) return onGo(parsed)
    if (!book) return
    onGo({ seq: chapSeqOf(book.order, chapter ?? 1), verse: verse ?? 1 })
  }

  const title = book ? `${book.name}${chapter ? ` ${chapter}` : ''}` : null

  return (
    <div>
      {/* 입력창 — 책을 고르기 전 단계에서만 */}
      {!book && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (parsed) onGo(parsed)
          }}
          className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-surface px-3"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`성경 구절을 입력합니다. 예: "요한복음 1:1"`}
            enterKeyHint="go"
            className="h-11 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
          />
          <button type="submit" disabled={!parsed} className={PRIMARY_BTN}>
            {parsed ? locLabel(parsed) : '실행'}
          </button>
        </form>
      )}

      {/* 단계 헤더(책 고른 뒤) */}
      {book && (
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => (chapter ? (setChapter(null), setVerseCount(null)) : setBook(null))}
            aria-label="뒤로"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted"
          >
            ‹
          </button>
          <div className="text-[17px] font-bold text-ink">{title}</div>
          <button type="button" onClick={() => run()} className={PRIMARY_BTN}>
            실행
          </button>
        </div>
      )}

      {/* 66권 그리드 */}
      {!book && (
        <div className="grid grid-cols-5 gap-1.5">
          {BIBLE_BOOKS.map((b) => (
            <button
              key={b.order}
              type="button"
              onClick={() => {
                setBook(b)
                setChapter(null)
              }}
              className={`${CELL} ${groupOf(b.order).cls} ${bookOfSeq(current.seq).book.order === b.order ? 'ring-2 ring-primary' : ''}`}
              title={b.name}
            >
              {b.abbr}
            </button>
          ))}
        </div>
      )}

      {/* 장 그리드 */}
      {book && !chapter && (
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((c) => (
            <button key={c} type="button" onClick={() => setChapter(c)} className={GRID_BTN}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* 절 그리드 */}
      {book && chapter && (
        <div className="grid grid-cols-5 gap-1.5">
          {verseCount == null ? (
            <p className="col-span-5 py-6 text-center text-sm text-muted">절 목록 불러오는 중…</p>
          ) : (
            Array.from({ length: verseCount }, (_, i) => i + 1).map((v) => (
              <button key={v} type="button" onClick={() => run(v)} className={GRID_BTN}>
                {v}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------- 내용(단어 검색) ---------------- */
type SearchResult = { total: number; offset: number; limit: number; rows: VerseRow[] }

function SearchTab({ ver: initialVer, current, onGo }: { ver: BibleVersion; current: Loc; onGo: (l: Loc, words: string[]) => void }) {
  const [q, setQ] = useState('')
  const [ver, setVer] = useState<BibleVersion>(initialVer)
  const [scope, setScope] = useState<SearchScope>('all')
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'ok' | 'error'; words: string[]; res: SearchResult | null; error?: string }>({
    status: 'idle',
    words: [],
    res: null,
  })
  const curBook = bookOfSeq(current.seq).book

  async function search(offset = 0, append = false) {
    const words = q.trim().split(/\s+/).filter(Boolean)
    if (words.join('').length < 2) return setState({ status: 'error', words: [], res: null, error: '검색어는 2자 이상 입력하세요.' })
    setState((p) => ({ ...p, status: 'loading', words }))
    try {
      const res = await fetch(`/api/bible/search?q=${encodeURIComponent(words.join(' '))}&ver=${ver}&scope=${scope}&offset=${offset}`)
      const json = (await res.json()) as SearchResult & { error?: string }
      if (!res.ok) throw new Error(json.error ?? String(res.status))
      setState((p) => ({
        status: 'ok',
        words,
        res: append && p.res ? { ...json, rows: [...p.res.rows, ...json.rows] } : json,
      }))
    } catch (e) {
      setState({ status: 'error', words, res: null, error: e instanceof Error ? e.message : '검색에 실패했습니다.' })
    }
  }

  const res = state.res
  const hasMore = !!res && res.offset + res.rows.length < res.total && res.rows.length < res.total

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          search(0)
        }}
        className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="단어 검색 (띄어쓰기 = 모두 포함)"
          enterKeyHint="search"
          className="h-11 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
        />
        <button type="submit" disabled={state.status === 'loading'} className={PRIMARY_BTN}>
          검색
        </button>
      </form>
      <div className="mt-2 flex gap-1.5">
        <select value={ver} onChange={(e) => setVer(e.target.value as BibleVersion)} aria-label="검색 버전" className="h-8 rounded-lg border border-line bg-surface px-1.5 text-[12px] font-semibold text-primary">
          {BIBLE_VERSIONS.map((v) => (
            <option key={v} value={v}>
              {BIBLE_VERSION_LABEL[v]}
            </option>
          ))}
        </select>
        <select value={scope} onChange={(e) => setScope(e.target.value as SearchScope)} aria-label="검색 범위" className="h-8 rounded-lg border border-line bg-surface px-1.5 text-[12px] font-semibold text-primary">
          <option value="all">전체</option>
          <option value="ot">구약</option>
          <option value="nt">신약</option>
          <option value={`book:${curBook.order}`}>{curBook.name}</option>
        </select>
      </div>

      {state.status === 'error' && <p className="mt-3 text-sm text-danger">{state.error}</p>}
      {state.status === 'loading' && !res && <p className="mt-6 text-center text-sm text-muted">검색 중…</p>}
      {res && (
        <div className="mt-3">
          <p className="mb-2 text-[12px] text-muted">
            {res.total.toLocaleString()}건 · {BIBLE_VERSION_LABEL[ver]}
          </p>
          <ul className="divide-y divide-line">
            {res.rows.map((r) => {
              const loc = { seq: r.chap_seq, verse: r.verse }
              return (
                <li key={`${r.chap_seq}:${r.verse}`}>
                  <button type="button" onClick={() => onGo(loc, state.words)} className="w-full py-2.5 text-left transition active:bg-surface-subtle">
                    <div className="font-display text-[11px] font-bold text-accent">{locLabel(loc, true)}</div>
                    <p className="mt-0.5 line-clamp-3 text-[14px] leading-relaxed text-ink">{markText(stripHeadings(r.body), state.words)}</p>
                  </button>
                </li>
              )
            })}
          </ul>
          {res.rows.length === 0 && <p className="py-6 text-center text-sm text-muted">일치하는 구절이 없습니다.</p>}
          {hasMore && (
            <button type="button" onClick={() => search(res.offset + res.limit, true)} disabled={state.status === 'loading'} className="mt-3 w-full rounded-xl border border-line py-2 text-[13px] font-semibold text-muted">
              {state.status === 'loading' ? '불러오는 중…' : `더 보기 (${res.rows.length}/${res.total})`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------- 최근·즐겨찾기 ---------------- */
function ListTab({ kind, onGo }: { kind: 'recent' | 'fav'; onGo: (l: Loc) => void }) {
  const [items, setItems] = useState<SavedLoc[]>([])
  useEffect(() => setItems(kind === 'recent' ? loadRecent() : loadFav()), [kind])

  if (items.length === 0)
    return <p className="py-10 text-center text-sm text-muted">{kind === 'recent' ? '최근 이동한 구절이 없습니다.' : '패널 헤더의 ☆ 로 즐겨찾기를 추가하세요.'}</p>

  return (
    <ul className="divide-y divide-line">
      {items.map((it) => (
        <li key={`${it.seq}:${it.verse}:${it.t}`} className="flex items-center gap-2">
          <button type="button" onClick={() => onGo({ seq: it.seq, verse: it.verse })} className="min-w-0 flex-1 py-3 text-left">
            <div className="text-[15px] font-bold text-ink">{it.label}</div>
            <div className="text-[11px] text-faint">{new Date(it.t).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })}</div>
          </button>
          {kind === 'fav' && (
            <button type="button" onClick={() => setItems(removeFav(it.seq, it.verse))} aria-label="삭제" className="h-8 w-8 rounded-lg border border-line text-[12px] text-muted">
              ✕
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
