// MFH-ACCOUNTING-ITEMS-REORG-V1
// 지출 항목 재편(B안, 2026-10-15): 대분류 = 사역비/생활비, 항목 31개. 재실행 안전(이름 기준 조회 후 update/insert).
//   1) 기존 항목 in-place 개명·대분류 변경(id 유지 → 거래·상점사전 자동 승계)
//   2) 신규 항목 생성(사역비: 선물/접대·주유·차량유지·IT/구독 / 생활비: 자녀용품·구독)
//   3) 거래 분기 이관(식비·통신·문화/여가·행정/기타·주거·미용/의류·행사비·행사 → 구매처/적요 규칙)
//   4) 상점 사전(merchant_rules) 동일 규칙으로 교체 · 구 항목(식비·행사) 비활성 · sort_order 정리
// 사용: npx tsx scripts/accounting-items-reorg.ts --dry-run | (적용)
// ⚠ 선행: supabase/patch107-items-scope.sql (유일성 (구분,대분류,이름)) — 미적용이면 신규 '주유'·'차량유지' insert 가 실패한다.
import { loadEnv, createServiceClient } from './_shared'

const DRY = process.argv.includes('--dry-run')
const env = loadEnv()
const sb = createServiceClient(env)

type Item = { id: string; user_id: string; gubun: string; category: string | null; name: string; is_active: boolean; sort_order: number }
type Target = { cat: '사역비' | '생활비'; name: string; from?: string } // from = 기존 항목명(in-place)
const PLAN: Target[] = [
  { cat: '사역비', name: '행사비', from: '행사비' },
  { cat: '사역비', name: '선물/접대' },
  { cat: '사역비', name: '구제/지원', from: '사역자지원금' },
  { cat: '사역비', name: '건축', from: '건축' },
  { cat: '사역비', name: '시설보수', from: '시설보수' },
  { cat: '사역비', name: '기자재', from: '기자재 구매' },
  { cat: '사역비', name: '주유' },
  { cat: '사역비', name: '차량유지' },
  { cat: '사역비', name: '대회/세미나', from: '교육/훈련' },
  { cat: '사역비', name: '수수료', from: '수수료' },
  { cat: '사역비', name: 'IT/구독' },
  { cat: '사역비', name: '행정/기타', from: '행정/기타' },
  { cat: '생활비', name: '식료품', from: '부식' },
  { cat: '생활비', name: '외식/카페', from: '외식' },
  { cat: '생활비', name: '자녀 학비', from: '자녀학비' },
  { cat: '생활비', name: '자녀 학용품', from: '자녀학용품' },
  { cat: '생활비', name: '자녀 간식', from: '자녀간식' },
  { cat: '생활비', name: '자녀용품' },
  { cat: '생활비', name: '생활용품', from: '생활용품' },
  { cat: '생활비', name: '주거/공과금', from: '주거' },
  { cat: '생활비', name: '주유', from: '주유' },
  { cat: '생활비', name: '차량유지', from: '유지보수' },
  { cat: '생활비', name: '의료', from: '의료' },
  { cat: '생활비', name: '미용/의류', from: '미용/의류' },
  { cat: '생활비', name: '통신', from: '통신' },
  { cat: '생활비', name: '구독' },
  { cat: '생활비', name: '문화/여가', from: '문화/여가' },
  { cat: '생활비', name: '반려동물', from: '반려동물' },
  { cat: '생활비', name: '국민연금', from: '국민연금' },
  { cat: '생활비', name: '보험', from: '보험' },
  { cat: '생활비', name: '가정기타', from: '예비비' },
]
const RETIRE = ['식비', '행사'] // 거래 이관 후 비활성

// 거래·상점사전 분기 규칙: 구 항목명(이관 전 이름) → [검사 함수(구매처·적요), 대상(대분류/이름)] 순서대로 첫 일치. 없으면 그대로.
type Rule = { test: (vendor: string, name: string) => boolean; to: string }
const rx = (re: RegExp) => (v: string, n: string) => re.test(v) || re.test(n)
const SUB = /NETFLIX|SPOTIFY|YOUTUBE|DISNEY|APPLE\.COM|ICLOUD/i
const GROCERY = /PRICE SMART|SUPERMERCADO|COLONIA|LOS ANDES|WALMART|SUPER KOREA|GOLDEN PIG|LA ANTORCHA|PULPERIA/i
const IT = /SUPABASE|IDEOGRAM|DAVINCI|PERSONALITYHUB|OPENAI|ANTHROPIC|CLAUDE|GOOGLE|VERCEL|NOTION|ADOBE|CANVA|MICROSOFT|GITHUB/i
const SPLIT: Record<string, Rule[]> = {
  식비: [{ test: rx(GROCERY), to: '생활비/식료품' }, { test: () => true, to: '생활비/외식/카페' }],
  행사: [{ test: () => true, to: '사역비/행사비' }],
  행사비: [{ test: rx(/선물/), to: '사역비/선물/접대' }],
  통신: [{ test: rx(SUB), to: '생활비/구독' }],
  '문화/여가': [{ test: rx(SUB), to: '생활비/구독' }, { test: rx(/생일|선물/), to: '생활비/자녀용품' }],
  '행정/기타': [{ test: rx(IT), to: '사역비/IT/구독' }],
  주거: [{ test: () => true, to: '생활비/생활용품' }],
  '미용/의류': [{ test: rx(/애들옷|아이들 옷|자녀 옷|아이 옷/), to: '생활비/자녀용품' }],
}

