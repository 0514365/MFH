// MFH-FICOHSA-COLLECT-V4 — 공용 모듈(lib/ficohsa-sms.ts) 사용 · 최근 N일(기본 3) 항상 재확인 · 단축어 수집분과 ±5분 중복 판정
// MFH-FICOHSA-COLLECT-V3 — 자동 승인(patch110)
// MFH-FICOHSA-COLLECT-V2 — 카드 끝자리 → 계좌 자동 지정(patch104)
// Mac 메시지(chat.db)의 Ficohsa 카드 거래 문자 → card_tx_inbox(승인대기) 수집. iPhone 단축어 실시간 수집(/api/accounting/sms-ingest)의 백업.
//   · 대상: handle 'FICOHSA', 본문 'FICO: Transaccion TC xxxx*****NNNN por HNL|USD|KRW 1,234.56 en 상점, si no la reconoce …'
//   · 범위: 최근 --days N 일(기본 3) — 단축어가 먼저 넣은 건은 중복 판정으로 건너뛴다. --since 지정 시 그 날짜부터.
//   · 파싱·추천·중복·자동 승인 = lib/ficohsa-sms.ts ingestSms (단축어 API 와 공용).
//   · 알림: .env.local 에 MFH_APP_URL + CRON_SECRET 이 있으면 /api/accounting/inbox-notify 호출(새 건 있을 때만).
// 사용:  npx tsx scripts/ficohsa-collect.ts                 (최근 3일)
//        npx tsx scripts/ficohsa-collect.ts --days 14       (Mac 을 오래 못 켰을 때)
//        npx tsx scripts/ficohsa-collect.ts --since 2026-09-01   (기준일 지정)
//        npx tsx scripts/ficohsa-collect.ts --dry-run        (저장 없이 파싱·중복·자동 판정만)
// 07:00~22:50 10분마다 launchd(~/Library/LaunchAgents/com.mfh.ficohsa-collect.plist, 2026-10-15~)가 호출한다. ⚠ repo 루트에서 실행.
//   · /usr/local/bin/node 로 tsx cli 직접 실행 → node 에 '전체 디스크 접근 권한'(TCC)을 줘야 chat.db 를 읽는다. 로그 ~/Library/Logs/mfh-ficohsa-collect.log
//   · 이전 Claude 예약 작업 ficohsa-collect-2200(매시)은 중지(세션 사용량 0 으로 전환).
import { execFileSync } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'
import { loadEnv, createServiceClient, requireUserId } from './_shared'
import { ingestSms } from '../lib/ficohsa-sms'

const CHAT_DB = join(homedir(), 'Library', 'Messages', 'chat.db')
const DEFAULT_DAYS = 3

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

async function main() {
  const dry = process.argv.includes('--dry-run')
  const env = loadEnv()
  const sb = createServiceClient(env)
  const USER_ID = requireUserId(env)

  // 기준 시각 — --since 지정 > 최근 --days 일.
  const sinceArg = arg('--since')
  const days = Number(arg('--days')) > 0 ? Number(arg('--days')) : DEFAULT_DAYS
  const sinceIso = sinceArg ? `${sinceArg}T00:00:00Z` : new Date(Date.now() - days * 86400_000).toISOString()
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

  const res = await ingestSms(
    sb,
    USER_ID,
    sms.map((s) => ({ text: s.text, smsAt: toIso(s.utc_dt), localDt: s.local_dt })),
    { source: 'mac', dryRun: dry },
  )
  console.log(
    `  파싱 ${res.parsed}건 (추천 있음 ${res.withRule} · 새 상점 ${res.parsed - res.withRule} · 형식 불일치 ${res.unparsed}) · 이미 있음 ${res.duplicates}`,
  )

  if (dry) {
    for (const { draft: r, dupe, auto } of (res.preview ?? []).slice(-10)) {
      const tag = auto === true ? ' ⚡자동' : auto ? ` (자동 제외: ${auto})` : ''
      console.log(`  ${r.sms_at} ${r.card_last4} ${r.currency} ${r.principal} ${r.merchant}${r.suggested_item_id ? ' ✓' : ''}${dupe ? ' =있음' : tag}`)
    }
    console.log('[dry-run] 저장하지 않았습니다.')
    return
  }

  for (const n of res.notes) console.log(`  ${n}`)
  const added = res.added.length
  const { count: pending } = await sb.from('card_tx_inbox').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  console.log(`  신규 ${added}건 저장 · 자동 승인 ${res.autoDone}건 · 승인대기 총 ${pending ?? 0}건`)

  // 알림(선택) — 새 건이 있을 때만.
  if (added > 0 && env.MFH_APP_URL && env.CRON_SECRET) {
    try {
      const r = await fetch(`${env.MFH_APP_URL.replace(/\/$/, '')}/api/accounting/inbox-notify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.CRON_SECRET}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ added, auto: res.autoDone }),
      })
      console.log(`  푸시 알림: ${r.status} ${(await r.text()).slice(0, 120)}`)
    } catch (e) {
      console.log('  푸시 알림 실패(무시):', (e as Error).message)
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
