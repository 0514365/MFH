// MFH-FICOHSA-COLLECT-V2 — 카드 끝자리 → 계좌 자동 지정(patch104)
// Mac 메시지(chat.db)의 Ficohsa 카드 거래 문자 → card_tx_inbox(승인대기) 수집.
//   · 대상: handle 'FICOHSA', 본문 'FICO: Transaccion TC xxxx*****NNNN por HNL|USD|KRW 1,234.56 en 상점, si no la reconoce …'
//   · 범위: 마지막 수집(card_tx_inbox.max(sms_at)) 이후. 첫 실행은 START_DATE(기본 2026-09-01) 이후.
//   · 추천: merchant_rules(상점 사전)에 있으면 항목·적요·계좌 선채움. 없으면 계좌만 통화 기본값(HNL→렘피라, USD→달러).
//   · 중복: sms_key('<card4>-<YYYYMMDDHHMMSS>-<원금>') unique — 이미 있으면 건너뜀(ignoreDuplicates).
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
    sb.from('merchant_rules').select('merchant, item_id, name, account_id'),
  ])
  // 계좌 자동 지정 — 1순위 카드 끝자리(acct_accounts.card_last4: 4956·7697=신용카드 계좌, 1568=Ficohsa(달러) 직불),
  // 2순위 통화 기본계좌(HNL/USD). KRW 결제는 계좌 미지정(앱에서 선택).
  const accByCard = new Map<string, string>()
  const accByCur = new Map<string, string>()
  for (const a of accounts ?? []) {
    if (a.card_last4) accByCard.set(String(a.card_last4), a.id)
    if ((a.currency === 'HNL' || a.currency === 'USD') && !accByCur.has(a.currency)) accByCur.set(a.currency, a.id)
  }
  const ruleOf = new Map<string, { item_id: string; name: string | null; account_id: string | null }>()
  for (const r of rules ?? []) ruleOf.set(r.merchant, r)

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
      suggested_account_id: accByCard.get(card) ?? rule?.account_id ?? accByCur.get(cur) ?? null,
    })
  }
  const withRule = rows.filter((r) => r.suggested_item_id).length
  console.log(`  파싱 ${rows.length}건 (추천 있음 ${withRule} · 새 상점 ${rows.length - withRule} · 형식 불일치 ${unparsed})`)

  if (dry) {
    for (const r of rows.slice(-10)) console.log(`  ${r.sms_at} ${r.card_last4} ${r.currency} ${r.principal} ${r.merchant}${r.suggested_item_id ? ' ✓' : ''}`)
    console.log('[dry-run] 저장하지 않았습니다.')
    return
  }

  // 저장 — sms_key 중복은 무시. 신규 건수는 전후 count 차이로 계산.
  const before = await sb.from('card_tx_inbox').select('id', { count: 'exact', head: true })
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await sb
      .from('card_tx_inbox')
      .upsert(rows.slice(i, i + 200), { onConflict: 'sms_key', ignoreDuplicates: true })
    if (error) {
      console.error('저장 실패:', error.message)
      process.exit(1)
    }
  }
  const after = await sb.from('card_tx_inbox').select('id', { count: 'exact', head: true })
  const added = (after.count ?? 0) - (before.count ?? 0)
  const { count: pending } = await sb.from('card_tx_inbox').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  console.log(`  신규 ${added}건 저장 · 승인대기 총 ${pending ?? 0}건`)

  // 알림(선택) — 새 건이 있을 때만.
  if (added > 0 && env.MFH_APP_URL && env.CRON_SECRET) {
    try {
      const res = await fetch(`${env.MFH_APP_URL.replace(/\/$/, '')}/api/accounting/inbox-notify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
      })
      console.log(`  푸시 알림: ${res.status} ${(await res.text()).slice(0, 120)}`)
    } catch (e) {
      console.log('  푸시 알림 실패(무시):', (e as Error).message)
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
