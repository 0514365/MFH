// MFH-FICOHSA-COLLECT-V3 — 자동 승인(patch110): 상점 자동 켬 + 항목 보임 + 계좌 + HNL/USD + 금액 ≤ 최근 10건 평균×3 → 바로 장부 저장
// MFH-FICOHSA-COLLECT-V2 — 카드 끝자리 → 계좌 자동 지정(patch104)
// Mac 메시지(chat.db)의 Ficohsa 카드 거래 문자 → card_tx_inbox(승인대기) 수집.
//   · 대상: handle 'FICOHSA', 본문 'FICO: Transaccion TC xxxx*****NNNN por HNL|USD|KRW 1,234.56 en 상점, si no la reconoce …'
//   · 범위: 마지막 수집(card_tx_inbox.max(sms_at)) 이후. 첫 실행은 START_DATE(기본 2026-09-01) 이후.
//   · 추천: merchant_rules(상점 사전)에 있으면 항목·적요·계좌 선채움. 없으면 계좌만 통화 기본값(HNL→렘피라, USD→달러).
//   · 중복: sms_key('<card4>-<YYYYMMDDHHMMSS>-<원금>') unique — 이미 있으면 건너뜀(ignoreDuplicates).
//   · 자동 승인: merchant_rules.auto_approve 상점의 **새로 수집된** 건이 조건을 모두 만족하면 acct_inout 저장(source=sms) +
//     inbox approved·auto=true + 사전 hit_count+1. 환율(HNL) = 마지막 SMS 승인 거래 환율(없으면 26.5). 실패 건은 승인대기로 남는다.
//   · 알림: .env.local 에 MFH_APP_URL + CRON_SECRET 이 있으면 /api/accounting/inbox-notify 호출(새 건 있을 때만).
// 사용:  npx tsx scripts/ficohsa-collect.ts                 (증분 수집)
//        npx tsx scripts/ficohsa-collect.ts --since 2026-09-01   (기준일 지정)
//        npx tsx scripts/ficohsa-collect.ts --dry-run        (저장 없이 파싱 결과만)
// 매일 22:00 Claude 데스크탑 예약 작업(ficohsa-collect)이 호출한다. ⚠ repo 루트에서 실행.
//   (launchd 는 불가 — launchd 가 띄운 프로세스는 ~/Library/CloudStorage(Dropbox)·chat.db 접근이 TCC 로 거부됨. 2026-10-14 확인)
import { execFileSync } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'
import { loadEnv, createServiceClient, requireUserId } from './_shared'

const CHAT_DB = join(homedir(), 'Library', 'Messages', 'chat.db')
const DEFAULT_START = '2026-09-01'
const HN_TZ = 'America/Tegucigalpa'
const AUTO_AVG_N = 10 // 금액 상한 기준 — 그 상점 최근 승인 N건 평균
const AUTO_MAX_X = 3 // 상한 = 평균 × X
const r2 = (n: number) => Math.round(n * 100) / 100
const hnDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: HN_TZ })

type Rule = {
  id: string
  merchant: string
  item_id: string
  name: string | null
  vendor: string | null
  account_id: string | null
  hit_count: number | null
  auto_approve?: boolean // patch110 전에는 없음
}
const RE = /^FICO: Transaccion TC xxxx\*+(\d{4}) por (HNL|USD|KRW) ([\d,]+\.\d{2}) en (.+?), si no la reconoce/

type SmsRow = { rowid: number; local_dt: string; utc_dt: string; text: string }

function arg(name: string): string | null {
  const i = process.argv.indexOf(name)
  return i >= 0 ? (process.argv[i + 1] ?? null) : null
}

