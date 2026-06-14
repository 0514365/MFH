// MFH-QT-VIEW-V3
// 일일 QT 1일치 렌더. 날짜 헤더(우측 성서유니온) + 본문(제목·주소) + 접이식 본문읽기 + 핵심절 + 접이식 본문설명 + 묵상 + 적용 + 기도 + 묵상일지 버튼 + 출처.
// 저작권: 성경 본문 전체·성서유니온 묵상 해설은 저장하지 않는다. 본문은 접이식에서 실시간 로드(/api/qt/passage).
//   저장 대상 = 메타(책·장절·제목) + 핵심절(개역개정 짧은 인용) + 자체 본문설명·묵상·적용·기도(신학 가드레일 안에서).
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
    <div className="space-y-6">
      {/* 날짜 헤더 — 우측에 성서유니온 링크 */}
      <header>
        <p className="text-sm font-semibold tracking-wide text-muted">오늘의 양식</p>
        <div className="mt-0.5 flex items-end justify-between gap-3">
          <span className="font-display text-2xl font-bold text-primary">{row.qt_date}</span>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex shrink-0 items-center gap-1 pb-0.5 text-sm font-semibold text-primary transition hover:underline"
            >
              성서유니온
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7" />
                <path d="M7 7h10v10" />
              </svg>
            </a>
          )}
        </div>
      </header>

      {/* 본문 — 매일성경 제목 + 주소 (찬송 표기 없음, 원문 링크는 헤더로 이동) */}
      <section className="rounded-2xl border border-primary/15 bg-primarySoft p-5">
        <p className="text-sm font-bold tracking-wide text-primary">오늘의 본문</p>
        {title && <p className="mt-2 font-display text-2xl font-extrabold leading-tight text-ink">{title}</p>}
        <p className={title ? 'mt-1.5 text-base font-semibold text-primary' : 'mt-2 font-display text-2xl font-extrabold leading-tight text-ink'}>
          {book} {range}
          {bookEn && <span className="font-normal text-muted"> · {bookEn}</span>}
        </p>
      </section>

      {/* 접이식 본문(개역개정) — 제목 영역과 핵심절 사이. 펼칠 때 실시간 로드. */}
      <PassageAccordion date={row.qt_date} refLabel={refShort} />

      {/* 핵심절 — 개역개정 짧은 인용 */}
      {(verseText || verseRef) && (
        <section className="rounded-2xl border-l-4 border-primary bg-surface p-5">
          {verseText && (
            <p className="font-display text-xl font-bold leading-relaxed text-ink">&ldquo;{verseText}&rdquo;</p>
          )}
          {verseRef && <p className="mt-2 text-sm font-semibold text-primary">{verseRef} (개역개정)</p>}
          {verseSummary && <p className="mt-3 text-base leading-relaxed text-muted">{verseSummary}</p>}
        </section>
      )}

      {/* 접이식 본문 설명 — 묵상 위. 내용·맥락·역사(·문화), 신학 가드레일 안에서 자체 작성. */}
      {commentary.length > 0 && <CommentaryAccordion items={commentary} />}

      {/* 묵상 */}
      {med && (
        <section>
          <h2 className="mb-2 font-display text-xl font-bold text-primary">묵상</h2>
          <p className="whitespace-pre-wrap text-[17px] leading-relaxed text-ink">{med}</p>
        </section>
      )}

      {/* 우리 사역에의 적용 — 일지·사역 접목 */}
      {apps.length > 0 && (
        <section>
          <h2 className="mb-2.5 font-display text-xl font-bold text-primary">우리 사역에의 적용</h2>
          <div className="space-y-2.5">
            {apps.map((a, i) => (
              <div key={i} className="rounded-xl border border-line bg-surface p-4">
                <p className="text-[17px] font-bold leading-snug text-ink">{(a.point ?? '').trim()}</p>
                {(a.basis ?? '').trim() && (
                  <p className="mt-2 text-sm leading-relaxed text-muted">↳ {(a.basis ?? '').trim()}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 오늘의 기도 */}
      {prayers.length > 0 && (
        <section className="rounded-2xl border border-primary/15 bg-primarySoft p-5">
          <div className="mb-2.5 flex items-center gap-2">
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M12 21s-7-4.35-9.5-8.5C.5 9 2 5.5 5.5 5.5c2 0 3.5 1.5 4.5 3 1-1.5 2.5-3 4.5-3C18 5.5 19.5 9 21.5 12.5 19 16.65 12 21 12 21z" />
            </svg>
            <p className="text-base font-bold text-primary">오늘의 기도</p>
          </div>
          <ul className="space-y-2">
            {prayers.map((pr, i) => (
              <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-ink">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{pr}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 묵상일지 작성 — 분류=묵상 자동, 머릿말=본문축약+제목 자동 */}
      <Link
        href={journalHref}
        className="flex items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-4 font-display text-sm font-bold uppercase tracking-wide text-white transition active:scale-[0.99]"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
        묵상일지 작성
      </Link>

      {/* 출처 푸터 — 저작권 표기 */}
      <p className="pt-1 text-center text-xs leading-relaxed text-faint">
        본문 출처 · 성서유니온 「매일성경」 · 생성 {row.created_at.slice(0, 10)}
        <br />
        본문 설명·묵상·적용·기도는 우리 일지·사역 기록을 바탕으로 작성되었습니다.
      </p>
    </div>
  )
}
