// MFH-NOTION-LIB-V2
// 노션 회계(SoT) 읽기 전용 클라이언트 — 서버 전용(page.tsx 등 서버 컴포넌트에서만 import).
// 입출금기록의 '수입' 거래를 후원자(앱ID)별·연도별로 집계해 헌금 이력을 돌려준다.
// NOTION_TOKEN 미설정/실패 시 null → 호출부는 "기록 없음" 으로 폴백.
// 경로: Notion REST API POST /v1/databases/{id}/query (MCP 의 AI SQL 과 별개, plan 제약 없음).

import type { Supporter } from './types'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'
// REST API(databases/{id}/query)는 *database id* 를 쓴다 — MCP 의 collection://… (data source id)와 다르니 주의.
const SUPPORTER_DB_ID = 'fe45d45f-c7c0-40ce-a329-525e46a83ef3' // 후원자 DB(앱ID 보유)
const INOUT_DB_ID = '37c15af9-28ad-817b-94da-c05e3f2e7e3a' // 입출금기록 DB(거래 — 구분 '수입' = 헌금)

type NotionText = { plain_text?: string | null }
type NotionProperty = {
  type?: string
  rich_text?: NotionText[]
  title?: NotionText[]
  relation?: { id?: string }[]
  date?: { start?: string | null } | null
  number?: number | null
  select?: { name?: string | null } | null
  formula?: { type?: string; number?: number | null; string?: string | null } | null
}
type NotionPage = { id?: string; properties?: Record<string, NotionProperty> }
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

// 노션 DB query 1페이지 — no-store(노션 SoT, 입력 즉시 반영). 실패 시 null.
async function queryNotion(
  dbId: string,
  token: string,
  cursor: string | null,
): Promise<NotionQueryResponse | null> {
  const body: Record<string, unknown> = { page_size: 100 }
  if (cursor) body.start_cursor = cursor
  try {
    const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as NotionQueryResponse
  } catch {
    return null
  }
}

// 한 DB 의 모든 페이지 순회(페이지네이션). 어느 페이지든 실패하면 null(부분 결과 버림).
async function queryAll(dbId: string, token: string): Promise<NotionPage[] | null> {
  const all: NotionPage[] = []
  let cursor: string | null = null
  do {
    const data = await queryNotion(dbId, token, cursor)
    if (!data) return null
    all.push(...(data.results ?? []))
    cursor = data.has_more ? data.next_cursor ?? null : null
  } while (cursor)
  return all
}

export type DonationYearly = {
  total: number
  years: { year: number; sum: number }[]
  byCurrency: { currency: string; sum: number }[] // 실제 입금 통화별 원금 합(KRW·HNL·USD 순)
}

