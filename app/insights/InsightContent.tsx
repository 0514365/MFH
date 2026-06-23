// MFH-INSIGHT-CONTENT-V3
// 인사이트·비서 본문 표시 포매터 — 기존 raw whitespace-pre-wrap 출력을 대체.
//  · 내용(텍스트)은 바꾸지 않고 "표시만" 정리한다 → 기존 저장분에도 즉시 적용.
//  · 공통: **볼드** → 볼드(기호 제거), 【…부…】 줄 → 볼드 제목.
//  · 줄 전체가 **…** 인 경우 → 소제목(타이틀 스타일: 살짝 큰 글씨·위 여백)으로 본문과 구분.
//  · 비서(project_assist·task_assist) 마무리 줄(**라벨** · 본문) → 흰 박스 + accent 칩으로 한 번 더 강조.
//  · 기도제목 라벨(사역/가정/나라) → '나라'는 '온두라스'로, 순서는 온두라스→사역→가정으로 재정렬.
//    prayer 는 라벨 칩 + 본문 아래 줄, 그 외 도메인은 흰 박스 + accent '기도제목' 칩으로 음영 강조(비서 "이번 주 우선"과 동일 톤). 중복 "기도제목" 제목 줄은 생략.
//  · fruit 는 '6월 9일,' 같은 앞머리 날짜를 볼드로 띄우고 내용은 다음 줄에.
import type { ReactNode } from 'react'
import type { InsightDomain } from '@/lib/insightExport'

// 기도제목 출력 순서(라벨 → 우선순위). '나라'는 표시 단계에서 '온두라스'로 통일한다.
const PRAYER_RANK: Record<string, number> = { 온두라스: 0, 사역: 1, 가정: 2 }

// 기도제목 라벨별 색 뱃지(온두라스/사역/가정). Tailwind 기본 팔레트라 테마 무관.
const PRAYER_BADGE: Record<string, string> = {
  온두라스: 'bg-sky-100 text-sky-700',
  사역: 'bg-amber-100 text-amber-700',
  가정: 'bg-rose-100 text-rose-700',
}

type PrayerItem = { label: string; body: string }

// 기도제목 라벨 줄("사역 · …" 또는 "- 가정 · …") → {label, body}. 라벨 직후 '·'/':' 구분자 필수(오탐 방지).
function matchPrayer(line: string): PrayerItem | null {
  const m = line.match(/^\s*-?\s*(온두라스|나라|사역|가정)\s*[·:]\s*(.+)$/)
  if (!m) return null
  return { label: m[1] === '나라' ? '온두라스' : m[1], body: m[2].trim() }
}

// fruit 날짜 줄("- 6월 9일, …") → {date, body}.
function matchFruitDate(line: string): { date: string; body: string } | null {
  const m = line.match(/^\s*-\s*(\d{1,2}\s*월\s*\d{1,2}\s*일)\s*[,，]?\s*(.+)$/)
  if (!m) return null
  return { date: m[1].replace(/\s+/g, ''), body: m[2].trim() }
}

// 인라인 **볼드** → <strong>(기호 제거). 그 외 텍스트는 그대로.
function renderInline(text: string, keyBase: number): ReactNode {
  const parts = text.split(/(\*\*.+?\*\*)/g)
  return parts.map((p, i) =>
    /^\*\*.+\*\*$/.test(p) ? (
      <strong key={`${keyBase}-${i}`} className="font-semibold text-ink">
        {p.slice(2, -2)}
      </strong>
    ) : (
      p
    ),
  )
}