async function main() {
  console.log(DRY ? '— DRY RUN (저장 없음) —' : '— 적용 —')
  const { data: raw, error } = await sb.from('acct_items').select('id,user_id,gubun,category,name,is_active,sort_order').eq('gubun', '지출')
  if (error) throw error
  const items = (raw ?? []) as Item[]
  const userId = items[0].user_id
  const byOld = new Map(items.map((i) => [i.name, i])) // 이관 전 이름 → 항목
  const done = new Set(items.filter((i) => i.category === '사역비' || i.category === '생활비').map((i) => `${i.category}/${i.name}`))
  const idOf = new Map<string, string>() // '대분류/이름' → id
  for (const i of items) if (i.category === '사역비' || i.category === '생활비') idOf.set(`${i.category}/${i.name}`, i.id)

  // 1) in-place 개명 · 2) 신규
  for (const [idx, t] of PLAN.entries()) {
    const key = `${t.cat}/${t.name}`
    const sort = idx + 1
    if (done.has(key)) {
      const cur = items.find((i) => i.category === t.cat && i.name === t.name)!
      if (cur.sort_order !== sort || !cur.is_active) {
        console.log(`[1] 정리: ${key} (sort ${cur.sort_order}→${sort}, active)`)
        if (!DRY) await sb.from('acct_items').update({ sort_order: sort, is_active: true }).eq('id', cur.id)
      }
      continue
    }
    const src = t.from ? byOld.get(t.from) : undefined
    if (src && src.category !== '사역비' && src.category !== '생활비') {
      console.log(`[1] 개명: [${src.category}] ${src.name} → [${t.cat}] ${t.name}`)
      if (!DRY) {
        const { error: e } = await sb.from('acct_items').update({ category: t.cat, name: t.name, sort_order: sort, is_active: true }).eq('id', src.id)
        if (e) throw e
      }
      idOf.set(key, src.id)
    } else {
      console.log(`[2] 신규: [${t.cat}] ${t.name}`)
      if (!DRY) {
        const { data, error: e } = await sb.from('acct_items').insert({ user_id: userId, gubun: '지출', category: t.cat, name: t.name, sort_order: sort }).select('id').single()
        if (e) throw e
        idOf.set(key, data.id)
      } else idOf.set(key, `<${key}>`)
    }
  }

  // 3) 거래 분기 이관
  const { data: tx } = await sb.from('acct_inout').select('id,item_id,vendor,name').eq('gubun', '지출')
  const { data: rules } = await sb.from('merchant_rules').select('id,merchant,item_id,vendor')
  const moves: Record<string, number> = {}
  for (const [oldName, ruleList] of Object.entries(SPLIT)) {
    const src = byOld.get(oldName)
    if (!src) continue
    for (const t of (tx ?? []).filter((r) => r.item_id === src.id)) {
      const hit = ruleList.find((r) => r.test(t.vendor ?? '', t.name ?? ''))
      if (!hit) continue
      const key = `${oldName} → ${hit.to}`
      moves[key] = (moves[key] ?? 0) + 1
      if (!DRY) { const { error: e } = await sb.from('acct_inout').update({ item_id: idOf.get(hit.to) }).eq('id', t.id); if (e) throw e }
    }
    // 4) 상점 사전
    for (const r of (rules ?? []).filter((r) => r.item_id === src.id)) {
      const hit = ruleList.find((x) => x.test(r.merchant ?? '', r.vendor ?? ''))
      if (!hit) continue
      const key = `사전 ${oldName} → ${hit.to}`
      moves[key] = (moves[key] ?? 0) + 1
      if (!DRY) { const { error: e } = await sb.from('merchant_rules').update({ item_id: idOf.get(hit.to) }).eq('id', r.id); if (e) throw e }
    }
  }
  for (const [k, v] of Object.entries(moves)) console.log(`[3] ${k}: ${v}건`)

  // 구 항목 비활성(남은 거래가 없을 때만)
  for (const name of RETIRE) {
    const it = byOld.get(name)
    if (!it) continue
    const left = (tx ?? []).filter((r) => r.item_id === it.id).length - Object.entries(moves).filter(([k]) => k.startsWith(`${name} →`)).reduce((s, [, v]) => s + v, 0)
    if (left > 0) { console.log(`[4] 비활성 보류(거래 ${left}건 남음): ${name}`); continue }
    if (!it.is_active) continue
    console.log(`[4] 비활성: [${it.category}] ${name}`)
    if (!DRY) await sb.from('acct_items').update({ is_active: false, sort_order: 900 }).eq('id', it.id)
  }
  // 남은 구 대분류 항목 점검
  const { data: after } = await sb.from('acct_items').select('category,name,is_active').eq('gubun', '지출').eq('is_active', true)
  const stray = (after ?? []).filter((i) => i.category !== '사역비' && i.category !== '생활비')
  if (stray.length) console.log('[!] 아직 구 대분류인 활성 항목:', stray.map((i) => `${i.category}/${i.name}`).join(', '))
  console.log(DRY ? '— 드라이런 끝 —' : '— 적용 완료 —')
}
main().catch((e) => { console.error(e); process.exit(1) })
