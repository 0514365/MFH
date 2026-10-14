// MFH-ACCOUNTING-MIGRATE-NOTION-V1
// 노션 회계(항목·자산·입출금기록) → Supabase(acct_items·acct_accounts·acct_inout) 1회성 이관.
//   · notion_id 기준 upsert — 재실행 안전(이미 이관된 행은 갱신).
//   · 후원자: 노션 후원자 page id → '앱ID' → supporters.id(존재 확인). 실패 건은 리포트.
//   · 제외: 구분이 수입/지출 아님 · 날짜 없음 · 항목 없음 · 빈 거래(이름·금액 모두 없음).
//   · 노션은 삭제하지 않는다(읽기전용 백업).
// 사용:  npx tsx scripts/accounting-migrate-notion.ts            (실제 저장)
//        npx tsx scripts/accounting-migrate-notion.ts --dry-run  (저장 없이 리포트만)
// ⚠ repo 루트에서 실행(.env.local 기준). 선행: supabase/patch102-accounting.sql 적용.
import { loadEnv, createServiceClient, requireUserId } from './_shared'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'
const ITEM_DB_ID = '37c15af9-28ad-811c-b32f-c7878db9b51f'
const ASSET_DB_ID = '37c15af9-28ad-81eb-a392-ce9226dcdbc7'
const INOUT_DB_ID = '37c15af9-28ad-817b-94da-c05e3f2e7e3a'
const SUPPORTER_DB_ID = 'fe45d45f-c7c0-40ce-a329-525e46a83ef3'

type NText = { plain_text?: string | null }
type NProp = {
  rich_text?: NText[]
  title?: NText[]
  relation?: { id?: string }[]
  date?: { start?: string | null } | null
  number?: number | null
  select?: { name?: string | null } | null
  checkbox?: boolean
}
type NPage = { id: string; created_time?: string; properties: Record<string, NProp> }

const text = (p?: NProp): string | null => {
  const arr = p?.rich_text ?? p?.title
  if (!Array.isArray(arr) || !arr.length) return null
  const s = arr.map((t) => t.plain_text ?? '').join('').trim()
  return s || null
}
const sel = (p?: NProp): string | null => p?.select?.name ?? null
const num = (p?: NProp): number | null => (typeof p?.number === 'number' ? p.number : null)
const rel = (p?: NProp): string | null => p?.relation?.[0]?.id ?? null

async function queryAll(dbId: string, token: string): Promise<NPage[]> {
  const out: NPage[] = []
  let cursor: string | null = null
  do {
    const body: Record<string, unknown> = { page_size: 100 }
    if (cursor) body.start_cursor = cursor
    const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`노션 query 실패 ${dbId} (${res.status}) ${await res.text()}`)
    const data = (await res.json()) as { results: NPage[]; has_more: boolean; next_cursor: string | null }
    out.push(...data.results)
    cursor = data.has_more ? data.next_cursor : null
  } while (cursor)
  return out
}

type Cur = 'KRW' | 'USD' | 'HNL'
const isCur = (s: string | null): s is Cur => s === 'KRW' || s === 'USD' || s === 'HNL'
const r2 = (n: number) => Math.round(n * 100) / 100


// notion_id 기준 수동 upsert — 부분 unique 인덱스(where notion_id is not null)는 PostgREST on_conflict 와 맞지 않아
// 기존 notion_id 를 조회해 신규는 insert, 기존은 id 로 update 한다.
async function upsertByNotionId<T extends { notion_id: string }>(
  sb: ReturnType<typeof createServiceClient>,
  table: string,
  rows: T[],
): Promise<{ inserted: number; updated: number }> {
  const { data: existing, error } = await sb.from(table).select('id, notion_id').not('notion_id', 'is', null)
  if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
  const idOf = new Map<string, string>()
  for (const e of (existing ?? []) as { id: string; notion_id: string }[]) idOf.set(e.notion_id, e.id)
  const toInsert = rows.filter((r) => !idOf.has(r.notion_id))
  const toUpdate = rows.filter((r) => idOf.has(r.notion_id))
  for (let i = 0; i < toInsert.length; i += 100) {
    const { error: e } = await sb.from(table).insert(toInsert.slice(i, i + 100))
    if (e) throw new Error(`${table} insert 실패(${i}~): ${e.message}`)
  }
  for (const r of toUpdate) {
    const { error: e } = await sb.from(table).update(r).eq('id', idOf.get(r.notion_id)!)
    if (e) throw new Error(`${table} update 실패(${r.notion_id}): ${e.message}`)
  }
  return { inserted: toInsert.length, updated: toUpdate.length }
}

