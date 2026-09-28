'use client'

// MFH-BIBLE-STUDY-CLIENT-V1 — /bible/study 본체(LOGOS 식 2패널 리더).
//   패널 A·B(각자 버전) + 연결(🔗) 토글 + 패널 1개/2개 토글 + 찾기 시트(구절·내용·최근·즐겨찾기).
//   배치: 모바일·아이패드 세로 = 위아래, 가로 = 좌우, 데스크탑(lg) = 좌우. 각 패널이 자체 스크롤.
//   연결 ON: 한 패널 스크롤 → 다른 패널 같은 절로(Pane.scrollToVerse). 장 이동·찾기 이동도 두 패널에 같이 적용.
//   상태는 localStorage(storage.ts)에 저장(패널 버전·장·연결·단일). 최근·즐겨찾기도 기기별.
import { useCallback, useEffect, useRef, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import type { BibleVersion } from '@/lib/bible/texts'
import { MAX_SEQ, locLabel, type Loc } from '@/lib/bible/ref'
import Pane, { type PaneHandle } from './Pane'
import FinderSheet, { type FinderTab } from './FinderSheet'
import { loadFav, loadPrefs, pushRecent, savePrefs, toggleFav, type PaneState, type SavedLoc } from './storage'

type Jump = { verse: number; n: number }
type Finder = { open: boolean; tab: FinderTab; target: 0 | 1 }

const TOOL_BTN = 'flex h-9 items-center justify-center gap-1 rounded-xl border border-line px-2.5 text-[12px] font-semibold text-muted transition hover:border-primary'

export default function StudyClient({ initialVer, initialLoc }: { initialVer: BibleVersion; initialLoc: Loc | null }) {
  const [panes, setPanes] = useState<[PaneState, PaneState]>([
    { ver: initialVer, seq: initialLoc?.seq ?? 1000 }, // 기본 요한복음 1장(chap_seq 1000)
    { ver: initialVer === 'esv' ? 'nkrv' : 'esv', seq: initialLoc?.seq ?? 1000 },
  ])
  const [jumps, setJumps] = useState<[Jump, Jump]>([
    { verse: initialLoc?.verse ?? 1, n: 1 },
    { verse: initialLoc?.verse ?? 1, n: 1 },
  ])
  const [linked, setLinked] = useState(true)
  const [single, setSingle] = useState(false)
  const [finder, setFinder] = useState<Finder>({ open: false, tab: 'ref', target: 0 })
  const [highlight, setHighlight] = useState<string[]>([])
  const [favs, setFavs] = useState<SavedLoc[]>([])
  const [hydrated, setHydrated] = useState(false)
  const refs = [useRef<PaneHandle>(null), useRef<PaneHandle>(null)] as const

  // 저장된 상태 복원(URL ?ref 가 있으면 장·절은 URL 우선)
  useEffect(() => {
    const p = loadPrefs()
    if (p) {
      setPanes(initialLoc ? [{ ...p.panes[0], seq: initialLoc.seq }, { ...p.panes[1], seq: initialLoc.seq }] : p.panes)
      setLinked(p.linked)
      setSingle(p.single)
    }
    setFavs(loadFav())
    setHydrated(true)
  }, [initialLoc])

  useEffect(() => {
    if (hydrated) savePrefs({ panes, linked, single })
  }, [panes, linked, single, hydrated])

  const topVerseOf = (i: 0 | 1) => refs[i].current?.topVerse() ?? 1

  // 이동(장+절). target 패널 우선, 연결 ON 이면 두 패널 모두.
  const goTo = useCallback(
    (loc: Loc, target: 0 | 1, opts?: { words?: string[]; recent?: boolean }) => {
      const seq = Math.min(MAX_SEQ, Math.max(1, loc.seq))
      const both = linked
      setPanes((p) => (both ? [{ ...p[0], seq }, { ...p[1], seq }] : (p.map((x, i) => (i === target ? { ...x, seq } : x)) as [PaneState, PaneState])))
      setJumps((j) => (both ? [{ verse: loc.verse, n: j[0].n + 1 }, { verse: loc.verse, n: j[1].n + 1 }] : (j.map((x, i) => (i === target ? { verse: loc.verse, n: x.n + 1 } : x)) as [Jump, Jump])))
      setHighlight(opts?.words ?? [])
      if (opts?.recent !== false) pushRecent({ ...loc, seq, label: locLabel({ seq, verse: loc.verse }, true), t: Date.now() })
    },
    [linked],
  )

  function step(i: 0 | 1, delta: -1 | 1) {
    goTo({ seq: panes[i].seq + delta, verse: 1 }, i, { recent: false })
  }

  function changeVer(i: 0 | 1, ver: BibleVersion) {
    const verse = topVerseOf(i)
    setPanes((p) => p.map((x, k) => (k === i ? { ...x, ver } : x)) as [PaneState, PaneState])
    setJumps((j) => j.map((x, k) => (k === i ? { verse, n: x.n + 1 } : x)) as [Jump, Jump])
  }

  // 연결 스크롤: i 패널 최상단 절 → 다른 패널
  function onTopVerse(i: 0 | 1, verse: number) {
    if (!linked || single) return
    const other = i === 0 ? 1 : 0
    if (panes[other].seq !== panes[i].seq) return
    refs[other].current?.scrollToVerse(verse)
  }

  function onToggleFav(i: 0 | 1) {
    const loc = { seq: panes[i].seq, verse: topVerseOf(i) }
    setFavs(toggleFav({ ...loc, label: locLabel(loc, true), t: Date.now() }).list)
  }
  const isFav = (i: 0 | 1) => favs.some((f) => f.seq === panes[i].seq)

  const openFinder = (target: 0 | 1, tab: FinderTab = 'ref') => setFinder({ open: true, tab, target })

  const linkIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </svg>
  )

  return (
    <main className="app-theme mx-auto flex max-w-md flex-col px-5 min-[740px]:max-w-3xl lg:max-w-6xl" style={{ height: 'calc(100dvh - 76px - env(safe-area-inset-bottom))' }}>
      <PageHeader
        title="Bible"
        action={
          <>
            <button type="button" onClick={() => openFinder(0, 'search')} aria-label="단어 검색" className={`${TOOL_BTN} w-9 px-0`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </button>
            <button type="button" onClick={() => setLinked((v) => !v)} aria-pressed={linked} aria-label="패널 연결" className={`${TOOL_BTN} ${linked ? 'border-primary bg-primary text-on-primary' : ''}`}>
              {linkIcon}
              연결
            </button>
            <button type="button" onClick={() => setSingle((v) => !v)} aria-pressed={!single} aria-label={single ? '패널 2개로' : '패널 1개로'} className={TOOL_BTN}>
              {single ? '2단' : '1단'}
            </button>
          </>
        }
      />

      <div className={`flex min-h-0 flex-1 gap-2 pb-2 ${single ? 'flex-col' : 'portrait:flex-col landscape:flex-row lg:flex-row'}`}>
        {([0, 1] as const).map((i) =>
          single && i === 1 ? null : (
            <Pane
              key={i}
              ref={refs[i]}
              index={i}
              ver={panes[i].ver}
              seq={panes[i].seq}
              jump={jumps[i]}
              highlight={highlight}
              isFav={isFav(i)}
              onChangeVer={(v) => changeVer(i, v)}
              onStep={(d) => step(i, d)}
              onOpenFinder={() => openFinder(i)}
              onTopVerse={(v) => onTopVerse(i, v)}
              onToggleFav={() => onToggleFav(i)}
            />
          ),
        )}
      </div>

      <FinderSheet
        open={finder.open}
        tab={finder.tab}
        ver={panes[finder.target].ver}
        current={{ seq: panes[finder.target].seq, verse: 1 }}
        onTab={(tab) => setFinder((f) => ({ ...f, tab }))}
        onClose={() => setFinder((f) => ({ ...f, open: false }))}
        onGo={(loc, words) => {
          goTo(loc, finder.target, { words })
          setFinder((f) => ({ ...f, open: false }))
        }}
      />
    </main>
  )
}
