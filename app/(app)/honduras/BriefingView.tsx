// MFH-HONDURAS-BRIEFING-VIEW-V4 — 2027(4-6): theme-2027 · 남색 글자 · 연회색/페리윙클 면 · 강조 = 진한 페리윙클 · 굵기 600 이하 · 영문 대문자 머리글 해제.
// MFH-HONDURAS-BRIEFING-VIEW-V3
// 온두라스 동향 1일치 본문 렌더(날짜 헤더 + 하이라이트 + 4섹션 + 선교 인사이트·기도 포인트 + 푸터).
// V3: 항목별 발행일(published_at) 배지 + 하이라이트 빈 상태(최신 페이지) 안내 + 안전(safety) tag 수용.
// /honduras(최신)·/honduras/[id](지난)가 공유한다. 서버 컴포넌트(표시 전용).
// ⚠ 내부 동향 파악용 — 정당·인물 실명 그대로. 외부 발신물(편지·FB)엔 정치중립 규칙을 따로 적용.
// 폰트: 모바일 가독성 우선 — 본문 16px(text-base) 기준, 제목·헤더는 한 단계씩 위.
// dateSuffix: 같은 날 여러 동향이면 " (N)" 넘버링. headerAction: 날짜 행 우측 끝 링크(지난 동향 등).
import type { ReactNode } from 'react'

export type SectionItem = { title?: string | null; body?: string | null; source?: string | null; url?: string | null; published_at?: string | null }
export type Sections = {
  politics?: SectionItem[]
  economy?: SectionItem[]
  society?: SectionItem[]
  culture?: SectionItem[]
}
export type Highlight = { tag?: string | null; title?: string | null; body?: string | null; source?: string | null; url?: string | null; published_at?: string | null }
export type NewsRow = {
  id: string
  news_date: string
  sections: Sections | null
  highlights: Highlight[] | null
  insight: string | null
  prayer_points: string[] | null
  created_at: string
}

// 조회 컬럼(세 페이지 공유) — 오타·누락 방지. id 포함(상세 라우팅·넘버링).
export const NEWS_SELECT = 'id,news_date,sections,highlights,insight,prayer_points,created_at'

// 분야 메타 — 라벨 + 은은한 구분색(채도 낮은 차분 톤).
// 2027: 분야색 = 브랜드 블록 번호(정치 8 페리윙클 · 경제 4 민트 · 사회 1 라군 · 문화 3 살구). dot = 블록색(타이틀 알약 사각형).
export const SECTION_META: { key: keyof Sections; label: string; dot: string; n: number }[] = [
  { key: 'politics', label: '정치', dot: '#B3B9E2', n: 8 },
  { key: 'economy', label: '경제', dot: '#C6EBE1', n: 4 },
  { key: 'society', label: '사회', dot: '#8ED0CE', n: 1 },
  { key: 'culture', label: '문화', dot: '#FCD79B', n: 3 },
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

// URL 에서 보기 좋은 도메인만(www. 제거). 파싱 실패 시 원문 반환.
function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}

// 발행일(published_at, YYYY-MM-DD)을 기준일(브리핑 news_date) 대비 상대 표기로. 형식이 아니면 빈 문자열.
// "오늘 / 어제 / N일 전(13일까지) / M/D" — 오래된 소식이 최신처럼 보이는 혼동을 막는 최신성 라벨.
function relDay(publishedAt?: string | null, baseDate?: string): string {
  const p = (publishedAt ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p)) return ''
  const fmtMd = () => {
    const [, m, d] = p.split('-')
    return `${Number(m)}/${Number(d)}`
  }
  const pd = Date.parse(`${p}T12:00:00Z`)
  const bd = baseDate ? Date.parse(`${baseDate}T12:00:00Z`) : NaN
  if (Number.isNaN(pd) || Number.isNaN(bd)) return fmtMd()
  const diff = Math.round((bd - pd) / 86400000)
  if (diff <= 0) return '오늘'
  if (diff === 1) return '어제'
  if (diff <= 13) return `${diff}일 전`
  return fmtMd()
}

