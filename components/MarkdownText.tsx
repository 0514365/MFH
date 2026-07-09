// MFH-MARKDOWN-TEXT-V1
// 일지(Log) 본문용 Day One 스타일 마크다운 경량 렌더러 — 외부 의존성 없음(InsightContent 와 동일 접근).
//  · 내용(저장 텍스트)은 바꾸지 않고 "표시만" 변환 → 기존 저장분에도 즉시 적용, 검색·편집은 원문 그대로.
//  · 지원: #~###### 헤더 / **볼드** __볼드__ / *이탤릭* _이탤릭_ / `코드` / ```코드블록``` / 탭 프리포맷
//         [텍스트](url) 링크 / URL 자동링크 / ![alt](url) 이미지 / 번호·불릿(-,*,•) 목록 / > 인용 / 표 / --- *** 구분선
//  · 일반 줄은 줄바꿈 보존(기존 whitespace-pre-wrap 체감 유지), 빈 줄 = 문단 간격.
//  · stripMarkdown: 목록 카드 발췌(line-clamp)용 — 마크다운 기호를 제거한 순수 텍스트.
import type { ReactNode } from 'react'

// ───── 인라인 ─────
// 그룹: 1,2 코드 / 3,4 이미지 / 5,6 링크 / 7,8 볼드 / 9,10 이탤릭 / 11 자동링크
const INLINE_SRC = [
  '(`+)([^`]+?)\\1',
  '!\\[([^\\]]*)\\]\\(([^)\\s]+)\\)',
  '\\[([^\\]]+)\\]\\(([^)\\s]+)\\)',
  '(\\*\\*|__)([^\\s](?:.*?[^\\s])?)\\7',
  // 이탤릭 — snake_case 오탐 방지: 여는/닫는 기호가 단어(영문·숫자·한글) 중간이면 매칭 안 함.
  '(?<![\\w가-힣])([*_])([^*_\\s](?:[^*_\\n]*[^*_\\s])?)\\9(?![\\w가-힣])',
  '(https?:\\/\\/[^\\s<>"\\]]+)',
].join('|')