export default function InsightContent({
  domain,
  content,
  className,
}: {
  domain: InsightDomain
  content: string | null
  className?: string
}) {
  const lines = (content ?? '').replace(/\r\n/g, '\n').split('\n')
  const isAssist = domain === 'project_assist' || domain === 'task_assist'
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    // 1) 기도제목 라벨 묶음(연속 줄) — 재라벨·재정렬 후 도메인별 표시
    if (matchPrayer(line)) {
      const group: PrayerItem[] = []
      while (i < lines.length) {
        const pm = matchPrayer(lines[i])
        if (!pm) break
        group.push(pm)
        i++
      }
      const ordered = [...group].sort(
        (a, b) => (PRAYER_RANK[a.label] ?? 9) - (PRAYER_RANK[b.label] ?? 9),
      )
      if (domain === 'prayer') {
        blocks.push(
          <div key={key++} className="space-y-3">
            {ordered.map((it, j) => (
              <div key={j}>
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRAYER_BADGE[it.label] ?? 'bg-surface-subtle text-muted'}`}>
                  {it.label}
                </span>
                <p className="mt-1">{renderInline(it.body, key * 100 + j)}</p>
              </div>
            ))}
          </div>,
        )
      } else {
        // 비서 "이번 주 우선"과 동일 톤: 흰 박스 + accent 칩으로 기도제목을 음영 강조
        blocks.push(
          <div key={key++} className="mt-3 rounded-xl bg-white px-3.5 py-3">
            <span className="inline-block rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-on-accent">
              기도제목
            </span>
            <ul className="mt-2 space-y-1.5">
              {ordered.map((it, j) => (
                <li key={j}>
                  <strong className="font-semibold text-ink">{it.label}</strong>
                  <span className="text-faint"> · </span>
                  {renderInline(it.body, key * 100 + j)}
                </li>
              ))}
            </ul>
          </div>,
        )
      }
      continue
    }

    // 2) fruit 날짜 묶음(연속 줄) — 날짜 볼드 + 내용 다음 줄
    if (domain === 'fruit' && matchFruitDate(line)) {
      const group: { date: string; body: string }[] = []
      while (i < lines.length) {
        const fm = matchFruitDate(lines[i])
        if (!fm) break
        group.push(fm)
        i++
      }
      blocks.push(
        <div key={key++} className="space-y-3">
          {group.map((it, j) => (
            <div key={j}>
              <strong className="font-semibold text-ink">{it.date}</strong>
              <p className="mt-0.5">{renderInline(it.body, key * 100 + j)}</p>
            </div>
          ))}
        </div>,
      )
      continue
    }

    const trimmed = line.trim()

    // 3) 빈 줄 → 문단 간격
    if (!trimmed) {
      blocks.push(<div key={key++} className="h-3" />)
      i++
      continue
    }

    // 4a) "기도제목" 제목 줄 → 비-prayer 도메인은 아래 기도제목 박스의 칩이 대신 표시 → 제목 줄 생략
    if (/^기도제목:?$/.test(trimmed)) {
      if (domain !== 'prayer') {
        let j = i + 1
        while (j < lines.length && !lines[j].trim()) j++
        if (j < lines.length && matchPrayer(lines[j])) {
          i = j
          continue
        }
      }
      blocks.push(
        <p key={key++} className="font-semibold text-ink">
          {trimmed}
        </p>,
      )
      i++
      continue
    }

    // 4b) 【…부…】(부제가 뒤따라도) 제목 줄 → 볼드
    if (/^【[^】]*】/.test(trimmed)) {
      blocks.push(
        <p key={key++} className="font-semibold text-ink">
          {trimmed}
        </p>,
      )
      i++
      continue
    }

    // 5) (비서) 마무리 강조 줄: **라벨** · 본문 → 흰 박스 + accent 칩으로 한 번 더 강조
    const assistPick = isAssist ? trimmed.match(/^\*\*(.+?)\*\*\s*[·:]\s*(.+)$/) : null
    if (assistPick) {
      blocks.push(
        <div key={key++} className="mt-3 rounded-xl bg-white px-3.5 py-3">
          <span className="inline-block rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-on-accent">
            {assistPick[1]}
          </span>
          <p className="mt-1.5 text-ink">{renderInline(assistPick[2], key * 100)}</p>
        </div>,
      )
      i++
      continue
    }

    // 6) 소제목(줄 전체가 **…**) → 타이틀 스타일로 본문과 구분
    if (/^\*\*.+\*\*$/.test(trimmed)) {
      blocks.push(
        <p key={key++} className="mt-3.5 text-[15px] font-bold leading-snug text-ink first:mt-0">
          {trimmed.slice(2, -2)}
        </p>,
      )
      i++
      continue
    }

    // 6b) Letter 발행호수(MFH #YYMM) → 크게 볼드
    if (domain === 'letter' && /^MFH\s*#/.test(trimmed)) {
      blocks.push(
        <p key={key++} className="text-[19px] font-bold tracking-tight text-ink">
          {trimmed}
        </p>,
      )
      i++
      continue
    }

    // 7) 일반 줄(인라인 **볼드** 처리)
    blocks.push(<p key={key++}>{renderInline(line, key)}</p>)
    i++
  }

  return <div className={className}>{blocks}</div>
}
