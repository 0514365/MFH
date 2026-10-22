// MFH-QT-VIEW-V6 — 2027(4-5): theme-2027 · 남색 글자 · 연회색/블러시 면 · 강조 = 진한 블러시 · 굵기 600 이하 · 영문 대문자 머리글 해제.
// MFH-QT-VIEW-V5
// 본문 읽기 접이식을 bible_texts(/api/bible/passage, 버전 3단) 로 교체 — PassageAccordion V3 props { book, range, label }.
// MFH-QT-VIEW-V4 — Variant 시안 기반 리스킨 + 재배치 순서(본문카드 → 핵심절 → 본문읽기 → 본문설명 → 묵상 → 적용 → 기도 → 버튼 → 푸터).
// 기능 보존: 접이식 2개(client), 성서유니온 외부 링크, 묵상일지 버튼 라우팅, 데이터 바인딩.
// 저작권: 성서유니온 묵상 해설 미저장. 본문은 자체 bible_texts(멤버 내부 열람용)에서 접이식 펼칠 때 로드.
import Link from 'next/link'
import { shortRef } from '@/lib/bibleAbbr'
import PassageAccordion from './PassageAccordion'
import CommentaryAccordion from './CommentaryAccordion'

export type QtPassage = { book?: string | null; book_en?: string | null; range?: string | null; title?: string | null; source_url?: string | null }
export type QtKeyVerse = { ref?: string | null; text?: string | null; summary?: string | null }
export type QtCommentary = { heading?: string | null; body?: string | null }
export type QtApplication = { point?: string | null; basis?: string | null }
export type QtRow = {
  id: string
  qt_date: string
  passage: QtPassage | null
  key_verse: QtKeyVerse | null
  commentary: QtCommentary[] | null
  meditation: string | null
  application: QtApplication[] | null
  prayer_points: string[] | null
  created_at: string
}

// 조회 컬럼(페이지 공유) — 오타·누락 방지.
export const QT_SELECT = 'id,qt_date,passage,key_verse,commentary,meditation,application,prayer_points,created_at'

// 표시할 내용이 있는지(본문 책·범위 존재). 빈 상태 판정 공유(타입 가드).
export function hasQtContent(row: QtRow | null | undefined): row is QtRow {
  if (!row) return false
  const p = row.passage ?? {}
  return !!(p.book ?? '').trim() && !!(p.range ?? '').trim()
}