// 후원자별 헌금(노션 입출금기록 '수입' 거래)을 연도별로 집계. Map<app_id, {total, years[]}>.
// 흐름: 후원자 DB(페이지id→앱ID) + 입출금기록(수입 거래의 후원자·날짜·금액) → 앱ID별 연도 합산.
// 토큰 없거나 어느 query 든 실패하면 null → 호출부 폴백("기록 없음").
export async function getDonationsByAppId(): Promise<Map<string, DonationYearly> | null> {
  const token = process.env.NOTION_TOKEN
  if (!token) return null

  // 1) 후원자 DB: 페이지 id → 앱ID(=supporters.id) 매핑.
  const supporters = await queryAll(SUPPORTER_DB_ID, token)
  if (!supporters) return null
  const pageToApp = new Map<string, string>()
  for (const p of supporters) {
    const appId = readText(p.properties?.['앱ID'])
    if (p.id && appId) pageToApp.set(p.id, appId)
  }

  // 2) 입출금기록: '수입' 거래를 후원자(앱ID)별 연도 합산.
  const txs = await queryAll(INOUT_DB_ID, token)
  if (!txs) return null
  const byApp = new Map<string, Map<number, number>>()
  const byAppCur = new Map<string, Map<string, number>>() // appId → 통화 → 원금 합
  for (const tx of txs) {
    const props = tx.properties ?? {}
    if (props['구분']?.select?.name !== '수입') continue
    const supId = props['후원자']?.relation?.[0]?.id
    if (!supId) continue
    const appId = pageToApp.get(supId)
    if (!appId) continue
    const dateStr = props['날짜']?.date?.start ?? null
    const year = dateStr ? Number(dateStr.slice(0, 4)) : NaN
    if (!Number.isFinite(year)) continue
    const amt = props['금액']?.number
    const amount = typeof amt === 'number' ? amt : 0
    let years = byApp.get(appId)
    if (!years) {
      years = new Map<number, number>()
      byApp.set(appId, years)
    }
    years.set(year, (years.get(year) ?? 0) + amount)
    // 실제 입금 통화별 원금 합(원금·통화 없으면 USD 환산액으로 폴백).
    const cur = props['통화']?.select?.name ?? 'USD'
    const pr = props['원금']?.number
    const principal = typeof pr === 'number' ? pr : amount
    let curMap = byAppCur.get(appId)
    if (!curMap) {
      curMap = new Map<string, number>()
      byAppCur.set(appId, curMap)
    }
    curMap.set(cur, (curMap.get(cur) ?? 0) + principal)
  }

  // 3) 연도 내림차순 정렬 + total.
  const CUR_ORDER: Record<string, number> = { KRW: 0, HNL: 1, USD: 2 }
  const out = new Map<string, DonationYearly>()
  for (const [appId, years] of byApp) {
    const arr = [...years.entries()]
      .map(([year, sum]) => ({ year, sum }))
      .sort((a, b) => b.year - a.year)
    const total = arr.reduce((s, y) => s + y.sum, 0)
    const byCurrency = [...(byAppCur.get(appId)?.entries() ?? [])]
      .map(([currency, sum]) => ({ currency, sum }))
      .sort((a, b) => (CUR_ORDER[a.currency] ?? 9) - (CUR_ORDER[b.currency] ?? 9))
    out.set(appId, { total, years: arr, byCurrency })
  }
  return out
}

// ===== 회계 입력(A안) — 콤보 옵션·최근 거래 read + 노션 write =====
// 앱에서 노션 입출금기록에 직접 입력(write)하기 위한 함수. 노션은 SoT 유지(앱은 저장소 없음).
const ITEM_DB_ID = '37c15af9-28ad-811c-b32f-c7878db9b51f' // 항목 DB(카테고리)
const ASSET_DB_ID = '37c15af9-28ad-81eb-a392-ce9226dcdbc7' // 자산 DB(계좌)

export type AcctOption = { id: string; name: string; currency?: string | null; category?: string | null }
export type AcctOptions = {
  items: { 수입: AcctOption[]; 지출: AcctOption[] }
  supporters: AcctOption[]
  accounts: AcctOption[]
}

function pickOptions(pages: NotionPage[]): AcctOption[] {
  const out: AcctOption[] = []
  for (const p of pages) {
    const name = readText(p.properties?.['이름'])
    if (p.id && name) out.push({ id: p.id, name })
  }
  return out
}

// 입력 폼 콤보 소스 — 항목(구분별)·후원자·계좌. relation 연결용 페이지 id 포함. 실패 시 null.
export async function getAcctOptions(): Promise<AcctOptions | null> {
  const token = process.env.NOTION_TOKEN
  if (!token) return null
  const [itemPages, supPages, accPages] = await Promise.all([
    queryAll(ITEM_DB_ID, token),
    queryAll(SUPPORTER_DB_ID, token),
    queryAll(ASSET_DB_ID, token),
  ])
  if (!itemPages || !supPages || !accPages) return null
  const items: AcctOptions['items'] = { 수입: [], 지출: [] }
  for (const p of itemPages) {
    const name = readText(p.properties?.['이름'])
    const g = p.properties?.['구분']?.select?.name
    if (p.id && name && (g === '수입' || g === '지출'))
      items[g].push({ id: p.id, name, category: p.properties?.['대분류']?.select?.name ?? null })
  }
  // 계좌는 통화(KRW/USD/HNL select) 포함 — 폼에서 통화별 기본계좌 자동선택용.
  const accounts: AcctOption[] = []
  for (const p of accPages) {
    const name = readText(p.properties?.['이름'])
    if (p.id && name)
      accounts.push({ id: p.id, name, currency: p.properties?.['통화']?.select?.name ?? null })
  }
  return { items, supporters: pickOptions(supPages), accounts }
}

