// MFH-FX-CLOSE-MONTH-V1
// 월 마감 환율 고정 → fx_closings(patch115). 그달 수입·지출 USD 환산 기준(월말일 공시 환율).
//   · 기본 = 지난달(온두라스 날짜 기준). 이미 고정된 통화는 건너뜀(--force 로만 덮어씀).
//   · KRW = 수출입은행 API(월말일부터 거슬러 첫 공시일, .env.local KOREAEXIM_API_KEY) · HNL = fx_rates 의 월말 이전 7일 내 BCH 값.
//   · 값 직접 지정: --hnl <기준율> --hnl-date YYYY-MM-DD [--hnl-url URL] · --krw <기준율> --krw-date YYYY-MM-DD
//   · 자동: scripts/fx-collect.ts 가 매월 3일 이후 지난달이 미고정이면 같은 함수(lib/fx.ts closeMonth)로 고정.
// 사용:  npx tsx scripts/fx-close-month.ts                         (지난달)
//        npx tsx scripts/fx-close-month.ts --ym 2026-09 --hnl 26.8937 --hnl-date 2026-09-30 --hnl-url https://…
//        npx tsx scripts/fx-close-month.ts --ym 2026-09 --dry-run
// ⚠ repo 루트에서 실행.
import { loadEnv, createServiceClient, isDate } from './_shared'
import { closeMonth, FX_CLOSE_FROM, prevYm, type CloseOverride, type FxCurrency } from '../lib/fx'

function arg(name: string): string | null {
  const i = process.argv.indexOf(name)
  return i >= 0 ? (process.argv[i + 1] ?? null) : null
}
function fail(msg: string): never {
  console.error(msg)
  process.exit(1)
}
function override(cur: FxCurrency, flag: string, min: number, max: number): CloseOverride | undefined {
  const v = arg(flag)
  if (v == null) return undefined
  const rate = Number(v.replace(/,/g, ''))
  if (!Number.isFinite(rate) || rate < min || rate > max) fail(`${flag} 범위 이상(${min}~${max}): ${v}`)
  const d = arg(`${flag}-date`)
  if (!d || !isDate(d)) fail(`${flag}-date YYYY-MM-DD 필요`)
  return { rate, rate_date: d, source: cur === 'HNL' ? 'bch' : 'manual', source_url: arg(`${flag}-url`) }
}

async function main() {
  const env = loadEnv()
  const todayHn = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })
  const ym = arg('--ym') ?? prevYm(todayHn.slice(0, 7))
  if (!/^\d{4}-\d{2}$/.test(ym)) fail(`--ym YYYY-MM 형식: ${ym}`)
  if (ym < FX_CLOSE_FROM) fail(`${FX_CLOSE_FROM} 이전 달은 마감 환율을 쓰지 않습니다(저장된 금액 USD 가 확정값).`)
  if (ym >= todayHn.slice(0, 7)) fail(`${ym} 은 아직 끝나지 않은 달입니다.`)

  const sb = createServiceClient(env)
  const res = await closeMonth(sb, ym, {
    eximKey: env.KOREAEXIM_API_KEY,
    force: process.argv.includes('--force'),
    dryRun: process.argv.includes('--dry-run'),
    override: { HNL: override('HNL', '--hnl', 15, 60), KRW: override('KRW', '--krw', 800, 2500) },
  })
  for (const r of res) console.log(r.message)
  if (res.some((r) => r.status === 'error')) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
