// MFH-HONDURAS-BRIEFING-VIEW-V1
// 온두라스 동향 1일치 본문 렌더(날짜 헤더 + 하이라이트 + 4섹션 + 선교 인사이트·기도 포인트 + 푸터).
// /honduras(최신)·/honduras/[date](지난)가 공유한다. 서버 컴포넌트(표시 전용).
// ⚠ 내부 동향 파악용 — 정당·인물 실명 그대로. 외부 발신물(편지·FB)엔 정치중립 규칙을 따로 적용.
// 폰트: 모바일 가독성 우선 — 본문 16px(text-base) 기준, 제목·헤더는 한 단계씩 위.

export type SectionItem = { title?: string | null; body?: string | null; source?: string | null }
export type Sections = {
  politics?: SectionItem[]
  economy?: SectionItem[]
  society?: SectionItem[]
  culture?: SectionItem[]
}
export type Highlight = { tag?: string | null; title?: string | null; body?: string | null; source?: string | null }
export type NewsRow = {
  news_date: string
  sections: Sections | null
  highlights: Highlight[] | null
  insight: string | null
  prayer_points: string[] | null
  created_at: string
}

// 조회 컬럼(세 페이지 공유) — 오타·누락 방지.
export const NEWS_SELECT = 'news_date,sections,highlights,insight,prayer_points,created_at'

// 분야 메타 — 라벨 + 은은한 구분색(채도 낮은 차분 톤).
export const SECTION_META: { key: keyof Sections; label: string; dot: string }[] = [
  { key: 'politics', label: '정치', dot: '#80807F' },
  { key: 'economy', label: '경제', dot: '#5B7B6F' },
  { key: 'society', label: '사회', dot: '#6B7B91' },
  { key: 'culture', label: '문화', dot: '#9A6A55' },
]

// 표시할 내용이 있는지(섹션 1건+ 또는 하이라이트 1건+). 빈 상태 판정 공유(타입 가드).
export function hasBriefingContent(row: NewsRow | null | undefined): row is NewsRow {
  if (!row) return false
  const s = row.sections ?? {}
  const hasSection = SECTION_META.some((m) => (s[m.key]?.length ?? 0) > 0)
  const hasHighlight =
    Array.isArray(row.highlights) &&
    row.highlights.some((h) => !!(h?.title ?? '').trim() || !!(h?.body ?? '').trim())
  return hasSection || hasHighlight
}

function ItemBlock({ item }: { item: SectionItem }) {
  const title = (item.title ?? '').trim()
  const body = (item.body ?? '').trim()
  const source = (item.source ?? '').trim()
  if (!title && !body) return null
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      {title && <p className="text-[17px] font-bold leading-snug text-ink">{title}</p>}
      {body && <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-muted">{body}</p>}
      {source && <p className="mt-2 text-xs text-faint">출처 · {source}</p>}
    </div>
  )
}

export default function BriefingView({ row, latest = false }: { row: NewsRow; latest?: boolean }) {
  const sections = row.sections ?? {}
  const highlights = (Array.isArray(row.highlights) ? row.highlights : []).filter(
    (h): h is Highlight => !!h && (!!(h.title ?? '').trim() || !!(h.body ?? '').trim()),
  )
  const prayerPoints = (Array.isArray(row.prayer_points) ? row.prayer_points : [])
    .map((p) => String(p ?? '').trim())
    .filter(Boolean)

  return (
    <div className="space-y-6">
      {/* 날짜 헤더 */}
      <header>
        <p className="text-sm font-semibold tracking-wide text-muted">{latest ? '오늘의 온두라스' : '지난 동향'}</p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold text-primary">{row.news_date}</span>
          <span className="text-xs text-faint">정치·경제·사회·문화</span>
        </div>
      </header>

      {/* 하이라이트 — San Pedro Sula·한인 강조(부드러운 마룬 톤) */}
      {highlights.length > 0 && (
        <section className="rounded-2xl border border-primary/15 bg-primarySoft p-4">
          <p className="mb-2 text-sm font-bold tracking-wide text-primary">주목 · San Pedro Sula / 한인</p>
          <div className="space-y-3">
            {highlights.map((h, i) => (
              <div key={i}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
                    {(h.tag ?? '').trim() || '주목'}
                  </span>
                  {(h.title ?? '').trim() && (
                    <span className="text-[17px] font-bold leading-snug text-ink">{h.title!.trim()}</span>
                  )}
                </div>
                {(h.body ?? '').trim() && (
                  <p className="mt-1.5 whitespace-pre-wrap text-base leading-relaxed text-muted">{h.body!.trim()}</p>
                )}
                {(h.source ?? '').trim() && <p className="mt-1.5 text-xs text-faint">출처 · {h.source!.trim()}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4분야 섹션 */}
      {SECTION_META.map((m) => {
        const items = (sections[m.key] ?? []).filter((it) => (it?.title ?? '').trim() || (it?.body ?? '').trim())
        if (!items.length) return null
        return (
          <section key={m.key}>
            <div className="mb-2.5 flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: m.dot }} />
              <h2 className="font-display text-xl font-bold text-primary">{m.label}</h2>
              <span className="text-xs text-faint">{items.length}건</span>
            </div>
            <div className="space-y-2.5">
              {items.map((it, i) => (
                <ItemBlock key={i} item={it} />
              ))}
            </div>
          </section>
        )
      })}

      {/* 선교 인사이트 + 기도 포인트(별도 박스) */}
      {((row.insight ?? '').trim() || prayerPoints.length > 0) && (
        <section className="rounded-2xl border-l-4 border-primary bg-primarySoft p-5">
          <p className="mb-3 font-display text-2xl font-extrabold tracking-tight text-primary">선교 인사이트</p>
          {(row.insight ?? '').trim() && (
            <p className="whitespace-pre-wrap text-[17px] leading-relaxed text-ink">{row.insight!.trim()}</p>
          )}
          {prayerPoints.length > 0 && (
            <div className="mt-4 rounded-xl border border-primary/15 bg-surface p-4">
              <div className="mb-2.5 flex items-center gap-2">
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M12 21s-7-4.35-9.5-8.5C.5 9 2 5.5 5.5 5.5c2 0 3.5 1.5 4.5 3 1-1.5 2.5-3 4.5-3C18 5.5 19.5 9 21.5 12.5 19 16.65 12 21 12 21z" />
                </svg>
                <p className="text-base font-bold text-primary">기도 포인트</p>
              </div>
              <ul className="space-y-2">
                {prayerPoints.map((p, i) => (
                  <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-ink">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* 안내 푸터 */}
      <p className="pt-1 text-center text-xs leading-relaxed text-faint">
        생성 {row.created_at.slice(0, 10)} · 내부 동향 파악용
        <br />
        편지·Facebook 등 외부 발신에는 정치중립 규칙을 따로 적용합니다.
      </p>
    </div>
  )
}