export type AccountBalance = { id: string; name: string; balanceUsd: number; currency: string | null }

// 계좌별 잔액(메인 요약용) — 자산 DB 의 `잔액(USD)` formula 직접 read(입금합−출금합+조정·초기보유 최종값). 실패 시 null.
export async function getAccountBalances(): Promise<AccountBalance[] | null> {
  const token = process.env.NOTION_TOKEN
  if (!token) return null
  const pages = await queryAll(ASSET_DB_ID, token)
  if (!pages) return null
  const out: AccountBalance[] = []
  for (const p of pages) {
    const name = readText(p.properties?.['이름'])
    if (!p.id || !name) continue
    const bal = p.properties?.['잔액(USD)']
    const balanceUsd = bal?.formula?.number ?? bal?.number ?? 0
    out.push({
      id: p.id,
      name,
      balanceUsd: typeof balanceUsd === 'number' ? balanceUsd : 0,
      currency: p.properties?.['통화']?.select?.name ?? null,
    })
  }
  return out
}

export type InoutRow = {
  id: string
  gubun: string | null
  date: string | null
  name: string | null
  currency: string | null
  principal: number | null
  rate: number | null
  amountUsd: number | null
  itemId: string | null
  accountId: string | null
  supporterId: string | null
}

// 거래 목록(표시·수정·집계용) — 빈 거래 제외, 날짜 내림차순. id·수정 필드 포함. 항목·계좌 이름은 호출부가 옵션 맵으로 변환.
// limit 미지정 시 전체 반환(월별 그룹화·합계·필터·정렬은 클라이언트에서 전체 위에 수행).
export async function getRecentInout(limit?: number): Promise<InoutRow[] | null> {
  const token = process.env.NOTION_TOKEN
  if (!token) return null
  const txs = await queryAll(INOUT_DB_ID, token)
  if (!txs) return null
  const num = (v: number | null | undefined) => (typeof v === 'number' ? v : null)
  const rows: InoutRow[] = txs.map((tx) => {
    const pr = tx.properties ?? {}
    return {
      id: tx.id ?? '',
      gubun: pr['구분']?.select?.name ?? null,
      date: pr['날짜']?.date?.start ?? null,
      name: readText(pr['이름']),
      currency: pr['통화']?.select?.name ?? null,
      principal: num(pr['원금']?.number),
      rate: num(pr['환율']?.number),
      amountUsd: num(pr['금액']?.number),
      itemId: pr['항목']?.relation?.[0]?.id ?? null,
      accountId: pr['입금계좌']?.relation?.[0]?.id ?? pr['지불계좌']?.relation?.[0]?.id ?? null,
      supporterId: pr['후원자']?.relation?.[0]?.id ?? null,
    }
  })
  const sorted = rows
    .filter((r) => !!r.name || r.amountUsd != null)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  return limit != null ? sorted.slice(0, limit) : sorted
}

export type InoutInput = {
  gubun: '수입' | '지출'
  date: string // YYYY-MM-DD
  itemId: string // 항목 페이지 id
  name: string
  currency: 'KRW' | 'USD' | 'HNL'
  principal: number // 원금(현지통화)
  rate: number // 환율(1 USD당 현지통화)
  amountUsd: number // 금액(USD) = 원금 ÷ 환율
  accountId?: string | null
  supporterId?: string | null
}