async function main() {
  const dry = process.argv.includes('--dry-run')
  const env = loadEnv()
  const token = env.NOTION_TOKEN
  if (!token) {
    console.error('NOTION_TOKEN 누락 — .env.local 확인')
    process.exit(1)
  }
  const sb = createServiceClient(env)
  const USER_ID = requireUserId(env)

  console.log('노션 읽기 중…')
  const [itemPages, assetPages, inoutPages, supPages] = await Promise.all([
    queryAll(ITEM_DB_ID, token),
    queryAll(ASSET_DB_ID, token),
    queryAll(INOUT_DB_ID, token),
    queryAll(SUPPORTER_DB_ID, token),
  ])
  console.log(`  항목 ${itemPages.length} · 계좌 ${assetPages.length} · 거래 ${inoutPages.length} · 후원자 ${supPages.length}`)

  // ── 1) 항목
  const items = itemPages
    .map((p, i) => ({
      user_id: USER_ID,
      gubun: sel(p.properties['구분']),
      name: text(p.properties['이름']),
      category: sel(p.properties['대분류']),
      description: text(p.properties['설명']),
      sort_order: i,
      notion_id: p.id,
    }))
    .filter((it): it is typeof it & { gubun: '수입' | '지출'; name: string } =>
      (it.gubun === '수입' || it.gubun === '지출') && !!it.name,
    )
  console.log(`항목 이관 대상 ${items.length}건 (제외 ${itemPages.length - items.length})`)

  // ── 2) 계좌
  const accounts = assetPages
    .map((p, i) => ({
      user_id: USER_ID,
      name: text(p.properties['이름']),
      currency: sel(p.properties['통화']),
      info: text(p.properties['계좌정보']),
      kind: sel(p.properties['유형']) ?? '현금',
      initial_usd: num(p.properties['초기 보유 금액']) ?? 0,
      adjust_usd: num(p.properties['조정금액']) ?? 0,
      is_favorite: !!p.properties['즐겨찾기']?.checkbox,
      sort_order: i,
      notion_id: p.id,
    }))
    .filter((a): a is typeof a & { name: string; currency: Cur } => !!a.name && isCur(a.currency))
  console.log(`계좌 이관 대상 ${accounts.length}건 (제외 ${assetPages.length - accounts.length})`)

  if (!dry) {
    const r1 = await upsertByNotionId(sb, 'acct_items', items)
    const r2a = await upsertByNotionId(sb, 'acct_accounts', accounts)
    console.log(`  항목 insert ${r1.inserted} / update ${r1.updated} · 계좌 insert ${r2a.inserted} / update ${r2a.updated}`)
  }

  // notion_id → supabase id 맵(dry-run 은 가짜 id 로 리포트만)
  const itemMap = new Map<string, string>()
  const accMap = new Map<string, string>()
  if (!dry) {
    const { data: dbItems, error: e1 } = await sb.from('acct_items').select('id, notion_id')
    if (e1) throw new Error(e1.message)
    for (const it of dbItems ?? []) if (it.notion_id) itemMap.set(it.notion_id, it.id)
    const { data: dbAcc, error: e2 } = await sb.from('acct_accounts').select('id, notion_id')
    if (e2) throw new Error(e2.message)
    for (const a of dbAcc ?? []) if (a.notion_id) accMap.set(a.notion_id, a.id)
  } else {
    for (const it of items) itemMap.set(it.notion_id, 'dry-' + it.notion_id)
    for (const a of accounts) accMap.set(a.notion_id, 'dry-' + a.notion_id)
  }

  // ── 3) 후원자: 노션 page id → 앱ID → supporters.id 존재 확인
  const { data: dbSup, error: e3 } = await sb.from('supporters').select('id')
  if (e3) throw new Error(`supporters 조회 실패: ${e3.message}`)
  const supIds = new Set((dbSup ?? []).map((s) => s.id as string))
  const supMap = new Map<string, string>() // notion page id → supporters.id
  const supMissing: string[] = []
  for (const p of supPages) {
    const appId = text(p.properties['앱ID'])
    const name = text(p.properties['이름']) ?? '(무명)'
    if (!appId) continue
    if (supIds.has(appId)) supMap.set(p.id, appId)
    else supMissing.push(`${name} (앱ID ${appId})`)
  }

  // ── 4) 거래
  type Row = {
    user_id: string
    gubun: '수입' | '지출'
    date: string
    item_id: string
    name: string
    currency: Cur
    principal: number
    rate: number
    amount_usd: number
    account_id: string | null
    supporter_id: string | null
    source: 'notion'
    notion_id: string
    created_at: string | undefined
  }
  const rows: Row[] = []
  const skipped: Record<string, number> = {}
  const warn: string[] = []
  const skip = (why: string) => (skipped[why] = (skipped[why] ?? 0) + 1)

  for (const p of inoutPages) {
    const pr = p.properties
    const gubun = sel(pr['구분'])
    const name = text(pr['이름'])
    const amount = num(pr['금액'])
    if (!name && amount == null) {
      skip('빈 거래')
      continue
    }
    if (gubun !== '수입' && gubun !== '지출') {
      skip(`구분 '${gubun ?? '없음'}'`)
      continue
    }
    const date = pr['날짜']?.date?.start?.slice(0, 10) ?? null
    if (!date) {
      skip('날짜 없음')
      continue
    }
    const itemN = rel(pr['항목'])
    const item_id = itemN ? itemMap.get(itemN) : undefined
    if (!item_id) {
      skip('항목 없음')
      warn.push(`항목 없음: ${date} ${name ?? ''}`)
      continue
    }
    const currency = sel(pr['통화'])
    const cur: Cur = isCur(currency) ? currency : 'USD'
    if (!isCur(currency)) warn.push(`통화 없음→USD: ${date} ${name ?? ''}`)
    const principal = num(pr['원금'])
    const rate = num(pr['환율'])
    const rateV = cur === 'USD' ? 1 : rate && rate > 0 ? rate : 1
    const principalV = principal ?? amount ?? 0
    const amountV = amount ?? r2(principalV / rateV)
    const accN = rel(pr['입금계좌']) ?? rel(pr['지불계좌'])
    const account_id = accN ? (accMap.get(accN) ?? null) : null
    if (accN && !account_id) warn.push(`계좌 매핑 실패: ${date} ${name ?? ''}`)
    const supN = rel(pr['후원자'])
    const supporter_id = supN ? (supMap.get(supN) ?? null) : null
    if (supN && !supporter_id) warn.push(`후원자 매핑 실패: ${date} ${name ?? ''}`)

    rows.push({
      user_id: USER_ID,
      gubun,
      date,
      item_id,
      name: name ?? '',
      currency: cur,
      principal: principalV,
      rate: rateV,
      amount_usd: amountV,
      account_id,
      supporter_id,
      source: 'notion',
      notion_id: p.id,
      created_at: p.created_time,
    })
  }

  const nIn = rows.filter((r) => r.gubun === '수입').length
  const nOut = rows.length - nIn
  const nSup = rows.filter((r) => r.supporter_id).length
  console.log(`거래 이관 대상 ${rows.length}건 (수입 ${nIn} · 지출 ${nOut} · 후원자 연결 ${nSup})`)
  console.log('제외:', Object.keys(skipped).length ? skipped : '없음')
  if (supMissing.length) console.log(`노션 후원자 중 앱에 없는 앱ID ${supMissing.length}건:`, supMissing.slice(0, 10))
  if (warn.length) {
    console.log(`경고 ${warn.length}건:`)
    for (const w of warn.slice(0, 30)) console.log('  -', w)
  }

  if (dry) {
    console.log('\n[dry-run] 저장하지 않았습니다.')
    return
  }

  const r3 = await upsertByNotionId(sb, 'acct_inout', rows)
  const done = r3.inserted + r3.updated
  console.log(`\n저장 완료: 항목 ${items.length} · 계좌 ${accounts.length} · 거래 ${done} (insert ${r3.inserted} / update ${r3.updated})`)

  // 검증: 노션 vs Supabase 금액 합계
  const sumN = { 수입: 0, 지출: 0 }
  for (const r of rows) sumN[r.gubun] += r.amount_usd
  const { data: agg } = await sb.from('acct_inout').select('gubun, amount_usd').eq('source', 'notion')
  const sumS = { 수입: 0, 지출: 0 }
  for (const a of (agg ?? []) as { gubun: string; amount_usd: number }[])
    if (a.gubun === '수입' || a.gubun === '지출') sumS[a.gubun] += Number(a.amount_usd)
  console.log(`검증 USD 합계 — 수입 노션 ${r2(sumN.수입)} / DB ${r2(sumS.수입)} · 지출 노션 ${r2(sumN.지출)} / DB ${r2(sumS.지출)}`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
