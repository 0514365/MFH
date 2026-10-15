// MFH-ACCOUNTING-REBASELINE-V1
// 2026-10-14 자산 재정립(1회성) — 실제 잔액 기준으로 장부를 다시 맞춘다. 재실행 안전(존재 확인 후 insert · adjust 는 절대값 재계산).
//   1) 우리은행 → '우리은행(선교)_4757' 명칭 변경
//   2) 계좌 신설 '우리은행(개인)_6154' · '우리은행(청약)_6537' (KRW)
//   3) 항목 신설 지출/생활/국민연금
//   4) 거래: 개인→청약 이체 20,000 × 3(8·9·10월 10일) · 개인 국민연금 96,000 × 3 · Ficohsa(달러)→카드 상환 이체(10/14)
//   5) adjust_usd 재계산: Ficohsa(달러)=11,531.68 · 카드 ~10/13 잔액 0 · 우리은행 3계좌 실제 원화 잔액
//   7) sort_order 정리: 신용카드 → Ficohsa 달러 → 현금(렘피라·달러) → 우리은행(선교·개인·청약·달러)
//   6) 명칭 정리: Ficohsa(달러)→Ficohsa(달러)_4484 · Ficohsa(렘피라)→현금(렘피라) · 우리은행 달러계좌→우리은행(달러)_9180 · 현금(달러) 신설
// 사용: npx tsx scripts/accounting-rebaseline.ts --dry-run   (리포트만)
//       npx tsx scripts/accounting-rebaseline.ts             (적용)
import { loadEnv, createServiceClient } from './_shared'

const DRY = process.argv.includes('--dry-run')
const env = loadEnv()
const sb = createServiceClient(env)
const r2 = (n: number) => Math.round(n * 100) / 100
const num = (v: unknown) => Number(v ?? 0)

const KRW_RATE = 1350
const HNL_RATE = 26.5
const BASE_DATE = '2026-10-13' // 카드: 이 날짜까지 청구분 상환 완료
const PAY_DATE = '2026-10-14'
const PAY_HNL_TOTAL = 112887.47
const PAY_USD = 151.79
const TARGET = {
  'Ficohsa(달러)': 11531.68,
  '우리은행(선교)_4757': r2(3595443 / KRW_RATE),
  '우리은행(개인)_6154': r2(229487 / KRW_RATE),
  '우리은행(청약)_6537': r2(60000 / KRW_RATE),
} as const

type Acc = { id: string; user_id: string; name: string; currency: string; adjust_usd: number; initial_usd: number }
type Tx = { gubun: string; date: string; account_id: string | null; to_account_id: string | null; amount_usd: number; currency: string; principal: number; name: string }

