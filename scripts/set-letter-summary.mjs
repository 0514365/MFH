// MFH-SET-LETTER-SUMMARY-V1
// 선교편지 발행 마지막 단계: letters.summary 를 확인·입력한다 (import_letters.py 는 summary 를 넣지 않음).
// 사용:
//   node scripts/set-letter-summary.mjs --list                       (최근 편지 number/year_month/public_view/summary 유무)
//   node scripts/set-letter-summary.mjs --get 2608                   (해당 호 summary 출력)
//   node scripts/set-letter-summary.mjs --set 2608 <summary.txt>     (파일 내용을 summary 로 저장 · 우진 확정 텍스트만)
// 키는 .env.local 의 SUPABASE_SERVICE_ROLE_KEY 를 읽는다(코드에 키 없음). RLS 우회이므로 우진 지시가 있을 때만 --set 실행.
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
const cols = 'id,number,title,year_month,sort_order,public_view,summary,created_at'

if (mode === '--list') {
  const { data, error } = await sb
    .from('letters')
    .select(cols)
    .order('year_month', { ascending: false })
    .order('sort_order', { ascending: true })
    .limit(6)
  if (error) throw error
  for (const r of data)
    console.log(
      `${r.year_month} #${r.number} sort=${r.sort_order} public=${r.public_view} summary=${r.summary ? r.summary.length + '자' : '없음'}  ${r.title}  (${r.id})`,
    )
} else if (mode === '--get' && number) {
  const { data, error } = await sb.from('letters').select(cols).eq('number', number)
  if (error) throw error
  for (const r of data) {
    console.log(`${r.year_month} #${r.number} public=${r.public_view} created=${r.created_at ?? '-'} (${r.id})`)
    console.log(r.summary ?? '(summary 없음)')
  }
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
  console.log('사용: --list | --get <number> | --set <number> <summary.txt>')
  process.exit(1)
}
