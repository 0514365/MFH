// MFH-QT-VIEW-V4
// Variant 시안 기반 리스킨 + 재배치 순서(본문카드 → 핵심절 → 본문읽기 → 본문설명 → 묵상 → 적용 → 기도 → 버튼 → 푸터).
// 기능 보존: 접이식 2개(client; 본문읽기=실시간 /api/qt/passage), 성서유니온 외부 링크, 묵상일지 버튼 라우팅, 데이터 바인딩.
// 저작권: 성경 본문 전체·성서유니온 묵상 해설 미저장. 본문은 접이식에서 실시간 로드.
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
    <div className="flex flex-col gap-9">
      {/* 날짜 — 우측 성서유니온 외부 링크 */}
      <section className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <div className="font-display text-[11px] font-bold uppercase tracking-[0.15em] text-muted">오늘의 양식</div>
          <div className="font-display text-[32px] font-extrabold leading-none tracking-tight text-ink">{row.qt_date}</div>
        </div>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex shrink-0 items-center gap-0.5 pb-1 text-[13px] font-bold text-accent transition active:opacity-60"
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
      <section className="flex flex-col gap-2.5 rounded-[24px] border border-line bg-primary-soft p-6 shadow-soft">
        <div className="font-display text-[11px] font-bold uppercase tracking-[0.15em] text-accent">오늘의 본문</div>
        {title && <h2 className="mt-0.5 text-[24px] font-bold leading-tight tracking-tight text-ink">{title}</h2>}
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[14px] font-medium text-accent">
          <span>
            {book} {range}
          </span>
          {bookEn && (
            <>
              <span className="text-faint">·</span>
              <span className="font-display text-[12px] font-bold text-muted">{bookEn}</span>
            </>
          )}
        </div>
      </section>

      {/* 핵심절 — 좌측 마룬 바 + quote 장식 */}
      {(verseText || verseRef) && (
        <section className="relative overflow-hidden rounded-[24px] border border-line bg-surface py-6 pl-6 pr-5 shadow-soft">
          <div className="absolute bottom-0 left-0 top-0 w-[4px] bg-accent" />
          <svg
            width="44" height="44" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
            className="absolute right-4 top-4 text-primary-soft opacity-60"
          >
            <path d="M10 11H6.5c0-2.5 1.3-3.8 3-4V5C6.4 5.3 4.5 7.7 4.5 11.5V17H10v-6zm9 0h-3.5c0-2.5 1.3-3.8 3-4V5c-3.1.3-5 2.7-5 6.5V17H19v-6z" />
          </svg>
          <div className="relative z-10 flex flex-col gap-3">
            {verseText && (
              <p className="pr-6 text-[17.5px] font-light italic leading-[1.7] tracking-tight text-ink">&ldquo;{verseText}&rdquo;</p>
            )}
            {verseRef && <div className="text-[13px] font-bold tracking-wide text-accent">{verseRef} (개역개정)</div>}
            {verseSummary && (
              <>
                <div className="my-1 h-px w-full bg-surface-subtle" />
                <p className="text-[14.5px] font-medium leading-[1.6] text-muted">{verseSummary}</p>
              </>
            )}
          </div>
        </section>
      )}

      {/* 본문 읽기 (재배치: 핵심절 아래) */}
      <PassageAccordion date={row.qt_date} refLabel={refShort} />

      {/* 본문 설명 */}
      {commentary.length > 0 && <CommentaryAccordion items={commentary} />}

      {/* 묵상 */}
      {med && (
        <section className="flex flex-col gap-3 px-1">
          <div className="flex flex-col gap-1.5">
            <div className="font-display text-[11px] font-bold uppercase tracking-[0.15em] text-accent">Meditation</div>
            <h3 className="text-[20px] font-bold tracking-tight text-ink">묵상</h3>
          </div>
          <p className="whitespace-pre-wrap text-[16.5px] leading-[1.8] text-ink">{med}</p>
        </section>
      )}

      {/* 우리 사역에의 적용 */}
      {apps.length > 0 && (
        <section className="flex flex-col gap-4 px-1">
          <div className="flex flex-col gap-1.5">
            <div className="font-display text-[11px] font-bold uppercase tracking-[0.15em] text-accent">Application</div>
            <h3 className="text-[20px] font-bold tracking-tight text-ink">우리 사역에의 적용</h3>
          </div>
          <div className="mt-1 flex flex-col gap-3.5">
            {apps.map((a, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-[24px] border border-line bg-surface p-5 shadow-soft">
                <p className="text-[16px] font-bold leading-[1.65] text-ink">{(a.point ?? '').trim()}</p>
                {(a.basis ?? '').trim() && (
                  <div className="flex items-center gap-1.5 self-start rounded-full border border-line bg-paper px-3 py-1.5 text-[13.5px] font-medium text-muted">
                    <span className="text-accent">↳</span>
                    <span>근거: {(a.basis ?? '').trim()}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 오늘의 기도 */}
      {prayers.length > 0 && (
        <section className="flex flex-col gap-5 rounded-[24px] border border-line bg-primary-soft p-7 shadow-soft">
          <div className="flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-accent">
              <path d="M12 21s-7-4.35-9.5-8.5C.5 9 2 5.5 5.5 5.5c2 0 3.5 1.5 4.5 3 1-1.5 2.5-3 4.5-3C18 5.5 19.5 9 21.5 12.5 19 16.65 12 21 12 21z" />
            </svg>
            <h3 className="text-[19px] font-bold tracking-tight text-accent">오늘의 기도</h3>
          </div>
          <ul className="flex flex-col gap-4">
            {prayers.map((pr, i) => (
              <li key={i} className="flex items-start gap-3 text-[16px] leading-[1.75] text-ink">
                <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{pr}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 묵상일지 작성 — 분류=묵상 자동, 머릿말=본문축약+제목 자동 */}
      <Link
        href={journalHref}
        className="flex h-[56px] w-full items-center justify-center gap-2 rounded-[24px] bg-accent text-[17px] font-bold text-white shadow-[0_4px_14px_rgba(182,24,33,0.25)] transition-all active:scale-[0.98] active:bg-accent-hover"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
        묵상일지 작성
      </Link>

      {/* 출처 푸터 */}
      <footer className="flex justify-center">
        <p className="text-[11px] font-medium tracking-wide text-faint">
          본문 출처 · 성서유니온 「매일성경」 · 생성 {row.created_at.slice(0, 10)}
        </p>
      </footer>
    </div>
  )
}
