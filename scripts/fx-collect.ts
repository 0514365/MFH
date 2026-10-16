// MFH-FX-COLLECT-V2 — 저장 후 지난달 마감 환율 자동 고정(매월 3일 이후 · 미고정 통화만, lib/fx.ts closeMonth · patch115)
// MFH-FX-COLLECT-V1
// 공시 환율 수집 → fx_rates(patch114) upsert(하루·통화당 1행). 자산 평가(회계 잔액 화면)용.
//   · KRW: .env.local 에 KOREAEXIM_API_KEY 가 있으면 한국수출입은행 Open API 매매기준율 자동 조회(lib/fx.ts). 없으면 건너뜀.
//   · HNL: BCH 기준환율은 공식 API 가 없어 Claude 예약 작업(fx-rates-daily)이 웹검색으로 찾아 인자로 넘긴다.
//          --hnl <기준율> [--hnl-sell <매도>] [--hnl-date YYYY-MM-DD] [--hnl-url <출처 URL>]
//   · 수동: --krw <기준율> [--krw-date YYYY-MM-DD]  (API 키 발급 전·장애 시) → source='manual'
// 사용:  npx tsx scripts/fx-collect.ts                                  (KRW 자동만)
//        npx tsx scripts/fx-collect.ts --hnl 26.8829 --hnl-sell 27.0173 --hnl-date 2026-10-15 --hnl-url https://…
//        npx tsx scripts/fx-collect.ts --krw 1395.5 --dry-run
// ⚠ repo 루트에서 실행.
import { loadEnv, createServiceClient, isDate } from './_shared'
import { closeMonth, fetchKrwExim, FX_CLOSE_FROM, prevYm, type FxRate } from '../lib/fx'

const HN_TZ = 'America/Tegucigalpa'

function arg(name: string): string | null {
  const i = process.argv.indexOf(name)
  return i >= 0 ? (process.argv[i + 1] ?? null) : null
}
function numArg(name: string): number | null {
  const v = arg(name)
  if (v == null) return null
  const n = Number(v.replace(/,/g, ''))
  if (!Number.isFinite(n) || n <= 0) {
    console.error(`${name} 값이 올바르지 않습니다: ${v}`)
    process.exit(1)
  }
  return n
}
function dateArg(name: string, fallback: string): string {
  const v = arg(name)
  if (v == null) return fallback
  if (!isDate(v)) {
    console.error(`${name} 는 YYYY-MM-DD 형식이어야 합니다: ${v}`)
    process.exit(1)
  }
  return v
}

async function main() {
  const env = loadEnv()
  const dry = process.argv.includes('--dry-run')
  const todayHn = new Date().toLocaleDateString('en-CA', { timeZone: HN_TZ })
  const rows: FxRate[] = []
  const notes: string[] = []

  // HNL(BCH, 인자)
  const hnl = numArg('--hnl')
  if (hnl != null) {
    if (hnl < 15 || hnl > 60) {
      console.error(`HNL 기준율 범위 이상(15~60 기대): ${hnl}`)
      process.exit(1)
    }
    rows.push({
      rate_date: dateArg('--hnl-date', todayHn),
      currency: 'HNL',
      rate: hnl,
      buy: hnl,
      sell: numArg('--hnl-sell'),
      source: 'bch',
      source_url: arg('--hnl-url'),
    })
  }

  // KRW(수동 인자 우선, 없으면 API)
  const krwManual = numArg('--krw')
  if (krwManual != null) {
    rows.push({ rate_date: dateArg('--krw-date', todayHn), currency: 'KRW', rate: krwManual, buy: null, sell: null, source: 'manual', source_url: null })
  } else if (env.KOREAEXIM_API_KEY) {
    const r = await fetchKrwExim(env.KOREAEXIM_API_KEY)
    if (r.ok) {
      if (r.fx.rate < 800 || r.fx.rate > 2500) notes.push(`KRW 범위 이상(800~2500 기대): ${r.fx.rate} — 저장 안 함`)
      else rows.push(r.fx)
    } else notes.push(`KRW 실패: ${r.error}`)
  } else notes.push('KRW 건너뜀: KOREAEXIM_API_KEY 없음(.env.local)')

  for (const r of rows) console.log(`${r.currency} ${r.rate_date} 기준 ${r.rate}${r.sell ? ` (매도 ${r.sell})` : ''} · ${r.source}`)
  for (const n of notes) console.log(n)
  if (dry) {
    console.log('(dry-run — 저장 안 함)')
    return
  }

  const sb = createServiceClient(env)
  if (rows.length === 0) console.log('저장할 환율 없음')
  else {
    const { error } = await sb
      .from('fx_rates')
      .upsert(rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })), { onConflict: 'rate_date,currency' })
    if (error) {
      console.error('저장 실패:', error.message)
      process.exit(1)
    }
    console.log(`저장 ${rows.length}건`)
  }

  // 지난달 마감 환율 자동 고정 — 3일 이후(월말 공시가 늦게 잡히는 HNL 여유), 이미 고정된 통화는 건너뜀.
  const lastYm = prevYm(todayHn.slice(0, 7))
  if (Number(todayHn.slice(8, 10)) >= 3 && lastYm >= FX_CLOSE_FROM) {
    const res = await closeMonth(sb, lastYm, { eximKey: env.KOREAEXIM_API_KEY })
    for (const r of res) if (r.status !== 'exists') console.log(`마감: ${r.message}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
