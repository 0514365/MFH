// MFH-RECURRING-DUE-V1
// 반복 기록 승인대기 생성(예약 작업, 매일) — 활성 규칙마다 시작 연월~이번 달 중 "해당일이 지났고 아직 없는" 달의
// acct_recurring_due(pending) 행을 만든다. 자동 저장은 하지 않는다(우진이 /accounting/inbox 에서 실제 이체 확인 후 승인).
//   · (규칙, 연월) unique → 재실행 안전. 말일보다 큰 일자(31)는 그 달 말일로.
//   · 새 건이 있고 MFH_APP_URL + CRON_SECRET 이 있으면 /api/accounting/inbox-notify 로 푸시.
// 사용: npx tsx scripts/recurring-due.ts [--dry-run]   (repo 루트, .env.local 기준)
import { loadEnv, createServiceClient } from './_shared'

const DRY = process.argv.includes('--dry-run')
const env = loadEnv()
const sb = createServiceClient(env)
const HN_TZ = 'America/Tegucigalpa'

function todayHn(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: HN_TZ }) // YYYY-MM-DD
}
function* months(from: string, to: string): Generator<string> {
  let [y, m] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  while (y < ty || (y === ty && m <= tm)) {
    yield `${y}-${String(m).padStart(2, '0')}`
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
}
const lastDay = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

async function main() {
  const today = todayHn()
  const thisYm = today.slice(0, 7)
  console.log(`${DRY ? '[DRY] ' : ''}반복 기록 승인대기 생성 — 기준일 ${today}`)
  const { data: rules, error } = await sb.from('acct_recurring').select('id,user_id,name,day_of_month,start_ym,end_ym,is_active').eq('is_active', true)
  if (error) throw new Error(`규칙 조회 실패: ${error.message}`)
  const { data: dues } = await sb.from('acct_recurring_due').select('recurring_id, ym')
  const has = new Set((dues ?? []).map((d) => `${d.recurring_id}|${d.ym}`))
  const rows: { user_id: string; recurring_id: string; ym: string; due_date: string }[] = []
  for (const r of rules ?? []) {
    const end = r.end_ym && r.end_ym < thisYm ? r.end_ym : thisYm
    for (const ym of months(r.start_ym, end)) {
      const day = Math.min(Number(r.day_of_month), lastDay(ym))
      const due = `${ym}-${String(day).padStart(2, '0')}`
      if (due > today) continue
      if (has.has(`${r.id}|${ym}`)) continue
      rows.push({ user_id: r.user_id, recurring_id: r.id, ym, due_date: due })
      console.log(`  + ${r.name} · ${ym} (예정 ${due})`)
    }
  }
  if (!rows.length) console.log('  새 승인대기 없음')
  else if (!DRY) {
    const { error: e } = await sb.from('acct_recurring_due').insert(rows)
    if (e) throw new Error(`저장 실패: ${e.message}`)
  }
  const { count: pending } = await sb.from('acct_recurring_due').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  console.log(`규칙 ${rules?.length ?? 0}건 / 신규 ${rows.length}건 저장 · 반복 승인대기 총 ${pending ?? 0}건`)

  if (!DRY && rows.length > 0 && env.MFH_APP_URL && env.CRON_SECRET) {
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