// 노션 입출금기록에 거래 1건 생성(write). 계좌는 수입→입금계좌/지출→지불계좌. 성공 {ok:true}.
export async function createInoutRecord(p: InoutInput): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.NOTION_TOKEN
  if (!token) return { ok: false, error: 'NOTION_TOKEN 미설정' }
  const properties: Record<string, unknown> = {
    구분: { select: { name: p.gubun } },
    날짜: { date: { start: p.date } },
    이름: { title: [{ text: { content: p.name || '(무제)' } }] },
    통화: { select: { name: p.currency } },
    원금: { number: p.principal },
    환율: { number: p.rate },
    금액: { number: p.amountUsd },
    항목: { relation: [{ id: p.itemId }] },
  }
  if (p.accountId) {
    properties[p.gubun === '수입' ? '입금계좌' : '지불계좌'] = { relation: [{ id: p.accountId }] }
  }
  if (p.supporterId) properties['후원자'] = { relation: [{ id: p.supporterId }] }
  try {
    const res = await fetch(`${NOTION_API}/pages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ parent: { database_id: INOUT_DB_ID }, properties }),
      cache: 'no-store',
    })
    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, error: `노션 저장 실패 (${res.status}) ${txt.slice(0, 160)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '네트워크 오류' }
  }
}

// 입출금기록 거래 1건 수정(PATCH). 계좌는 구분에 맞춰 한쪽만 채우고 반대쪽은 비운다(구분 변경 대응).
export async function updateInoutRecord(
  pageId: string,
  p: InoutInput,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.NOTION_TOKEN
  if (!token) return { ok: false, error: 'NOTION_TOKEN 미설정' }
  const properties: Record<string, unknown> = {
    구분: { select: { name: p.gubun } },
    날짜: { date: { start: p.date } },
    이름: { title: [{ text: { content: p.name || '(무제)' } }] },
    통화: { select: { name: p.currency } },
    원금: { number: p.principal },
    환율: { number: p.rate },
    금액: { number: p.amountUsd },
    항목: { relation: [{ id: p.itemId }] },
    입금계좌:
      p.gubun === '수입' && p.accountId ? { relation: [{ id: p.accountId }] } : { relation: [] },
    지불계좌:
      p.gubun === '지출' && p.accountId ? { relation: [{ id: p.accountId }] } : { relation: [] },
    후원자: p.supporterId ? { relation: [{ id: p.supporterId }] } : { relation: [] },
  }
  try {
    const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
      cache: 'no-store',
    })
    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, error: `노션 수정 실패 (${res.status}) ${txt.slice(0, 160)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '네트워크 오류' }
  }
}

// 입출금기록 거래 1건 삭제 — archived=true(노션 휴지통, 30일 복구 가능). 헌금합계 rollup 자동 정정.
export async function deleteInoutRecord(pageId: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.NOTION_TOKEN
  if (!token) return { ok: false, error: 'NOTION_TOKEN 미설정' }
  try {
    const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ archived: true }),
      cache: 'no-store',
    })
    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, error: `노션 삭제 실패 (${res.status}) ${txt.slice(0, 160)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '네트워크 오류' }
  }
}

export type InoutPatch = { itemId?: string; accountId?: string }

