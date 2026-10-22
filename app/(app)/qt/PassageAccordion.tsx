// MFH-QT-PASSAGE-ACCORDION-V4 — 2027(4-5): theme-2027 · 남색 글자 · 연회색/블러시 면 · 강조 = 진한 블러시 · 굵기 600 이하 · 영문 대문자 머리글 해제.
// MFH-QT-PASSAGE-ACCORDION-V3 (09-25 폰트: VerseText 기본 크기 공유 — 명시 textClassName 제거)
// 본문 소스를 성서유니온 프록시(/api/qt/passage) → bible_texts(/api/bible/passage)로 교체. Manna PassageAccordion V2 이식.
//   버전 3단(개역개정·새한글·ESV, 쿠키 bible_ver 를 통독 /bible/read 와 공유) · 소제목은 절 위 별도 블록(VerseText) ·
//   새한글·ESV 미비 구간은 개역개정 폴백 안내. 펼칠 때만 1회 호출(저장 없음). 접이식 껍데기(원형 caret)는 V2 그대로.
// MFH-QT-PASSAGE-ACCORDION-V2 — 접이식 본문(개역개정, SU 프록시). Variant 시안 비주얼(원형 caret · 절 번호 컬럼).
'use client'
import { useState } from 'react'
import {
  BIBLE_VERSION_COOKIE,
  BIBLE_VERSION_LABEL,
  BIBLE_VERSIONS,
  parseBibleVersion,
  type BibleVersion,
  type VerseRow,
} from '@/lib/bible/texts'
import VerseText from '@/components/VerseText'

type State = { status: 'idle' | 'loading' | 'ok' | 'error' | 'empty'; served: BibleVersion; verses: VerseRow[] }

function cookieVersion(): BibleVersion {
  if (typeof document === 'undefined') return 'nkrv'
  const m = document.cookie.match(/(?:^|;\s*)bible_ver=([^;]+)/)
  return parseBibleVersion(m?.[1])
}

export default function PassageAccordion({ book, range, label }: { book: string; range: string; label: string }) {
  const [open, setOpen] = useState(false)
  const [ver, setVer] = useState<BibleVersion>('nkrv')
  const [state, setState] = useState<State>({ status: 'idle', served: 'nkrv', verses: [] })

  async function load(v: BibleVersion) {
    setState((p) => ({ ...p, status: 'loading' }))
    try {
      const res = await fetch(`/api/bible/passage?book=${encodeURIComponent(book)}&range=${encodeURIComponent(range)}&ver=${v}`)
      if (!res.ok) throw new Error(String(res.status))
      const json = (await res.json()) as { served: BibleVersion; verses: VerseRow[] }
      setState({ status: json.verses.length ? 'ok' : 'empty', served: json.served, verses: json.verses })
    } catch {
      setState((p) => ({ ...p, status: 'error', verses: [] }))
    }
  }

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && state.status === 'idle') {
      const v = cookieVersion() // 첫 펼침 때 쿠키를 읽는다(SSR 과 초기 렌더 일치 유지)
      setVer(v)
      void load(v)
    }
  }
  function switchVer(v: BibleVersion) {
    if (v === ver) return
    setVer(v)
    document.cookie = `${BIBLE_VERSION_COOKIE}=${v}; path=/; max-age=31536000; samesite=lax`
    void load(v)
  }

  let prevChapter = -1
  return (
    <div className="overflow-hidden rounded-2xl bg-b27-card">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left transition active:opacity-70"
      >
        <span className="flex items-center gap-2 text-[14.5px] font-medium text-b27-ink">
          본문 읽기
          {label && (
            <>
              <span className="text-[14px] font-normal text-b27-muted">·</span>
              <span className="font-semibold text-[#A91E30]">{label}</span>
            </>
          )}
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-b27-paper">
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`text-b27-muted transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="border-t-2 border-b27-paper bg-b27-paper px-4 pb-5 pt-4">
          <div className="mb-4 flex max-w-[300px] gap-1.5" role="group" aria-label="성경 버전">
            {BIBLE_VERSIONS.map((v) => {
              const on = v === ver
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={on}
                  disabled={state.status === 'loading'}
                  onClick={() => switchVer(v)}
                  className={`flex-1 rounded-full border px-2 py-1.5 text-[11px] font-semibold transition disabled:opacity-70 ${
                    on ? 'border-b27-ink bg-b27-ink text-on-primary' : 'border-b27-line bg-b27-paper text-b27-muted hover:border-b27-muted'
                  }`}
                >
                  {BIBLE_VERSION_LABEL[v]}
                </button>
              )
            })}
          </div>
          {state.status === 'ok' && state.served !== ver && (
            <p className="mb-3 rounded-xl bg-b27-tint-7 px-3 py-2 text-[12px] text-b27-ink">
              {BIBLE_VERSION_LABEL[ver]}은 이 본문이 아직 준비 중이라 개역개정으로 표시합니다.
            </p>
          )}
          {state.status === 'loading' && <p className="text-sm text-b27-muted">본문을 불러오는 중…</p>}
          {state.status === 'error' && (
            <p className="text-sm text-b27-muted">
              본문을 불러오지 못했습니다.{' '}
              <button type="button" onClick={() => load(ver)} className="font-semibold text-[#A91E30] underline underline-offset-2">
                다시 시도
              </button>
            </p>
          )}
          {state.status === 'empty' && <p className="text-sm text-b27-muted">본문 데이터가 아직 준비되지 않았습니다.</p>}
          {state.status === 'ok' && (
            <>
              <div className="space-y-2">
                {state.verses.map((v) => {
                  const showChapter = v.chapter !== prevChapter
                  prevChapter = v.chapter
                  const num = `${v.verse}${v.verse_end ? `-${v.verse_end}` : ''}`
                  return (
                    <VerseText
                      key={`${v.chapter}:${v.verse}`}
                      label={showChapter ? `${v.chapter}:${num}` : num}
                      body={v.body}
                    />
                  )
                })}
              </div>
              <p className="mt-4 text-center text-[11px] text-b27-muted">{BIBLE_VERSION_LABEL[state.served]} · 내부 열람용</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
