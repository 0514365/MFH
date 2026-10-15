// MFH-ACCOUNTING-SEED-ESCROW-V1
// 2026-10-15: 조원규 장로 $20,000(2026-03-01 수입)이 시드선교회 임시계좌에 예치되어 있음 → 자산에 포함.
//   1) 계좌 '시드선교회 임시계좌(예치)'(USD) 신설(맨 뒤)
//   2) 3/1 조원규 수입 행의 입금계좌 → 예치 계좌
//   3) Ficohsa(달러)_4484 의 10/14 조정 거래 +20,000 (실잔액 $11,531.68 유지)
// 멱등: 계좌 존재·행 계좌·조정 반영 여부를 확인하고 건너뜀. 사용: --dry-run | (적용)
import { loadEnv, createServiceClient } from './_shared'

const DRY = process.argv.includes('--dry-run')
const env = loadEnv()
const sb = createServiceClient(env)
const r2 = (n: number) => Math.round(n * 100) / 100
const num = (v: unknown) => Number(v ?? 0)
const ESCROW = '시드선교회 임시계좌(예치)'
const ADJ_NAME = '2026-10-14 자산 재정립 (실잔액 기준 조정)'

async function main() {
  console.log(DRY ? '— DRY RUN —' : '— 적용 —')
  const { data: acc } = await sb.from('acct_accounts').select('id,user_id,name,sort_order')
  const userId = acc![0].user_id
  const fico = acc!.find((a) => a.name === 'Ficohsa(달러)_4484')
  if (!fico) throw new Error('Ficohsa(달러)_4484 없음')
  let escrowId = acc!.find((a) => a.name === ESCROW)?.id
  if (escrowId) console.log(`[1] 계좌 있음: ${ESCROW}`)
  else {
    const maxSort = Math.max(0, ...acc!.map((a) => num(a.sort_order)))
    console.log(`[1] 계좌 신설: ${ESCROW} (USD, sort ${maxSort + 1})`)
    if (!DRY) {
      const { data, error } = await sb.from('acct_accounts').insert({ user_id: userId, name: ESCROW, currency: 'USD', info: '조원규 장로 헌금 $20,000 시드선교회 보관 · 수령 시 이체, 시드 직접 집행 시 지출', kind: '현금', sort_order: maxSort + 1 }).select('id').single()
      if (error) throw error
      escrowId = data.id
    } else escrowId = '<escrow>'
  }
  const { data: rows } = await sb.from('acct_inout').select('id,date,name,account_id,amount_usd').eq('gubun', '수입').eq('date', '2026-03-01').ilike('name', '%조원규%')
  if (!rows || rows.length !== 1) throw new Error('3/1 조원규 수입 행 조회 실패: ' + JSON.stringify(rows))
  const row = rows[0]
  if (row.account_id === escrowId) console.log('[2] 이미 예치 계좌:', row.name, row.amount_usd)
  else {
    console.log(`[2] 입금계좌 변경: ${row.name} $${row.amount_usd} → ${ESCROW}`)
    if (!DRY) { const { error } = await sb.from('acct_inout').update({ account_id: escrowId }).eq('id', row.id); if (error) throw error }
    const { data: adj } = await sb.from('acct_inout').select('id,amount_usd,principal').eq('gubun', '조정').eq('account_id', fico.id).eq('name', ADJ_NAME).single()
    if (!adj) throw new Error('Ficohsa 조정 거래 없음')
    const nv = r2(num(adj.amount_usd) + num(row.amount_usd))
    console.log(`[3] Ficohsa(달러)_4484 조정: $${num(adj.amount_usd)} → $${nv}`)
    if (!DRY) { const { error } = await sb.from('acct_inout').update({ amount_usd: nv, principal: nv }).eq('id', adj.id); if (error) throw error }
  }
  console.log(DRY ? '— 드라이런 끝 —' : '— 적용 완료 —')
}
main().catch((e) => { console.error(e); process.exit(1) })
