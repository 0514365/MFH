// MFH-INSIGHT-IMPORT-V1
// claude.ai(Max) 분석 결과를 앱으로 회수하는 양식 + 파서.
//  · 우진은 export(.md)로 데이터를 내보내 Claude 프로젝트에서 분석 → 아래 양식으로 결과를 받음.
//  · 결과를 붙여넣기/파일업로드/드롭박스 링크로 가져오면 parseInsightBundle 이 렌즈별로 분배.
//  · 양식(IMPORT_FORMAT_GUIDE)은 export .md 와 Claude 프로젝트 지침에 동일하게 들어간다.
import { isValidDomain, type InsightDomain } from './insightExport'

export type ParsedInsight = {
  domain: InsightDomain
  periodStart: string | null
  periodEnd: string | null
  rating: number | null
  content: string
}

// Claude 프로젝트 지침 / export .md 하단에 동봉하는 출력 양식 안내.
export const IMPORT_FORMAT_GUIDE = `[MFH 인사이트 회수 양식 — 이 형식으로 출력해 주세요]
분석 결과를 아래 블록으로 감싸 주세요. 여러 렌즈를 한 번에 출력해도 됩니다(블록을 여러 개 이어 붙이기).

===MFH-INSIGHT===
LENS: prayer
PERIOD: 2026-05-24 ~ 2026-05-30
---
사역 · …
가정 · …
나라 · …
===END===

- LENS: prayer / balance / fruit / letter / overall / journal / project / task 중 하나.
- PERIOD: 선택(생략 가능). 형식 YYYY-MM-DD ~ YYYY-MM-DD.
- "---" 아래부터 "===END===" 전까지가 본문입니다.
- 블록 밖의 설명·인사말은 저장되지 않습니다.`

const BLOCK_RE = /===MFH-INSIGHT===([\s\S]*?)===END===/g
const PERIOD_RE = /(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/
const LENS_RE = /LENS:\s*([A-Za-z]+)/
const RATING_RE = /RATING:\s*([1-5])/

const MAX_LEN = 20000

// 회수 텍스트를 렌즈별 인사이트 배열로 파싱.
//  · 블록 마커가 있으면 블록 단위로(멀티 렌즈 분배).
//  · 마커가 전혀 없으면 전체를 fallbackDomain 단일 인사이트로(레거시 붙여넣기 호환).
export function parseInsightBundle(text: string, fallbackDomain: InsightDomain): ParsedInsight[] {
  const out: ParsedInsight[] = []
  BLOCK_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = BLOCK_RE.exec(text)) !== null) {
    const raw = m[1]
    const sep = raw.indexOf('---')
    const header = sep >= 0 ? raw.slice(0, sep) : raw
    // "---" 구분자가 있으면 그 뒤가 본문. 없으면(양식 흔들림) 헤더 줄(LENS/PERIOD/RATING)을 제거한 나머지를 본문으로.
    const body = (
      sep >= 0 ? raw.slice(sep + 3) : raw.replace(/^[ \t]*(?:LENS|PERIOD|RATING)[ \t]*:.*$/gim, '')
    ).trim()
    if (!body) continue
    const lensM = header.match(LENS_RE)
    const key = lensM ? lensM[1].toLowerCase() : ''
    const domain: InsightDomain = isValidDomain(key) ? key : fallbackDomain
    const pm = header.match(PERIOD_RE)
    const rm = header.match(RATING_RE)
    out.push({
      domain,
      periodStart: pm ? pm[1] : null,
      periodEnd: pm ? pm[2] : null,
      rating: rm ? Number(rm[1]) : null,
      content: body.slice(0, MAX_LEN),
    })
  }
  if (out.length === 0) {
    const body = text.trim()
    if (body) {
      out.push({
        domain: fallbackDomain,
        periodStart: null,
        periodEnd: null,
        rating: null,
        content: body.slice(0, MAX_LEN),
      })
    }
  }
  return out
}
