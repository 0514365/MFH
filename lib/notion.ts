// MFH-NOTION-LIB-V1
// 노션 회계(SoT) 읽기 전용 클라이언트 — 서버 전용(page.tsx 등 서버 컴포넌트에서만 import).
// 후원자 DB 의 "헌금합계"(rollup sum) 를 "앱ID"(=supporters.id) 별로 읽어 Map 으로 돌려준다.
// NOTION_TOKEN 미설정/호출 실패 시 null → 호출부는 앱(Supabase) 합계로 폴백한다.
// 경로: Notion REST API POST /v1/databases/{id}/query (MCP 의 AI SQL 과 별개, plan 제약 없음).

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'
// 후원자 DB(헌금합계 rollup 보유). 비밀 아님 → 상수.
// REST API(databases/{id}/query)는 *database id* 를 쓴다 — MCP 의 collection://96cb5d60…
// (data source id)와 다르니 주의. 둘을 혼동하면 404 object_not_found.
const SUPPORTER_DB_ID = 'fe45d45f-c7c0-40ce-a329-525e46a83ef3'

type NotionText = { plain_text?: string | null }
type NotionRollup = { type?: string; number?: number | null }
type NotionProperty = {
  type?: string
  rich_text?: NotionText[]
  title?: NotionText[]
  rollup?: NotionRollup
}
type NotionPage = { properties?: Record<string, NotionProperty> }
type NotionQueryResponse = {
  results?: NotionPage[]
  has_more?: boolean
  next_cursor?: string | null
}

function readText(prop?: NotionProperty): string | null {
  const arr = prop?.rich_text ?? prop?.title
  if (!Array.isArray(arr) || arr.length === 0) return null
  const s = arr.map((t) => t.plain_text ?? '').join('').trim()
  return s || null
}

function readRollupNumber(prop?: NotionProperty): number | null {
  if (prop?.type !== 'rollup') return null
  const r = prop.rollup
  return r?.type === 'number' && typeof r.number === 'number' ? r.number : null
}

// 후원자별 헌금합계(USD). Map<app_id, total>. 토큰 없거나 실패하면 null.
export async function getDonationTotalsByAppId(): Promise<Map<string, number> | null> {
  const token = process.env.NOTION_TOKEN
  if (!token) return null

  const totals = new Map<string, number>()
  let cursor: string | null = null
  try {
    do {
      const body: Record<string, unknown> = { page_size: 100 }
      if (cursor) body.start_cursor = cursor
      const res = await fetch(`${NOTION_API}/databases/${SUPPORTER_DB_ID}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        cache: 'no-store', // 노션이 SoT → 입력 즉시 앱 반영(후원자 상세는 마스터만, 호출 가벼움)
      })
      if (!res.ok) return null
      const data = (await res.json()) as NotionQueryResponse
      for (const page of data.results ?? []) {
        const appId = readText(page.properties?.['앱ID'])
        const total = readRollupNumber(page.properties?.['헌금합계'])
        if (appId && total != null) totals.set(appId, total)
      }
      cursor = data.has_more ? data.next_cursor ?? null : null
    } while (cursor)
  } catch {
    return null
  }
  return totals
}