export default function QtView({ row }: { row: QtRow }) {
  const p = row.passage ?? {}
  const kv = row.key_verse ?? {}
  const commentary = (Array.isArray(row.commentary) ? row.commentary : []).filter(
    (c): c is QtCommentary => !!c && (!!(c.heading ?? '').trim() || !!(c.body ?? '').trim()),
  )
  const apps = (Array.isArray(row.application) ? row.application : []).filter(
    (a): a is QtApplication => !!a && !!(a.point ?? '').trim(),
  )
  const prayers = (Array.isArray(row.prayer_points) ? row.prayer_points : [])
    .map((x) => String(x ?? '').trim())
    .filter(Boolean)
  const book = (p.book ?? '').trim()
  const bookEn = (p.book_en ?? '').trim()
  const range = (p.range ?? '').trim()
  const title = (p.title ?? '').trim()
  const sourceUrl = (p.source_url ?? '').trim()
  const med = (row.meditation ?? '').trim()
  const verseRef = (kv.ref ?? '').trim()
  const verseText = (kv.text ?? '').trim()
  const verseSummary = (kv.summary ?? '').trim()

  // 묵상일지 머릿말 = 본문 축약 + 매일성경 제목 (예 "고전 8:1-13 지식보다 사랑으로").
  const refShort = shortRef(book, range)
  const journalHeadline = [refShort, title].filter(Boolean).join(' ')
  const journalHref = `/journal/new?category=${encodeURIComponent('묵상')}&headline=${encodeURIComponent(journalHeadline)}`

  return (
    <div className="flex flex-col gap-6">
      {/* 날짜 — 우측 성서유니온 외부 링크 */}
      <section className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <div className="font-num text-[12px] font-medium text-b27-muted">오늘의 양식</div>
          <div className="font-num text-[24px] font-semibold leading-none tabular-nums text-b27-ink">{row.qt_date}</div>
        </div>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex shrink-0 items-center gap-0.5 rounded-full bg-b27-card px-3 py-1.5 text-[12.5px] font-medium text-b27-ink transition active:opacity-60"
          >
            성서유니온
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </a>
        )}
      </section>

      {/* 본문 — 매일성경 제목 + 주소 */}
      <section className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 font-num text-[12px] font-medium text-b27-muted"><span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-7" aria-hidden="true" />오늘의 본문</div>
        {title && <h2 className="text-[22px] font-semibold leading-snug text-b27-ink">{title}</h2>}
        <div className="flex flex-wrap items-center gap-x-1.5 font-num text-[13px] text-b27-muted">
          <span>
            {book} {range}
          </span>
          {bookEn && (
            <>
              <span className="text-b27-muted">·</span>
              <span className="font-num text-[12px] font-semibold text-b27-muted">{bookEn}</span>
            </>
          )}
        </div>
      </section>

      {/* 핵심절 — 블러시 면(7) · 명조 본문 */}
      {(verseText || verseRef) && (
        <section className="rounded-2xl bg-b27-tint-7 px-5 py-4">
          <div className="mb-2 flex items-center gap-1.5 font-num text-[12px] font-medium text-[#A91E30]"><span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-7" aria-hidden="true" />핵심절</div>
          <div className="flex flex-col gap-2.5">
            {verseText && <p className="font-serif text-[17px] leading-[1.8] text-b27-ink">{verseText}</p>}
            {verseRef && <div className="font-num text-[12.5px] text-[#A91E30]">{verseRef} (개역개정)</div>}
            {verseSummary && (
              <>
                <div className="my-1 h-px w-full bg-b27-paper" />
                <p className="text-[14.5px] font-medium leading-[1.6] text-b27-muted">{verseSummary}</p>
              </>
            )}
          </div>
        </section>
      )}

      {/* 본문 읽기 (재배치: 핵심절 아래) */}
      <PassageAccordion book={book} range={range} label={refShort} />

      {/* 본문 설명 */}
      {commentary.length > 0 && <CommentaryAccordion items={commentary} />}

      {/* 묵상 */}
      {med && (
        <section className="flex flex-col gap-1.5">
          <h3 className="font-num text-[12px] font-medium text-b27-muted">묵상</h3>
          <p className="whitespace-pre-wrap text-[16px] leading-[1.8] text-b27-ink">{med}</p>
        </section>
      )}

      {/* 우리 사역에의 적용 */}
      {apps.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h3 className="font-num text-[12px] font-medium text-b27-muted">우리 사역에의 적용</h3>
          <div className="flex flex-col gap-3">
            {apps.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="mt-[9px] inline-block h-2 w-2 shrink-0 rounded-[2px] bg-b27-block-7" aria-hidden="true" />
                <div className="flex min-w-0 flex-col gap-1.5">
                <p className="text-[15.5px] font-medium leading-[1.65] text-b27-ink">{(a.point ?? '').trim()}</p>
                {(a.basis ?? '').trim() && (
                  <div className="flex items-center gap-1.5 self-start rounded-full bg-b27-card px-3 py-1 text-[12.5px] text-b27-muted">
                    <span className="text-[#A91E30]">↳</span>
                    <span>근거: {(a.basis ?? '').trim()}</span>
                  </div>
                )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 오늘의 기도 */}
      {prayers.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl bg-b27-tint-7 px-5 py-4">
          <h3 className="flex items-center gap-1.5 font-num text-[12px] font-medium text-[#A91E30]"><span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-7" aria-hidden="true" />오늘의 기도</h3>
          <ul className="flex flex-col gap-3">
            {prayers.map((pr, i) => (
              <li key={i} className="flex items-start gap-3 text-[15.5px] leading-[1.75] text-b27-ink">
                <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#A91E30]" />
                <span>{pr}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 묵상일지 작성 — 분류=묵상 자동, 머릿말=본문축약+제목 자동 */}
      <Link
        href={journalHref}
        className="flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-b27-plus text-[16px] font-medium text-white transition active:scale-[0.98]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
        묵상일지 쓰기
      </Link>

      {/* 출처 푸터 */}
      <footer className="flex justify-center">
        <p className="text-[11px] font-medium tracking-wide text-b27-muted">
          본문 출처 · 성서유니온 「매일성경」 · 생성 {row.created_at.slice(0, 10)}
        </p>
      </footer>
    </div>
  )
}