// chat.db 조회 — sqlite3 CLI(-json). date 는 Apple epoch(ns) → unixepoch 변환. since 는 UTC ISO 비교.
function readSms(sinceUtcIso: string): SmsRow[] {
  const sql = `
    select m.ROWID as rowid,
           datetime(m.date/1000000000 + 978307200, 'unixepoch', 'localtime') as local_dt,
           datetime(m.date/1000000000 + 978307200, 'unixepoch') as utc_dt,
           m.text as text
    from message m join handle h on m.handle_id = h.ROWID
    where h.id = 'FICOHSA' and m.text like 'FICO: Transaccion TC%'
      and datetime(m.date/1000000000 + 978307200, 'unixepoch') > '${sinceUtcIso}'
    order by m.date asc;`
  const out = execFileSync('/usr/bin/sqlite3', ['-readonly', '-json', CHAT_DB, sql], { encoding: 'utf8' })
  return out.trim() ? (JSON.parse(out) as SmsRow[]) : []
}

// 'YYYY-MM-DD HH:MM:SS'(UTC) → ISO.
const toIso = (utc: string) => utc.replace(' ', 'T') + 'Z'
// sms_key: 카드끝4 + 로컬 수신시각(초) + 원금 — 같은 초에 같은 카드로 2건(학비 분할 등)이 와도 구분.
const keyOf = (card: string, localDt: string, principal: number) =>
  `${card}-${localDt.replace(/[^\d]/g, '')}-${principal.toFixed(2)}`
const normMerchant = (s: string) => s.replace(/\s+/g, ' ').trim().toUpperCase()