// 발행일 배지 — 차분한 회색 작은 글씨(라벨 절제). 값이 없거나 형식이 아니면 렌더하지 않음.
function DateBadge({ publishedAt, baseDate }: { publishedAt?: string | null; baseDate?: string }) {
  const label = relDay(publishedAt, baseDate)
  if (!label) return null
  return <span className="mt-0.5 shrink-0 text-xs font-medium text-b27-muted">{label}</span>
}

// 출처 줄 — url(기사 링크)이 있거나 source 자체가 http 면 새 탭 링크, 아니면 텍스트.
// 라벨: 사람이 읽는 매체명이면 그대로, URL 뿐이면 도메인으로 축약.
function SourceLine({
  source,
  url,
  className = 'mt-2',
}: {
  source?: string | null
  url?: string | null
  className?: string
}) {
  const s = (source ?? '').trim()
  const u = (url ?? '').trim()
  const href = u || (s.startsWith('http') ? s : '')
  if (!s && !href) return null
  const label = s && !s.startsWith('http') ? s : href ? hostOf(href) : s
  if (href) {
    return (
      <p className={`${className} text-xs`}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-b27-muted underline decoration-b27-line underline-offset-2 transition-colors hover:text-b27-expense"
        >
          출처 · {label} ↗
        </a>
      </p>
    )
  }
  return <p className={`${className} text-xs text-b27-muted`}>출처 · {s}</p>
}

function ItemRow({ item, divided, baseDate }: { item: SectionItem; divided: boolean; baseDate?: string }) {
  const title = (item.title ?? '').trim()
  const body = (item.body ?? '').trim()
  if (!title && !body) return null
  // 분야 박스 안의 기사 row — 첫 기사 외에는 상단 가는 중간선(#ececec)으로만 구분(개별 카드 → 통합 리스트).
  return (
    <div className={`px-1 py-3.5${divided ? ' border-t border-b27-line' : ''}`}>
      {title && (
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[16px] font-semibold leading-snug text-b27-ink">{title}</p>
          <DateBadge publishedAt={item.published_at} baseDate={baseDate} />
        </div>
      )}
      {body && <p className="mt-1.5 whitespace-pre-wrap text-[14.5px] leading-relaxed text-[#4A5072]">{body}</p>}
      <SourceLine source={item.source} url={item.url} />
    </div>
  )
}

