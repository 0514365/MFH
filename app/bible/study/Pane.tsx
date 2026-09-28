'use client'

// MFH-BIBLE-STUDY-PANE-V2 (본문 하단 여백 pb-5 — 이전 장·다음 장 행이 끝에 붙지 않게)
// MFH-BIBLE-STUDY-PANE-V1 — /bible/study 본문 패널 1개(LOGOS 타일 대응).
//   헤더: [버전 select] [책 장 → 찾기 시트] [☆ 즐겨찾기] [‹ ›]  /  본문: 장 단위, 자체 스크롤 컨테이너.
//   연결 스크롤: 스크롤 중 최상단 절을 감지해 onTopVerse 로 보고. 부모가 다른 패널의 scrollToVerse(imperative) 를 호출.
//   프로그램 스크롤 직후 250ms 는 자기 보고를 막아(ignoreUntil) 두 패널이 서로를 되돌리는 순환을 끊는다.
//   jump.n 이 바뀌면(찾기·검색·최근 이동) 로드 후 jump.verse 로 스크롤. 앞뒤 장은 prefetch.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import VerseText from '@/components/VerseText'
import { BIBLE_VERSIONS, BIBLE_VERSION_LABEL, type BibleVersion, type VerseRow } from '@/lib/bible/texts'
import { MAX_SEQ, bookOfSeq } from '@/lib/bible/ref'
import { fetchChapter, getCached, prefetchAround, type Chapter } from './chapterCache'

export type PaneHandle = {
  scrollToVerse: (verse: number, smooth?: boolean) => void
  topVerse: () => number
}

type Props = {
  index: 0 | 1
  ver: BibleVersion
  seq: number
  jump: { verse: number; n: number }
  highlight?: string[]
  isFav: boolean
  onChangeVer: (v: BibleVersion) => void
  onStep: (delta: -1 | 1) => void
  onOpenFinder: () => void
  onTopVerse: (verse: number) => void
  onToggleFav: () => void
}

const HDR_BTN = 'flex h-8 items-center justify-center rounded-lg border border-line px-2 text-[12px] font-semibold text-muted transition hover:border-primary disabled:opacity-40'

