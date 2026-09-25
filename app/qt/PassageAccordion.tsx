// MFH-QT-PASSAGE-ACCORDION-V3
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
    <div className="overflow-hidden rounded-[24px] border border-line bg-surface shadow-soft">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors active:bg-paper"
      >
        <span className="flex items-center gap-2 text-[16px] font-bold tracking-tight text-ink">
          본문 읽기
          {label && (
            <>
              <span className="text-[14px] font-normal text-faint">·</span>
              <span className="font-semibold text-accent">{label}</span>
            </>
          )}
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-surface-subtle bg-paper">
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`text-muted transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="border-t border-line px-6 pb-7 pt-4">
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
                    on ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface text-muted hover:border-primary'
                  }`}
                >
                  {BIBLE_VERSION_LABEL[v]}
                </button>
              )
            })}
          </div>
          {state.status === 'ok' && state.served !== ver && (
            <p className="mb-3 rounded-xl bg-accent-soft px-3 py-2 text-[12px] text-primary">
              {BIBLE_VERSION_LABEL[ver]}은 이 본문이 아직 준비 중이라 개역개정으로 표시합니다.
            </p>
          )}
          {state.status === 'loading' && <p className="text-sm text-muted">본문을 불러오는 중…</p>}
          {state.status === 'error' && (
            <p className="text-sm text-muted">
              본문을 불러오지 못했습니다.{' '}
              <button type="button" onClick={() => load(ver)} className="font-semibold text-accent underline underline-offset-2">
                다시 시도
              </button>
            </p>
          )}
          {state.status === 'empty' && <p className="text-sm text-muted">본문 데이터가 아직 준비되지 않았습니다.</p>}
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
                      textClassName="text-[16.5px] leading-[1.8] text-ink"
                    />
                  )
                })}
              </div>
              <p className="mt-4 text-center text-[11px] text-faint">{BIBLE_VERSION_LABEL[state.served]} · 내부 열람용</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