export default function BriefingView({
  row,
  latest = false,
  dateSuffix = '',
  headerAction,
}: {
  row: NewsRow
  latest?: boolean
  dateSuffix?: string
  headerAction?: ReactNode
}) {
  const sections = row.sections ?? {}
  const highlights = (Array.isArray(row.highlights) ? row.highlights : []).filter(
    (h): h is Highlight => !!h && (!!(h.title ?? '').trim() || !!(h.body ?? '').trim()),
  )
  const prayerPoints = (Array.isArray(row.prayer_points) ? row.prayer_points : [])
    .map((p) => String(p ?? '').trim())
    .filter(Boolean)

  return (
    <div className="space-y-6">
      {/* 날짜 헤더 — 우측 끝에 headerAction(지난 동향 보기 등) */}
      <header>
        <p className="font-num text-[12px] font-medium text-b27-muted">{latest ? '오늘의 온두라스' : '지난 동향'}</p>
        <div className="mt-0.5 flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="font-num text-2xl font-semibold text-b27-ink">
              {row.news_date}
              {dateSuffix}
            </span>
            <span className="text-xs text-b27-muted">정치·경제·사회·문화</span>
          </div>
          {headerAction && <div className="shrink-0 pb-0.5">{headerAction}</div>}
        </div>
      </header>

      {/* 하이라이트 — San Pedro Sula·한인·안전. 새 소식 있을 때만 글로우 카드. 없으면(최신 페이지) 빈 상태 안내로 "오래된 글 억지 채움"을 방지. */}
      {highlights.length > 0 ? (
        <section className="rounded-2xl bg-b27-tint-8 px-4 py-3.5">
          <p className="mb-2 flex items-center gap-1.5 font-num text-[12px] font-medium" style={{ color: 'var(--b27-deep-8)' }}>
            <span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-8" aria-hidden="true" />
            주목 · San Pedro Sula · 한인 · 안전
          </p>
          <div className="space-y-3">
            {highlights.map((h, i) => (
              <div key={i}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-b27-paper px-2 py-0.5 text-xs font-medium" style={{ color: 'var(--b27-deep-8)' }}>
                      {(h.tag ?? '').trim() || '주목'}
                    </span>
                    {(h.title ?? '').trim() && (
                      <span className="text-[16px] font-semibold leading-snug text-b27-ink">{h.title!.trim()}</span>
                    )}
                  </div>
                  <DateBadge publishedAt={h.published_at} baseDate={row.news_date} />
                </div>
                {(h.body ?? '').trim() && (
                  <p className="mt-1.5 whitespace-pre-wrap text-[14.5px] leading-relaxed text-[#4A5072]">{h.body!.trim()}</p>
                )}
                <SourceLine source={h.source} url={h.url} className="mt-1.5" />
              </div>
            ))}
          </div>
        </section>
      ) : latest ? (
        <p className="rounded-2xl bg-b27-card px-4 py-3 text-center text-sm text-b27-muted">
          최근 San Pedro Sula · 한인 · 안전 관련 새 소식이 없습니다 ·{' '}
          <a
            href="/honduras/archive"
            className="underline decoration-b27-line underline-offset-2 transition-colors hover:text-b27-expense"
          >
            지난 동향 보기
          </a>
        </p>
      ) : null}

      {/* 4분야 섹션 — 정치·경제·사회·문화는 "당일 필수". 빈 분야도 숨기지 않고 "특이사항 없음"으로 표시(누락 vs 무소식 구분). */}
      {SECTION_META.map((m) => {
        const items = (sections[m.key] ?? []).filter((it) => (it?.title ?? '').trim() || (it?.body ?? '').trim())
        return (
          <section key={m.key}>
            <h2
              className="mb-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold"
              style={{ background: `var(--b27-tint-${m.n})`, color: `var(--b27-deep-${m.n})` }}
            >
              <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: m.dot }} aria-hidden="true" />
              {m.label}
              {items.length > 0 && <span className="font-num font-medium text-b27-muted">{items.length}</span>}
            </h2>
            {items.length > 0 ? (
              /* 분야 기사 목록 — 행 사이 1px 선 */
              <div>
                {items.map((it, i) => (
                  <ItemRow key={i} item={it} divided={i > 0} baseDate={row.news_date} />
                ))}
              </div>
            ) : (
              <div className="px-1 py-2 text-sm text-b27-muted">
                특이사항 없음
              </div>
            )}
          </section>
        )
      })}

      {/* 선교 인사이트 + 기도 포인트(별도 박스) — 주목과 어울리는 마룬 글로우 추가. 좌측 레일 4px·연회색 면은 결론부 정체성으로 유지. */}
      {((row.insight ?? '').trim() || prayerPoints.length > 0) && (
        <section className="rounded-2xl bg-b27-tint-7 px-4 py-4">
          <p className="mb-2 flex items-center gap-1.5 font-num text-[12px] font-medium text-[#A91E30]">
            <span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-7" aria-hidden="true" />
            선교 인사이트
          </p>
          {(row.insight ?? '').trim() && (
            <p className="whitespace-pre-wrap text-[15.5px] leading-relaxed text-b27-ink">{row.insight!.trim()}</p>
          )}
          {prayerPoints.length > 0 && (
            <div className="mt-3 rounded-xl bg-b27-paper p-4">
              <p className="mb-2 font-num text-[12px] font-medium text-[#A91E30]">기도 포인트</p>
              <ul className="space-y-2">
                {prayerPoints.map((p, i) => (
                  <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-b27-ink">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A91E30]" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* 안내 푸터 */}
      <p className="pt-1 text-center text-xs leading-relaxed text-b27-muted">
        생성 {row.created_at.slice(0, 10)} · 내부 동향 파악용
        <br />
        편지·Facebook 등 외부 발신에는 정치중립 규칙을 따로 적용합니다.
      </p>
    </div>
  )
}
