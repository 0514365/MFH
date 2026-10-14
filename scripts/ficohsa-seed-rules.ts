// MFH-FICOHSA-SEED-RULES-V1
// 상점 사전(merchant_rules) 초기 시드 — 2026-09~10 Ficohsa 문자에 등장한 상점을 항목 이름으로 1회 매핑.
//   · 이미 있는 상점은 건너뜀(사용자가 승인하며 학습한 값을 덮지 않음). hit_count 0 = 시드 표시.
//   · 애매한 상점(철물점·백화점·케이터링 등)은 넣지 않는다 → 인박스에서 '새 상점'으로 표시돼 우진이 지정.
// 사용: npx tsx scripts/ficohsa-seed-rules.ts   (repo 루트, patch103 적용 후)
import { loadEnv, createServiceClient, requireUserId } from './_shared'

// 항목 이름 → 상점명(문자 원문, 공백 1칸·대문자 정규화 기준)
const SEED: Record<string, string[]> = {
  식비: [
    'PRICE SMART SPS', 'SUPERMERCADOS LA', 'SUPERMERCADO LA', 'SUPERMERCADO COL', 'WALMART BOULEVAR',
    'COMISARIATO LOS', 'SUPER KOREA', 'PULPERIA CLARISS', 'DUNKIN DONUTS DD', 'KFC 10', 'RESTAURANTE KFC',
    'THE GOLDEN PIG C', 'DENNYS 2', 'DENNYS 3', 'TACO INN', 'STARBUCKS TOWNCE', 'POPEYES CASTANOS',
    'OKI POKI 2', 'MCDONALDS EL PED', 'LITTLE CAESARS L', 'LA MURALLA CHINA', 'GRANSORBETO PLAZ',
    'ESPRESSO A CURN', 'ESPRESSO A AUTOS', 'ESPRESSO A ALTAR', 'DUCHESS COFFEE S', 'COBECA CAFETEO A',
    'CASTOR CAFE SPS', 'ASADOS MARLON',
  ],
  주유: [
    'TEXACO BUENOS AI', 'GASOLINERA LOS A', 'GASOLINERA TEXAC', 'GASOLINERA UNO E', 'ESTACION DE SERV',
    'UNO BERMEJO ANTO', 'UNO AVE. JUNIOR', 'TEXACO COFACER G', 'TEXACO CALPULES', 'HSTANLEY PETROL',
  ],
  의료: ['FARMACIA SIMAN L', 'FARMACIA SIMAN G', 'FARMACIA ABIGAIL', 'FAR. EMY SUPER L'],
  자녀학비: ['ESC. HAPPY DAYS', 'ESC BILINGUE HAP', 'UTILES DE HONDUR', 'ESCOLARES/VI'],
  통신: ['NETFLIX.COM', 'SPOTIFY'],
  '행정/기타': ['SUPABASE', 'IDEOGRAM AI', 'DAVINCI AI', 'OFFICE DEPOT', 'SER CARGO LOGIST'],
  유지보수: ['MATRICULA DE VEH'],
  '미용/의류': ['DON BARBERO'],
}

async function main() {
  const env = loadEnv()
  const sb = createServiceClient(env)
  const USER_ID = requireUserId(env)

  const { data: items, error } = await sb.from('acct_items').select('id, name').eq('gubun', '지출')
  if (error) throw new Error(error.message)
  const idOf = new Map((items ?? []).map((i) => [i.name, i.id] as const))

  const { data: existing } = await sb.from('merchant_rules').select('merchant')
  const have = new Set((existing ?? []).map((r) => r.merchant))

  const rows = []
  for (const [itemName, merchants] of Object.entries(SEED)) {
    const item_id = idOf.get(itemName)
    if (!item_id) {
      console.warn(`항목 '${itemName}' 없음 — 건너뜀`)
      continue
    }
    for (const m of merchants) {
      const merchant = m.replace(/\s+/g, ' ').trim().toUpperCase()
      if (have.has(merchant)) continue
      rows.push({ user_id: USER_ID, merchant, item_id, name: null, account_id: null, hit_count: 0 })
      have.add(merchant)
    }
  }
  if (!rows.length) {
    console.log('추가할 시드 없음(모두 존재).')
    return
  }
  const { error: e2 } = await sb.from('merchant_rules').insert(rows)
  if (e2) throw new Error(e2.message)
  console.log(`상점 사전 시드 ${rows.length}건 추가`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