function renderInline(text: string, keyBase: string, depth = 0): ReactNode[] {
  if (depth > 3) return [text]
  const nodes: ReactNode[] = []
  let last = 0
  let n = 0
  // g 플래그 정규식은 lastIndex 상태를 가지므로 재귀 안전하게 호출마다 새 인스턴스.
  const re = new RegExp(INLINE_SRC, 'g')
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    const k = `${keyBase}-${n++}`
    if (m[2] !== undefined) {
      nodes.push(
        <code key={k} className="rounded bg-surface-subtle px-1 py-0.5 font-mono text-[0.88em] text-primary">
          {m[2]}
        </code>,
      )
    } else if (m[4] !== undefined) {
      // eslint-disable-next-line @next/next/no-img-element
      nodes.push(<img key={k} src={m[4]} alt={m[3] ?? ''} loading="lazy" className="my-1.5 max-w-full rounded-xl" />)
    } else if (m[6] !== undefined) {
      nodes.push(
        <a key={k} href={m[6]} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-primary underline underline-offset-2">
          {renderInline(m[5], k, depth + 1)}
        </a>,
      )
    } else if (m[8] !== undefined) {
      nodes.push(
        <strong key={k} className="font-semibold text-ink">
          {renderInline(m[8], k, depth + 1)}
        </strong>,
      )
    } else if (m[10] !== undefined) {
      nodes.push(<em key={k}>{renderInline(m[10], k, depth + 1)}</em>)
    } else if (m[11] !== undefined) {
      nodes.push(
        <a key={k} href={m[11]} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-primary underline underline-offset-2">
          {m[11]}
        </a>,
      )
    }
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

// ───── 블록 판별 ─────
// 닫는 # 허용(`# 제목 #`) — 표준 ATX 헤더처럼 끝의 #… 은 표시에서 제거.
const RE_HEADER = /^(#{1,6})\s+(.+?)\s*#*\s*$/
const RE_HR = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/
const RE_QUOTE = /^\s*>\s?(.*)$/
const RE_OL = /^\s*(\d+)[.)]\s+(.+)$/
const RE_UL = /^\s*[-*•]\s+(.+)$/
const RE_FENCE = /^\s*```/
const RE_PRE = /^(\t| {4})(.*)$/
// 표 구분선(| --- | --- |) — 헤더 다음 줄이 이 패턴이면 표로 인식.
const RE_TABLE_SEP = /^\s*\|?\s*:?-{2,}[-\s|:]*$/

function splitTableRow(line: string): string[] {
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())
}

// 헤더 레벨별 스타일(본문 15px 기준 상대 크기).
//  · 3·4 는 동일 크기, 색만 검정/빨강(accent)으로 구분(DayOne 2·3 방식).
//  · 5 는 볼드 아님 + 자간 벌림, 6 은 알약 글상자(DayOne 5·6 방식).
const HEADER_CLASS: Record<number, string> = {
  1: 'mt-4 text-[1.35em] font-bold leading-snug text-ink first:mt-0',
  2: 'mt-4 text-[1.2em] font-bold leading-snug text-ink first:mt-0',
  3: 'mt-3 text-[1.1em] font-bold leading-snug text-ink first:mt-0',
  4: 'mt-3 text-[1.1em] font-bold leading-snug text-accent first:mt-0',
  5: 'mt-2 text-[1em] font-normal uppercase leading-snug tracking-[0.14em] text-ink first:mt-0',
  6: 'mt-2 inline-block rounded-full bg-surface-subtle px-3 py-1 text-[0.85em] font-medium uppercase leading-snug tracking-[0.08em] text-muted first:mt-0',
}

export default function MarkdownText({ text, className }: { text: string | null; className?: string }) {
  const lines = (text ?? '').replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    // 1) ``` 코드블록
    if (RE_FENCE.test(line)) {
      const buf: string[] = []
      i++
      while (i < lines.length && !RE_FENCE.test(lines[i])) buf.push(lines[i++])
      if (i < lines.length) i++ // 닫는 ```
      blocks.push(
        <pre key={key++} className="my-2 overflow-x-auto rounded-xl bg-surface-subtle px-3.5 py-3 font-mono text-[0.85em] leading-relaxed text-ink">
          {buf.join('\n')}
        </pre>,
      )
      continue
    }

    // 2) 탭(또는 4칸) 들여쓰기 프리포맷
    if (RE_PRE.test(line) && line.trim()) {
      const buf: string[] = []
      while (i < lines.length && RE_PRE.test(lines[i]) && lines[i].trim()) {
        buf.push(lines[i].replace(RE_PRE, '$2'))
        i++
      }
      blocks.push(
        <pre key={key++} className="my-2 overflow-x-auto rounded-xl bg-surface-subtle px-3.5 py-3 font-mono text-[0.85em] leading-relaxed text-ink">
          {buf.join('\n')}
        </pre>,
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

    // 4) 구분선
    if (RE_HR.test(trimmed)) {
      blocks.push(<hr key={key++} className="my-4 border-line" />)
      i++
      continue
    }

    // 5) 헤더
    const h = trimmed.match(RE_HEADER)
    if (h) {
      const level = h[1].length
      blocks.push(
        <p key={key++} className={HEADER_CLASS[level]}>
          {renderInline(h[2], `h${key}`)}
        </p>,
      )
      i++
      continue
    }

    // 6) 인용(연속 줄 묶음)
    if (RE_QUOTE.test(line)) {
      const buf: string[] = []
      while (i < lines.length && RE_QUOTE.test(lines[i])) {
        buf.push(lines[i].replace(RE_QUOTE, '$1'))
        i++
      }
      blocks.push(
        // DayOne 대표색(하늘색) 세로바·글자 + 이탤릭 (sky 톤은 InsightContent 기도 뱃지와 동일 계열)
        <blockquote key={key++} className="my-2 border-l-4 border-sky-300 pl-3.5 italic text-sky-700">
          {buf.map((b, j) => (
            <p key={j}>{renderInline(b, `q${key}-${j}`)}</p>
          ))}
        </blockquote>,
      )
      continue
    }

    // 7) 표 — 현재 줄에 | 가 있고 다음 줄이 구분선이면
    if (line.includes('|') && i + 1 < lines.length && RE_TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes('|')) {
      const head = splitTableRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitTableRow(lines[i]))
        i++
      }
      blocks.push(
        <div key={key++} className="my-2 overflow-x-auto">
          <table className="min-w-full border-collapse text-[0.95em]">
            <thead>
              <tr>
                {head.map((c, j) => (
                  <th key={j} className="border border-line bg-surface-subtle px-2.5 py-1.5 text-left font-semibold text-ink">
                    {renderInline(c, `th${key}-${j}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, j) => (
                    <td key={j} className="border border-line px-2.5 py-1.5 align-top">
                      {renderInline(c, `td${key}-${ri}-${j}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    // 8) 번호 목록(연속 줄 묶음)
    if (RE_OL.test(line)) {
      const items: string[] = []
      while (i < lines.length && RE_OL.test(lines[i])) {
        items.push(lines[i].replace(RE_OL, '$2'))
        i++
      }
      blocks.push(
        <ol key={key++} className="my-1.5 list-decimal space-y-1 pl-5 marker:text-faint">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it, `ol${key}-${j}`)}</li>
          ))}
        </ol>,
      )
      continue
    }

    // 9) 불릿 목록(연속 줄 묶음)
    if (RE_UL.test(line)) {
      const items: string[] = []
      while (i < lines.length && RE_UL.test(lines[i])) {
        items.push(lines[i].replace(RE_UL, '$1'))
        i++
      }
      blocks.push(
        <ul key={key++} className="my-1.5 list-disc space-y-1 pl-5 marker:text-faint">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it, `ul${key}-${j}`)}</li>
          ))}
        </ul>,
      )
      continue
    }

    // 10) 일반 줄 — 줄바꿈 보존(줄마다 <p>), 인라인 문법 적용
    blocks.push(<p key={key++}>{renderInline(line, `p${key}`)}</p>)
    i++
  }

  return <div className={className}>{blocks}</div>
}

// 목록 카드 발췌(line-clamp)용 — 마크다운 기호 제거한 순수 텍스트.
export function stripMarkdown(text: string | null): string {
  if (!text) return ''
  return text
    .replace(/```[\s\S]*?(```|$)/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(`+)([^`]+?)\1/g, '$2')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/([*_])([^*_\n]+)\1/g, '$2')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/gm, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