async function main() {
  console.log(DRY ? '— DRY RUN (저장 없음) —' : '— 적용 —')
  const { data: accRaw, error: e1 } = await sb.from('acct_accounts').select('id,user_id,name,currency,adjust_usd,initial_usd').order('sort_order')
  if (e1) throw e1
  let acc = (accRaw ?? []) as Acc[]
  const userId = acc[0].user_id

  // 1) 명칭 변경
  const woori = acc.find((a) => a.name === '우리은행')
  if (woori) {
    console.log(`[1] 계좌 명칭 변경: 우리은행 → 우리은행(선교)_4757`)
    if (!DRY) await sb.from('acct_accounts').update({ name: '우리은행(선교)_4757', info: '4757 · 선교(후원 입금)' }).eq('id', woori.id)
  } else console.log('[1] 우리은행 이미 변경됨(건너뜀)')

  // 2) 계좌 신설
  for (const [name, info, sort] of [
    ['우리은행(개인)_6154', '6154 · 개인(국민연금·청약 자동이체)', 3],
    ['우리은행(청약)_6537', '6537 · 청약저축(매월 10일 개인에서 20,000원)', 4],
  ] as const) {
    if (acc.some((a) => a.name === name)) { console.log(`[2] 계좌 있음(건너뜀): ${name}`); continue }
    console.log(`[2] 계좌 신설: ${name} (KRW)`)
    if (!DRY) {
      const { error } = await sb.from('acct_accounts').insert({ user_id: userId, name, currency: 'KRW', info, kind: '현금', sort_order: sort })
      if (error) throw error
    }
  }
  if (!DRY) acc = ((await sb.from('acct_accounts').select('id,user_id,name,currency,adjust_usd,initial_usd')).data ?? []) as Acc[]
  const idOf = (name: string) => acc.find((a) => a.name === name)?.id ?? (DRY ? `<${name}>` : (() => { throw new Error(`계좌 없음: ${name}`) })())

  // 3) 항목 신설
  const { data: items } = await sb.from('acct_items').select('id,gubun,name').eq('gubun', '지출').eq('name', '국민연금')
  let pensionItem = items?.[0]?.id as string | undefined
  if (pensionItem) console.log('[3] 항목 있음(건너뜀): 지출/국민연금')
  else {
    console.log('[3] 항목 신설: 지출 / 생활 / 국민연금')
    if (!DRY) {
      const { data, error } = await sb.from('acct_items').insert({ user_id: userId, gubun: '지출', name: '국민연금', category: '생활', sort_order: 99 }).select('id').single()
      if (error) throw error
      pensionItem = data.id
    } else pensionItem = '<국민연금>'
  }

  // 4) 거래
  const { data: txRaw } = await sb.from('acct_inout').select('gubun,date,account_id,to_account_id,amount_usd,currency,principal,name')
  const tx = (txRaw ?? []) as Tx[]
  const pid = idOf('우리은행(개인)_6154'), cid = idOf('우리은행(청약)_6537')
  const usdId = idOf(acc.some((a) => a.name === 'Ficohsa(달러)') ? 'Ficohsa(달러)' : 'Ficohsa(달러)_4484'), c4956 = idOf('Ficohsa 신용카드 4956'), c7697 = idOf('Ficohsa 신용카드 7697')

  // 카드 ~10/13 HNL 청구 비율로 상환액 분할
  const hnlThru = (cardId: string) => tx.filter((t) => t.gubun === '지출' && t.account_id === cardId && t.currency === 'HNL' && t.date <= BASE_DATE).reduce((s, t) => s + num(t.principal), 0)
  const h4956 = hnlThru(c4956), h7697 = hnlThru(c7697)
  const pay4956 = r2((PAY_HNL_TOTAL * h4956) / (h4956 + h7697)), pay7697 = r2(PAY_HNL_TOTAL - pay4956)
  console.log(`    카드 ~${BASE_DATE} HNL 청구: 4956=${h4956.toFixed(2)} · 7697=${h7697.toFixed(2)} → 상환 분할 4956=${pay4956} · 7697=${pay7697} (+USD ${PAY_USD} → 4956)`)

  type NewTx = { gubun: string; date: string; item_id: string | null; name: string; currency: string; principal: number; rate: number; account_id: string; to_account_id: string | null }
  const mk = (gubun: string, date: string, name: string, currency: string, principal: number, rate: number, account_id: string, to_account_id: string | null, item_id: string | null): NewTx => ({ gubun, date, name, currency, principal, rate, account_id, to_account_id, item_id })
  const planned: NewTx[] = []
  for (const d of ['2026-08-10', '2026-09-10', '2026-10-10']) {
    planned.push(mk('이체', d, '청약저축 자동이체', 'KRW', 20000, KRW_RATE, pid, cid, null))
    planned.push(mk('지출', d, '국민연금', 'KRW', 96000, KRW_RATE, pid, null, pensionItem!))
  }
  planned.push(mk('이체', PAY_DATE, '10월 카드대금 상환(~10/13)', 'HNL', pay4956, HNL_RATE, usdId, c4956, null))
  planned.push(mk('이체', PAY_DATE, '10월 카드대금 상환(~10/13, USD)', 'USD', PAY_USD, 1, usdId, c4956, null))
  planned.push(mk('이체', PAY_DATE, '10월 카드대금 상환(~10/13)', 'HNL', pay7697, HNL_RATE, usdId, c7697, null))

  const added: Tx[] = []
  for (const p of planned) {
    const dup = tx.some((t) => t.gubun === p.gubun && t.date === p.date && t.name === p.name && t.account_id === p.account_id && num(t.principal) === p.principal)
    const amount_usd = r2(p.principal / p.rate)
    const line = `${p.gubun} ${p.date} ${p.name} ${p.currency} ${p.principal.toLocaleString()} @${p.rate} = $${amount_usd}`
    if (dup) { console.log(`[4] 있음(건너뜀): ${line}`); continue }
    console.log(`[4] 추가: ${line}`)
    if (!DRY) {
      const { error } = await sb.from('acct_inout').insert({ user_id: userId, ...p, amount_usd, vendor: null, source: 'manual' })
      if (error) throw error
    }
    added.push({ ...p, amount_usd })
  }
  const all = [...tx, ...added]

  // 5) adjust_usd — 목표 잔액에 맞춰 절대값 재계산
  const flow = (accountId: string, upTo?: string) => {
    let s = 0
    for (const t of all) {
      if (upTo && t.date > upTo && t.gubun !== '이체') continue // 기준일 이후 결제분만 미상환으로 남김(상환 이체는 포함)
      const a = num(t.amount_usd)
      if (t.gubun === '수입' && t.account_id === accountId) s += a
      else if (t.gubun === '지출' && t.account_id === accountId) s -= a
      else if (t.gubun === '이체') { if (t.account_id === accountId) s -= a; if (t.to_account_id === accountId) s += a }
    }
    return s
  }
  const setAdjust = async (name: string, target: number, upTo?: string) => {
    const a = acc.find((x) => x.name === name)
    if (!a) { console.log(`[5] 계좌 없음(드라이런 신설분): ${name} → 목표 $${target}`); return }
    const adjust = r2(target - num(a.initial_usd) - flow(a.id, upTo))
    const before = r2(num(a.initial_usd) + num(a.adjust_usd) + flow(a.id))
    const after = r2(num(a.initial_usd) + adjust + flow(a.id))
    console.log(`[5] ${name}: adjust ${num(a.adjust_usd)} → ${adjust}  (잔액 $${before} → $${after}${upTo ? `, ~${upTo} 기준 $${target}` : ''})`)
    if (!DRY) { const { error } = await sb.from('acct_accounts').update({ adjust_usd: adjust }).eq('id', a.id); if (error) throw error }
  }
  await setAdjust(acc.some((a) => a.name === 'Ficohsa(달러)') ? 'Ficohsa(달러)' : 'Ficohsa(달러)_4484', TARGET['Ficohsa(달러)'])
  await setAdjust('Ficohsa 신용카드 4956', 0, BASE_DATE)
  await setAdjust('Ficohsa 신용카드 7697', 0, BASE_DATE)
  await setAdjust(DRY && woori ? '우리은행' : '우리은행(선교)_4757', TARGET['우리은행(선교)_4757'])
  await setAdjust('우리은행(개인)_6154', TARGET['우리은행(개인)_6154'])
  await setAdjust('우리은행(청약)_6537', TARGET['우리은행(청약)_6537'])
  // 6) 명칭 정리 + 현금(달러) 신설
  for (const [from, to, info] of [
    ['Ficohsa(달러)', 'Ficohsa(달러)_4484', '4484 · 직불카드 3070'],
    ['Ficohsa(렘피라)', '현금(렘피라)', '현금 보유(렘피라)'],
    ['우리은행 달러계좌', '우리은행(달러)_9180', '9180 · 달러 외화계좌'],
  ] as const) {
    const a = acc.find((x) => x.name === from)
    if (!a) { console.log(`[6] 없음(건너뜀): ${from}`); continue }
    console.log(`[6] 계좌 명칭 변경: ${from} → ${to}`)
    if (!DRY) { const { error } = await sb.from('acct_accounts').update({ name: to, info }).eq('id', a.id); if (error) throw error }
  }
  if (acc.some((a) => a.name === '현금(달러)')) console.log('[6] 계좌 있음(건너뜀): 현금(달러)')
  else {
    console.log('[6] 계좌 신설: 현금(달러) (USD)')
    if (!DRY) { const { error } = await sb.from('acct_accounts').insert({ user_id: userId, name: '현금(달러)', currency: 'USD', info: '현금 보유(달러)', kind: '현금', sort_order: 5 }); if (error) throw error }
  }
  // 7) 표시 순서
  // 2026-10-14 우진 지정: 신용카드 → Ficohsa 달러 → 현금(렘피라·달러) → 우리은행(선교·개인·청약·달러)
  const ORDER = ['Ficohsa 신용카드 4956', 'Ficohsa 신용카드 7697', 'Ficohsa(달러)_4484', '현금(렘피라)', '현금(달러)', '우리은행(선교)_4757', '우리은행(개인)_6154', '우리은행(청약)_6537', '우리은행(달러)_9180']
  const cur = ((await sb.from('acct_accounts').select('id,name,sort_order')).data ?? []) as { id: string; name: string; sort_order: number }[]
  for (const [i, name] of ORDER.entries()) {
    const a = cur.find((x) => x.name === name)
    if (!a) { console.log(`[7] 없음(건너뜀): ${name}`); continue }
    if (a.sort_order === i + 1) continue
    console.log(`[7] 순서: ${name} ${a.sort_order} → ${i + 1}`)
    if (!DRY) { const { error } = await sb.from('acct_accounts').update({ sort_order: i + 1 }).eq('id', a.id); if (error) throw error }
  }
  console.log(DRY ? '— 드라이런 끝 —' : '— 적용 완료 —')
}
main().catch((e) => { console.error(e); process.exit(1) })
