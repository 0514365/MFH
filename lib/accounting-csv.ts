// MFH-ACCOUNTING-CSV-V1
// 수입·지출 CSV 일괄 입력 — 붙여넣기/파일 텍스트를 파싱하고 노션 옵션(항목·계좌·후원자)에 매핑·검증.
// 순수 함수(클라이언트에서 사용) — 실제 노션 write 는 server action(bulkCreateInout) 이 담당.
import type { AcctOptions, InoutInput } from './notion'

// 한 줄을 구분자로 분해 — 따옴표("...")로 감싼 필드 안의 구분자·줄바꿈은 보존, "" 는 escape.
function splitLine(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQ = false
      } else cur += c
    } else if (c === '"') inQ = true
    else if (c === delim) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out
}

// 텍스트 → 2차원 셀. 구분자는 첫 줄에 탭이 있으면 탭(엑셀·시트 복사), 없으면 쉼표(CSV).
export function parseDelimited(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim() !== '')
  if (!lines.length) return []
  const delim = lines[0].includes('\t') ? '\t' : ','
  return lines.map((l) => splitLine(l, delim).map((c) => c.trim()))
}

// 컬럼 헤더 별칭 — 첫 줄에서 위치를 찾는다(순서 무관, 한·영 혼용 허용).
const HEADER_ALIAS: Record<string, string[]> = {
  gubun: ['구분', '유형', 'type'],
  date: ['날짜', '일자', 'date'],
  item: ['항목', '분류', '카테고리', 'item'],
  name: ['이름', '내용', '적요', '메모', 'name'],
  currency: ['통화', 'currency', 'cur'],
  principal: ['금액', '원금', '액수', 'amount'],
  rate: ['환율', 'rate', 'fx'],
  account: ['계좌', '통장', '입금계좌', '지불계좌', 'account'],
}

function findHeader(cells: string[]): Record<string, number> | null {
  const idx: Record<string, number> = {}
  const lower = cells.map((c) => c.toLowerCase())
  for (const [key, aliases] of Object.entries(HEADER_ALIAS)) {
    const i = lower.findIndex((c) => aliases.some((a) => a.toLowerCase() === c))
    if (i >= 0) idx[key] = i
  }
  // 최소 구분·날짜·항목·통화·금액이 있어야 헤더 행으로 인정.
  if (
    idx.gubun == null ||
    idx.date == null ||
    idx.item == null ||
    idx.currency == null ||
    idx.principal == null
  )
    return null
  return idx
}

const CUR_ALIAS: Record<string, 'KRW' | 'USD' | 'HNL'> = {
  krw: 'KRW',
  원: 'KRW',
  원화: 'KRW',
  won: 'KRW',
  usd: 'USD',
  달러: 'USD',
  dollar: 'USD',
  hnl: 'HNL',
  렘피라: 'HNL',
  lempira: 'HNL',
  l: 'HNL',
}
function normCurrency(s: string): 'KRW' | 'USD' | 'HNL' | null {
  const t = s.trim()
  return CUR_ALIAS[t.toLowerCase()] ?? null
}

// 'YYYY-MM-DD' / 'YYYY.M.D' / 'YYYY/M/D' → 'YYYY-MM-DD'.
function normDate(s: string): string | null {
  const m = s.trim().match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/)
  if (!m) return null
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}
function toNum(s: string): number {
  const n = Number(s.replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

export type MappedRow = {
  line: number // 데이터 줄번호(헤더 제외, 1-base)
  input: InoutInput | null // 유효행만 채워짐(저장 대상)
  display: {
    gubun: string
    date: string
    item: string
    name: string
    currency: string
    principal: string
    rate: string
    amountUsd: string
    account: string
  }
  errors: string[]
  ok: boolean
}

export type MappedResult = {
  rows: MappedRow[]
  validCount: number
  errorCount: number
  headerFound: boolean
}

// 텍스트(붙여넣기/파일) → 행별 매핑·검증 결과. 항목·계좌·후원자는 이름으로 노션 id 매칭.
export function mapCsvRows(text: string, options: AcctOptions): MappedResult {
  const grid = parseDelimited(text)
  if (grid.length < 2) return { rows: [], validCount: 0, errorCount: 0, headerFound: false }
  const idx = findHeader(grid[0])
  if (!idx) return { rows: [], validCount: 0, errorCount: 0, headerFound: false }

  const rows: MappedRow[] = []
  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r]
    const get = (k: string) => (idx[k] != null ? (cells[idx[k]] ?? '') : '')
    const errors: string[] = []

    const gubunRaw = get('gubun').trim()
    const gubun = gubunRaw === '수입' || gubunRaw === '지출' ? gubunRaw : null
    if (!gubun) errors.push(`구분 '${gubunRaw}' (수입/지출)`)

    const date = normDate(get('date'))
    if (!date) errors.push(`날짜 '${get('date')}'`)

    const itemName = get('item').trim()
    const item = gubun ? options.items[gubun].find((i) => i.name === itemName) : undefined
    if (gubun && !item) errors.push(`항목 '${itemName}' 없음`)

    const name = get('name').trim()

    const currency = normCurrency(get('currency'))
    if (!currency) errors.push(`통화 '${get('currency')}'`)

    const principal = toNum(get('principal'))
    if (!(principal > 0)) errors.push(`금액 '${get('principal')}'`)

    const usd = currency === 'USD'
    const rateRaw = get('rate')
    const rate = usd ? 1 : toNum(rateRaw)
    if (!usd && !(rate > 0)) errors.push(`환율 '${rateRaw}'`)
    const amountUsd = usd ? principal : rate > 0 ? Math.round((principal / rate) * 100) / 100 : 0

    // 계좌 — 이름 매칭, 비어 있으면 통화 기본계좌. 이름 있는데 매칭 실패는 오류.
    const accountRaw = get('account').trim()
    let accountId: string | null = null
    if (accountRaw) {
      const acc = options.accounts.find((a) => a.name === accountRaw)
      if (acc) accountId = acc.id
      else errors.push(`계좌 '${accountRaw}' 없음`)
    } else if (currency) {
      accountId = options.accounts.find((a) => a.currency === currency)?.id ?? null
    }
    const accountName = accountId
      ? (options.accounts.find((a) => a.id === accountId)?.name ?? '')
      : ''

    // 후원자 — 수입·후원 대분류이고 이름이 후원자명과 일치하면 자동 연결(선택).
    let supporterId: string | null = null
    if (gubun === '수입' && item?.category === '후원' && name) {
      supporterId = options.supporters.find((s) => s.name === name)?.id ?? null
    }

    const ok = errors.length === 0
    const input: InoutInput | null =
      ok && gubun && date && item && currency
        ? { gubun, date, itemId: item.id, name, currency, principal, rate, amountUsd, accountId, supporterId }
        : null

    rows.push({
      line: r,
      input,
      display: {
        gubun: gubunRaw,
        date: get('date'),
        item: itemName,
        name,
        currency: currency ?? get('currency'),
        principal: get('principal'),
        rate: usd ? '1' : rateRaw,
        amountUsd: amountUsd ? `$${amountUsd.toFixed(2)}` : '—',
        account: accountName || accountRaw,
      },
      errors,
      ok,
    })
  }

  const validCount = rows.filter((r) => r.ok).length
  return { rows, validCount, errorCount: rows.length - validCount, headerFound: true }
}
