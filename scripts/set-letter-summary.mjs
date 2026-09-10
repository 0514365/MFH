// MFH-SET-LETTER-SUMMARY-V2
// 선교편지 발행 마지막 단계: letters.summary 와 period_end(자료 기준 기간 종료일)를 확인·입력한다 (import_letters.py 는 넣지 않음).
// V2: --period 추가 — 다음 호 편지 방향(letter 인사이트, insight-pull V3)이 "이 날짜 다음날부터" 를 분석하는 기준점.
// 사용:
//   node scripts/set-letter-summary.mjs --list                       (최근 편지 number/year_month/public_view/summary/period_end)
//   node scripts/set-letter-summary.mjs --get 2608                   (해당 호 summary·period_end 출력)
//   node scripts/set-letter-summary.mjs --set 2608 <summary.txt>     (파일 내용을 summary 로 저장 · 우진 확정 텍스트만)
//   node scripts/set-letter-summary.mjs --period 2608 2026-09-01     (자료 기준 기간 종료일 저장 · 컬럼은 supabase/letters-period-end.sql)
// 키는 .env.local 의 SUPABASE_SERVICE_ROLE_KEY 를 읽는다(코드에 키 없음). RLS 우회이므로 우진 지시가 있을 때만 --set/--period 실행.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    }),
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const [mode, number, file] = process.argv.slice(2)
const baseCols = 'id,number,title,year_month,sort_order,public_view,summary,created_at'
const PERIOD_HINT = 'letters.period_end 컬럼이 없습니다 — Supabase SQL Editor 에서 supabase/letters-period-end.sql 을 먼저 실행하세요.'

// period_end 컬럼이 아직 없을 수 있어 조회는 컬럼 포함 → 실패 시 컬럼 없이 재시도.
async function selectLetters(build) {
  const r1 = await build(sb.from('letters').select(`${baseCols},period_end`))
  if (!r1.error) return { rows: r1.data, hasPeriod: true }
  const r2 = await build(sb.from('letters').select(baseCols))
  if (r2.error) throw r2.error
  return { rows: r2.data.map((r) => ({ ...r, period_end: null })), hasPeriod: false }
}

if (mode === '--list') {
  const { rows, hasPeriod } = await selectLetters((q) =>
    q.order('year_month', { ascending: false }).order('sort_order', { ascending: true }).limit(6),
  )
  for (const r of rows)
    console.log(
      `${r.year_month} #${r.number} sort=${r.sort_order} public=${r.public_view} summary=${r.summary ? r.summary.length + '자' : '없음'} period_end=${r.period_end ?? '-'}  ${r.title}  (${r.id})`,
    )
  if (!hasPeriod) console.log(`⚠ ${PERIOD_HINT}`)
} else if (mode === '--get' && number) {
  const { rows, hasPeriod } = await selectLetters((q) => q.eq('number', number))
  for (const r of rows) {
    console.log(
      `${r.year_month} #${r.number} public=${r.public_view} period_end=${r.period_end ?? '-'} created=${r.created_at ?? '-'} (${r.id})`,
    )
    console.log(r.summary ?? '(summary 없음)')
  }
  if (!hasPeriod) console.log(`⚠ ${PERIOD_HINT}`)
} else if (mode === '--period' && number && file) {
  const periodEnd = file
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
    console.error('period_end 는 YYYY-MM-DD 형식이어야 합니다.')
    process.exit(1)
  }
  const { data, error } = await sb
    .from('letters')
    .update({ period_end: periodEnd })
    .eq('number', number)
    .select('id,number,year_month,period_end')
  if (error) {
    if (/period_end/.test(error.message)) {
      console.error(`✗ ${PERIOD_HINT}`)
      process.exit(1)
    }
    throw error
  }
  if (!data.length) {
    console.error(`number=${number} 편지가 없습니다.`)
    process.exit(1)
  }
  console.log(`[OK] period_end 저장 — #${number} (${data.map((d) => d.id).join(', ')}) · ${periodEnd} → 다음 호 letter 인사이트는 그 다음날부터 분석`)
} else if (mode === '--set' && number && file) {
  const summary = readFileSync(file, 'utf8').trim()
  const { data, error } = await sb.from('letters').update({ summary }).eq('number', number).select('id,number,year_month')
  if (error) throw error
  if (!data.length) {
    console.error(`number=${number} 편지가 없습니다.`)
    process.exit(1)
  }
  console.log(`[OK] summary 저장 — #${number} (${data.map((d) => d.id).join(', ')}) · ${summary.length}자`)
} else {
  console.log('사용: --list | --get <number> | --set <number> <summary.txt> | --period <number> <YYYY-MM-DD>')
  process.exit(1)
}
