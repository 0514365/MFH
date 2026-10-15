// MFH-ACCOUNTING-ADJUST-TO-ROWS-V1
// 계좌 adjust_usd(숨은 조정값) → 날짜 있는 '조정' 거래로 전환(2026-10-15, 1회성·멱등).
//   · adjust_usd ≠ 0 인 계좌마다 2026-10-14 자 조정 거래 1건 insert(amount_usd = adjust, 부호 유지) 후 adjust_usd = 0.
//   · 같은 이름의 조정 거래가 이미 있으면 건너뜀(재실행 안전).
//   · 부가: 10/04 프로젝터 지출(사역비/기자재 · 아마존 · USD 3,700 · Ficohsa(달러)_4484)을 넣되 총액 불변 —
//     Ficohsa(달러)_4484 조정액에 +3,700 (이미 10/14 실잔액에 반영된 지출이므로).
// 사용: npx tsx scripts/accounting-adjust-to-rows.ts --dry-run | (적용)   ⚠ 선행: supabase/patch108-adjust-gubun.sql
import { loadEnv, createServiceClient } from './_shared'

const DRY = process.argv.includes('--dry-run')
const env = loadEnv()
const sb = createServiceClient(env)
const r2 = (n: number) => Math.round(n * 100) / 100
const num = (v: unknown) => Number(v ?? 0)

const ADJ_DATE = '2026-10-14'
const ADJ_NAME = '2026-10-14 자산 재정립 (실잔액 기준 조정)'
const RATE: Record<string, number> = { USD: 1, KRW: 1350, HNL: 26.5 } // 조정액 현지통화 환산용(표시용)
const EXTRA = {
  account: 'Ficohsa(달러)_4484',
  expense: { gubun: '지출', date: '2026-10-04', name: '프로젝터 ViewSonic PX700HDH 1080p Projector', vendor: '아마존', currency: 'USD', principal: 3700, rate: 1, amount_usd: 3700, itemKey: '사역비/기자재' },
}

async function main() {
  console.log(DRY ? '— DRY RUN (저장 없음) —' : '— 적용 —')
  const { data: acc, error } = await sb.from('acct_accounts').select('id,user_id,name,currency,adjust_usd,card_last4')
  if (error) throw error
  const userId = acc![0].user_id
  const { data: existing } = await sb.from('acct_inout').select('id,gubun,date,name,account_id,amount_usd').in('gubun', ['조정', '지출'])
  const { data: item } = await sb.from('acct_items').select('id').eq('gubun', '지출').eq('category', '사역비').eq('name', '기자재').maybeSingle()
  if (!item) throw new Error('항목 사역비/기자재 없음')

  // 부가 지출(총액 불변): 중복 확인
  const extraAcc = acc!.find((a) => a.name === EXTRA.account)
  if (!extraAcc) throw new Error(`계좌 없음: ${EXTRA.account}`)
  const extraDup = (existing ?? []).some((t) => t.gubun === '지출' && t.date === EXTRA.expense.date && t.name === EXTRA.expense.name)
  let extraAdjust = 0
  if (extraDup) console.log(`[1] 있음(건너뜀): 지출 ${EXTRA.expense.date} ${EXTRA.expense.name}`)
  else {
    console.log(`[1] 추가: 지출 ${EXTRA.expense.date} ${EXTRA.expense.name} · ${EXTRA.expense.vendor} · $${EXTRA.expense.principal} · ${EXTRA.account} (조정 +${EXTRA.expense.amount_usd} 로 총액 불변)`)
    if (!DRY) {
      const { itemKey, ...row } = EXTRA.expense
      void itemKey
      const { error: e } = await sb.from('acct_inout').insert({ user_id: userId, ...row, item_id: item.id, account_id: extraAcc.id, to_account_id: null, source: 'manual' })
      if (e) throw e
    }
    extraAdjust = EXTRA.expense.amount_usd
  }

  // adjust_usd → 조정 거래
  for (const a of acc!) {
    const adj = r2(num(a.adjust_usd) + (a.id === extraAcc.id ? extraAdjust : 0))
    const has = (existing ?? []).find((t) => t.gubun === '조정' && t.account_id === a.id && t.name === ADJ_NAME)
    if (has) {
      // 이미 전환됨 — 부가 지출분만 조정액에 더함
      if (extraAdjust && a.id === extraAcc.id) {
        const nv = r2(num(has.amount_usd) + extraAdjust)
        console.log(`[2] 조정 갱신: ${a.name} $${num(has.amount_usd)} → $${nv}`)
        if (!DRY) { const { error: e } = await sb.from('acct_inout').update({ amount_usd: nv, principal: nv }).eq('id', has.id); if (e) throw e }
      } else console.log(`[2] 있음(건너뜀): ${a.name}`)
      continue
    }
    if (!adj) { console.log(`[2] 조정 없음: ${a.name}`); continue }
    const rate = RATE[a.currency] ?? 1
    const principal = a.currency === 'KRW' ? Math.round(adj * rate) : r2(adj * rate)
    console.log(`[2] 조정 거래: ${a.name} ${ADJ_DATE} ${a.currency} ${principal.toLocaleString()} @${rate} = $${adj} (adjust_usd ${num(a.adjust_usd)} → 0)`)
    if (!DRY) {
      const { error: e } = await sb.from('acct_inout').insert({ user_id: userId, gubun: '조정', date: ADJ_DATE, item_id: null, name: ADJ_NAME, vendor: null, currency: a.currency, principal, rate, amount_usd: adj, account_id: a.id, to_account_id: null, source: 'manual' })
      if (e) throw e
      const { error: e2 } = await sb.from('acct_accounts').update({ adjust_usd: 0 }).eq('id', a.id)
      if (e2) throw e2
    }
  }
  console.log(DRY ? '— 드라이런 끝 —' : '— 적용 완료 —')
}
main().catch((e) => { console.error(e); process.exit(1) })