async function main() {
  const dry = process.argv.includes('--dry-run')
  const env = loadEnv()
  const sb = createServiceClient(env)
  const USER_ID = requireUserId(env)

  // 기준 시각 — --since 지정 > 마지막 수집 sms_at > DEFAULT_START.
  let sinceIso: string
  const sinceArg = arg('--since')
  if (sinceArg) sinceIso = `${sinceArg}T00:00:00Z`
  else {
    const { data } = await sb.from('card_tx_inbox').select('sms_at').order('sms_at', { ascending: false }).limit(1).maybeSingle()
    sinceIso = data?.sms_at ? new Date(data.sms_at).toISOString() : `${DEFAULT_START}T00:00:00Z`
  }
  const sinceSql = sinceIso.replace('T', ' ').replace(/\.\d+Z$|Z$/, '')
  console.log(`[ficohsa-collect] ${new Date().toISOString()} since ${sinceSql} UTC`)

  let sms: SmsRow[]
  try {
    sms = readSms(sinceSql)
  } catch (e) {
    console.error(
      'chat.db 를 읽지 못했습니다(전체 디스크 접근 권한 필요 — Claude 데스크탑/터미널에서 실행하세요).\n  ' +
        (e as Error).message,
    )
    process.exit(2)
  }
  console.log(`  문자 ${sms.length}건`)
  if (!sms.length) return

  // 옵션: 계좌(통화 기본값) · 상점 사전
  const [{ data: accounts }, { data: rules }] = await Promise.all([
    sb.from('acct_accounts').select('id, name, currency, card_last4').eq('is_active', true).order('sort_order'),
    sb.from('merchant_rules').select('*'), // * — patch110(auto_approve) 적용 전에도 동작
  ])
  // 계좌 자동 지정 — 1순위 카드 끝자리(acct_accounts.card_last4: 4956·7697=신용카드 계좌, 3070=Ficohsa(달러)_4484 직불),
  // 2순위 통화 기본계좌(HNL/USD). KRW 결제는 계좌 미지정(앱에서 선택).
  const accByCard = new Map<string, string>()
  const accByCur = new Map<string, string>()
  for (const a of accounts ?? []) {
    if (a.card_last4) accByCard.set(String(a.card_last4), a.id)
    if ((a.currency === 'HNL' || a.currency === 'USD') && !accByCur.has(a.currency)) accByCur.set(a.currency, a.id)
  }
  const ruleOf = new Map<string, Rule>()
  for (const r of (rules ?? []) as Rule[]) ruleOf.set(r.merchant, r)

  const rows = []
  let unparsed = 0
  for (const s of sms) {
    const m = s.text.match(RE)
    if (!m) {
      unparsed++
      continue
    }
    const [, card, cur, amtStr, merchantRaw] = m
    const merchant = normMerchant(merchantRaw)
    const rule = ruleOf.get(merchant)
    const principal = Number(amtStr.replace(/,/g, ''))
    rows.push({
      user_id: USER_ID,
      sms_key: keyOf(card, s.local_dt, principal),
      sms_at: toIso(s.utc_dt),
      card_last4: card,
      currency: cur,
      principal,
      merchant,
      raw_text: s.text,
      status: 'pending',
      suggested_item_id: rule?.item_id ?? null,
      suggested_name: rule?.name ?? null,
      suggested_vendor: rule?.vendor ?? null,
      suggested_account_id: accByCard.get(card) ?? rule?.account_id ?? accByCur.get(cur) ?? null,
    })
  }
  const withRule = rows.filter((r) => r.suggested_item_id).length
  console.log(`  파싱 ${rows.length}건 (추천 있음 ${withRule} · 새 상점 ${rows.length - withRule} · 형식 불일치 ${unparsed})`)

  // 자동 승인 판정(저장 전 계산) — sms_key → 사유 없음(true) / 사유 문자열
  const autoCtx = await loadAutoContext(sb, [...ruleOf.values()].filter((r) => r.auto_approve))
  const autoVerdict = new Map<string, true | string>()
  for (const r of rows) {
    const rule = ruleOf.get(r.merchant)
    if (rule?.auto_approve) autoVerdict.set(r.sms_key, judgeAuto(r, rule, autoCtx))
  }

  if (dry) {
    for (const r of rows.slice(-10)) {
      const v = autoVerdict.get(r.sms_key)
      const tag = v === true ? ' ⚡자동' : v ? ` (자동 제외: ${v})` : ''
      console.log(`  ${r.sms_at} ${r.card_last4} ${r.currency} ${r.principal} ${r.merchant}${r.suggested_item_id ? ' ✓' : ''}${tag}`)
    }
    console.log('[dry-run] 저장하지 않았습니다.')
    return
  }

  // 저장 — sms_key 중복은 무시(DO NOTHING). select 는 실제로 새로 들어간 행만 돌려준다.
  const inserted: { id: string; sms_key: string }[] = []
  for (let i = 0; i < rows.length; i += 200) {
    const { data, error } = await sb
      .from('card_tx_inbox')
      .upsert(rows.slice(i, i + 200), { onConflict: 'sms_key', ignoreDuplicates: true })
      .select('id, sms_key')
    if (error) {
      console.error('저장 실패:', error.message)
      process.exit(1)
    }
    inserted.push(...(data ?? []))
  }
  const added = inserted.length

  // 자동 승인 — 새로 들어간 행 중 판정 통과분만.
  let autoDone = 0
  const rowByKey = new Map(rows.map((r) => [r.sms_key, r]))
  for (const ins of inserted) {
    const v = autoVerdict.get(ins.sms_key)
    const r = rowByKey.get(ins.sms_key)
    if (!r) continue
    if (v !== true) {
      if (v) console.log(`  자동 제외 ${r.merchant} ${r.currency} ${r.principal}: ${v}`)
      continue
    }
    const err = await autoApprove(sb, USER_ID, ins.id, r, ruleOf.get(r.merchant)!, autoCtx.rate)
    if (err) console.log(`  자동 승인 실패(대기로 남김) ${r.merchant}: ${err}`)
    else autoDone++
  }

  const { count: pending } = await sb.from('card_tx_inbox').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  console.log(`  신규 ${added}건 저장 · 자동 승인 ${autoDone}건 · 승인대기 총 ${pending ?? 0}건`)

  // 알림(선택) — 새 건이 있을 때만.
  if (added > 0 && env.MFH_APP_URL && env.CRON_SECRET) {
    try {
      const res = await fetch(`${env.MFH_APP_URL.replace(/\/$/, '')}/api/accounting/inbox-notify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.CRON_SECRET}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ added, auto: autoDone }),
      })
      console.log(`  푸시 알림: ${res.status} ${(await res.text()).slice(0, 120)}`)
    } catch (e) {
      console.log('  푸시 알림 실패(무시):', (e as Error).message)
    }
  }
}

// ===== 자동 승인 =====

type Sb = ReturnType<typeof createServiceClient>
type AutoCtx = {
  activeItems: Set<string>
  avg: Map<string, number> // `${merchant}|${currency}` → 최근 승인 N건 평균 원금
  rate: number // HNL 환율
}
type ParsedRow = {
  sms_key: string
  sms_at: string
  currency: string
  principal: number
  merchant: string
  suggested_account_id: string | null
}

async function loadAutoContext(sb: Sb, autoRules: Rule[]): Promise<AutoCtx> {
  const ctx: AutoCtx = { activeItems: new Set(), avg: new Map(), rate: 26.5 }
  if (!autoRules.length) return ctx
  const [items, hist, last] = await Promise.all([
    sb.from('acct_items').select('id').eq('is_active', true).in('id', [...new Set(autoRules.map((r) => r.item_id))]),
    sb
      .from('card_tx_inbox')
      .select('merchant, currency, principal')
      .eq('status', 'approved')
      .in('merchant', autoRules.map((r) => r.merchant))
      .order('sms_at', { ascending: false })
      .limit(1000),
    sb
      .from('acct_inout')
      .select('rate')
      .eq('source', 'sms')
      .eq('currency', 'HNL')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  for (const i of items.data ?? []) ctx.activeItems.add(i.id)
  const bucket = new Map<string, number[]>()
  for (const h of hist.data ?? []) {
    const k = `${h.merchant}|${h.currency}`
    const arr = bucket.get(k) ?? []
    if (arr.length < AUTO_AVG_N) arr.push(Number(h.principal))
    bucket.set(k, arr)
  }
  for (const [k, arr] of bucket) if (arr.length) ctx.avg.set(k, arr.reduce((a, b) => a + b, 0) / arr.length)
  const rt = Number(last.data?.rate)
  if (Number.isFinite(rt) && rt > 0) ctx.rate = rt
  return ctx
}

// true = 자동 승인 / 문자열 = 제외 사유
function judgeAuto(r: ParsedRow, rule: Rule, ctx: AutoCtx): true | string {
  if (r.currency !== 'HNL' && r.currency !== 'USD') return `${r.currency} 결제`
  if (!ctx.activeItems.has(rule.item_id)) return '항목 숨김'
  if (!(r.suggested_account_id ?? rule.account_id)) return '계좌 없음'
  const avg = ctx.avg.get(`${r.merchant}|${r.currency}`)
  if (!avg) return '승인 이력 없음'
  if (r.principal > avg * AUTO_MAX_X) return `금액 ${r.principal} > 평균 ${r2(avg)}×${AUTO_MAX_X}`
  return true
}

// 장부 저장 → inbox approved·auto → 사전 hit_count+1. 오류 문자열 또는 null.
async function autoApprove(sb: Sb, uid: string, inboxId: string, r: ParsedRow, rule: Rule, hnlRate: number): Promise<string | null> {
  const usd = r.currency === 'USD'
  const rate = usd ? 1 : hnlRate
  const { data: ins, error: e1 } = await sb
    .from('acct_inout')
    .insert({
      user_id: uid,
      gubun: '지출',
      date: hnDate(r.sms_at),
      item_id: rule.item_id,
      name: rule.name ?? '',
      vendor: rule.vendor ?? r.merchant,
      currency: r.currency,
      principal: r.principal,
      rate,
      amount_usd: usd ? r.principal : r2(r.principal / rate),
      account_id: r.suggested_account_id ?? rule.account_id,
      supporter_id: null,
      source: 'sms',
    })
    .select('id')
    .single()
  if (e1 || !ins) return e1?.message ?? '장부 저장 실패'
  const now = new Date().toISOString()
  const { error: e2 } = await sb
    .from('card_tx_inbox')
    .update({ status: 'approved', auto: true, inout_id: ins.id, decided_at: now })
    .eq('id', inboxId)
  if (e2) {
    await sb.from('acct_inout').delete().eq('id', ins.id) // 대기열 갱신 실패 → 장부 되돌림(중복 방지)
    return e2.message
  }
  await sb
    .from('merchant_rules')
    .update({ hit_count: (rule.hit_count ?? 0) + 1, last_used_at: now })
    .eq('id', rule.id)
  rule.hit_count = (rule.hit_count ?? 0) + 1
  return null
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