const Pane = forwardRef<PaneHandle, Props>(function Pane(
  { index, ver, seq, jump, highlight, isFav, onChangeVer, onStep, onOpenFinder, onTopVerse, onToggleFav },
  ref,
) {
  const [chapter, setChapter] = useState<Chapter | null>(() => getCached(ver, seq) ?? null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>(chapter ? 'ok' : 'loading')
  const boxRef = useRef<HTMLDivElement>(null)
  const ignoreUntil = useRef(0)
  const lastTop = useRef(1)
  const raf = useRef(0)
  const pendingJump = useRef<number | null>(jump.verse)

  // 절 요소 찾기(합절 18-19 는 범위 포함, 없으면 그 이상 가장 가까운 절)
  function verseEl(verse: number): HTMLElement | null {
    const box = boxRef.current
    if (!box) return null
    const els = Array.from(box.querySelectorAll<HTMLElement>('[data-verse]'))
    let best: HTMLElement | null = null
    for (const el of els) {
      const v = Number(el.dataset.verse)
      const end = Number(el.dataset.end ?? v)
      if (verse >= v && verse <= end) return el
      if (v > verse && !best) best = el
    }
    return best ?? els[els.length - 1] ?? null
  }

  function scrollToVerse(verse: number, smooth = false) {
    const box = boxRef.current
    const el = verseEl(verse)
    if (!box || !el) return
    ignoreUntil.current = Date.now() + 250
    lastTop.current = verse
    const top = el.offsetTop - 4
    if (smooth) box.scrollTo({ top, behavior: 'smooth' })
    else box.scrollTop = top
  }

  useImperativeHandle(ref, () => ({ scrollToVerse, topVerse: () => lastTop.current }))

  // 장 로드
  useEffect(() => {
    let alive = true
    pendingJump.current = jump.verse
    const hit = getCached(ver, seq)
    if (hit) {
      setChapter(hit)
      setStatus('ok')
    } else {
      setStatus('loading')
      fetchChapter(ver, seq)
        .then((c) => {
          if (!alive) return
          setChapter(c)
          setStatus('ok')
        })
        .catch(() => alive && setStatus('error'))
    }
    prefetchAround(ver, seq)
    return () => {
      alive = false
    }
    // jump.n: 같은 장 안에서 다른 절로 점프할 때도 pendingJump 를 갱신해야 한다
  }, [ver, seq, jump.n]) // eslint-disable-line react-hooks/exhaustive-deps

  // 로드 완료 후 목표 절로 이동
  useEffect(() => {
    if (status !== 'ok' || !chapter || pendingJump.current == null) return
    const v = pendingJump.current
    pendingJump.current = null
    scrollToVerse(v)
  }, [status, chapter]) // eslint-disable-line react-hooks/exhaustive-deps

  // 스크롤 → 최상단 절 보고(rAF 스로틀)
  function onScroll() {
    if (raf.current) return
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      const box = boxRef.current
      if (!box || Date.now() < ignoreUntil.current) return
      const line = box.scrollTop + 8
      const els = Array.from(box.querySelectorAll<HTMLElement>('[data-verse]'))
      let top: number | null = null
      for (const el of els) {
        const bottom = el.offsetTop + el.offsetHeight
        if (bottom > line) {
          top = Number(el.dataset.verse)
          break
        }
      }
      if (top == null) top = Number(els[els.length - 1]?.dataset.verse ?? 1)
      if (top !== lastTop.current) {
        lastTop.current = top
        onTopVerse(top)
      }
    })
  }

  const { book, chapter: chapNo } = bookOfSeq(seq)
  const fallback = chapter && chapter.served !== ver

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface" aria-label={`패널 ${index === 0 ? 'A' : 'B'}`}>
      {/* 헤더 */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-line px-2 py-1.5">
        <select
          value={ver}
          onChange={(e) => onChangeVer(e.target.value as BibleVersion)}
          aria-label="번역 버전"
          className="h-8 max-w-[96px] rounded-lg border border-line bg-surface px-1.5 text-[12px] font-semibold text-primary"
        >
          {BIBLE_VERSIONS.map((v) => (
            <option key={v} value={v}>
              {BIBLE_VERSION_LABEL[v]}
            </option>
          ))}
        </select>
        <button type="button" onClick={onOpenFinder} className="min-w-0 flex-1 truncate rounded-lg px-2 text-left text-[15px] font-bold text-ink transition hover:bg-surface-subtle">
          {book.name} {chapNo}
        </button>
        <button type="button" onClick={onToggleFav} aria-label={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'} aria-pressed={isFav} className={`${HDR_BTN} w-8 px-0 ${isFav ? 'border-accent text-accent' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3.5l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17.4l-5.4 2.9 1.1-6.1L3.2 9.9l6.1-.8z" />
          </svg>
        </button>
        <button type="button" onClick={() => onStep(-1)} disabled={seq <= 1} aria-label="이전 장" className={`${HDR_BTN} w-8 px-0`}>
          ‹
        </button>
        <button type="button" onClick={() => onStep(1)} disabled={seq >= MAX_SEQ} aria-label="다음 장" className={`${HDR_BTN} w-8 px-0`}>
          ›
        </button>
      </div>

      {/* 본문 */}
      <div ref={boxRef} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-5" style={{ WebkitOverflowScrolling: 'touch' }}>
        {fallback && (
          <p className="mb-2 rounded-xl bg-accent-soft px-3 py-1.5 text-[11px] text-primary">
            {BIBLE_VERSION_LABEL[ver]}은 이 장이 아직 준비 중이라 개역개정으로 표시합니다.
          </p>
        )}
        {status === 'loading' && !chapter && <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>}
        {status === 'error' && <p className="py-8 text-center text-sm text-muted">본문을 불러오지 못했습니다.</p>}
        {chapter && chapter.verses.length === 0 && status === 'ok' && (
          <p className="py-8 text-center text-sm text-muted">본문 데이터가 없습니다(patch105 시딩 필요).</p>
        )}
        {chapter && (
          <div className={`space-y-2 ${status === 'loading' ? 'opacity-50' : ''}`}>
            {chapter.verses.map((v: VerseRow) => (
              <div key={v.verse} data-verse={v.verse} data-end={v.verse_end ?? v.verse}>
                <VerseText label={`${v.verse}${v.verse_end ? `-${v.verse_end}` : ''}`} body={v.body} highlight={highlight} />
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 pb-1">
              <button type="button" onClick={() => onStep(-1)} disabled={seq <= 1} className={HDR_BTN}>
                ‹ 이전 장
              </button>
              <span className="text-[11px] text-faint">{BIBLE_VERSION_LABEL[chapter.served]} · 내부 열람용</span>
              <button type="button" onClick={() => onStep(1)} disabled={seq >= MAX_SEQ} className={HDR_BTN}>
                다음 장 ›
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
})

export default Pane