// 통합 수정 — 거래 1건의 항목/계좌만 부분 변경(금액·이름·날짜 등 보존). 계좌는 행 구분에 맞는 필드에 set.
// 빈 patch(둘 다 미지정)는 변경 없이 ok. 일괄 수정은 actions.bulkPatchInout 이 행마다 호출.
export async function patchInoutFields(
  pageId: string,
  gubun: '수입' | '지출',
  patch: InoutPatch,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.NOTION_TOKEN
  if (!token) return { ok: false, error: 'NOTION_TOKEN 미설정' }
  const properties: Record<string, unknown> = {}
  if (patch.itemId) properties['항목'] = { relation: [{ id: patch.itemId }] }
  if (patch.accountId) {
    properties[gubun === '수입' ? '입금계좌' : '지불계좌'] = { relation: [{ id: patch.accountId }] }
  }
  if (Object.keys(properties).length === 0) return { ok: true }
  try {
    const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
      cache: 'no-store',
    })
    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, error: `노션 수정 실패 (${res.status}) ${txt.slice(0, 160)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '네트워크 오류' }
  }
}

// ===== 후원자 노션 동기화(앱 SoT → 노션 후원자 DB) =====
// 앱에서 후원자 등록/수정/삭제 시 노션 후원자 DB 에 자동 반영(앱ID 매핑). 헌금 relation·회계 후원자 콤보 소스를 일치시킨다.

const supporterHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json',
})

// 앱ID(=supporter.id)로 노션 후원자 page id 찾기. 없으면 null.
async function findSupporterPageId(appId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`${NOTION_API}/databases/${SUPPORTER_DB_ID}/query`, {
      method: 'POST',
      headers: supporterHeaders(token),
      body: JSON.stringify({
        filter: { property: '앱ID', rich_text: { equals: appId } },
        page_size: 1,
      }),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as NotionQueryResponse
    return data.results?.[0]?.id ?? null
  } catch {
    return null
  }
}

// 앱 후원자 → 노션 properties(기존 내보내기 17필드 매핑과 동일). 헌금·헌금합계는 노션이 입출금기록 relation 으로 자동.
function supporterProps(s: Supporter): Record<string, unknown> {
  const rt = (v: string | null) => ({ rich_text: v ? [{ text: { content: v } }] : [] })
  const dt = (v: string | null) => ({ date: v ? { start: v } : null })
  return {
    이름: { title: [{ text: { content: s.name } }] },
    앱ID: { rich_text: [{ text: { content: s.id } }] },
    생년월일: dt(s.birth_date),
    소속: rt(s.affiliation),
    직분: rt(s.role),
    지역: rt(s.region),
    전화: { phone_number: s.phone || null },
    이메일: { email: s.email || null },
    SNS: rt(s.sns),
    소개자: rt(s.referrer),
    첫만남: dt(s.first_met_date),
    정기후원: { checkbox: s.is_recurring },
    정기통화: { select: s.recurring_currency ? { name: s.recurring_currency } : null },
    정기금액: { number: s.recurring_amount },
    기도제목: rt(s.prayer_points),
    메모: rt(s.notes),
    활성: { checkbox: s.is_active },
  }
}

// 후원자 upsert — 앱ID 로 기존 page 찾으면 PATCH, 없으면 새 page 생성.
export async function upsertSupporterToNotion(
  s: Supporter,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.NOTION_TOKEN
  if (!token) return { ok: false, error: 'NOTION_TOKEN 미설정' }
  const properties = supporterProps(s)
  const pageId = await findSupporterPageId(s.id, token)
  try {
    const res = pageId
      ? await fetch(`${NOTION_API}/pages/${pageId}`, {
          method: 'PATCH',
          headers: supporterHeaders(token),
          body: JSON.stringify({ properties }),
          cache: 'no-store',
        })
      : await fetch(`${NOTION_API}/pages`, {
          method: 'POST',
          headers: supporterHeaders(token),
          body: JSON.stringify({ parent: { database_id: SUPPORTER_DB_ID }, properties }),
          cache: 'no-store',
        })
    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, error: `노션 동기화 실패 (${res.status}) ${txt.slice(0, 160)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '네트워크 오류' }
  }
}

// 후원자 삭제 동기화 — 앱ID 로 노션 page 찾아 archived(휴지통, 복구 가능). 노션에 없으면 ok(할 일 없음).
export async function archiveSupporterInNotion(
  appId: string,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.NOTION_TOKEN
  if (!token) return { ok: false, error: 'NOTION_TOKEN 미설정' }
  const pageId = await findSupporterPageId(appId, token)
  if (!pageId) return { ok: true }
  try {
    const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
      method: 'PATCH',
      headers: supporterHeaders(token),
      body: JSON.stringify({ archived: true }),
      cache: 'no-store',
    })
    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, error: `노션 삭제 동기화 실패 (${res.status}) ${txt.slice(0, 160)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '네트워크 오류' }
  }
}
