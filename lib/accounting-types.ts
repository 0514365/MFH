// MFH-ACCOUNTING-TYPES-V1
// 회계 공용 타입 — 서버(accounting-db.ts)·클라이언트 컴포넌트가 함께 import(타입만, 런타임 의존 없음).
// 2026-10 노션 → Supabase 이전 시 lib/notion.ts 의 타입을 그대로 옮김(이름·필드 호환).

export type Currency = 'KRW' | 'USD' | 'HNL'
export type Gubun = '수입' | '지출' | '이체' // 이체 = 출금계좌(accountId) → 입금계좌(toAccountId), 항목 없음, 집계 제외
export type InoutSource = 'manual' | 'csv' | 'sms' | 'notion'

export type AcctOption = { id: string; name: string; currency?: string | null; category?: string | null }
export type AcctOptions = {
  items: { 수입: AcctOption[]; 지출: AcctOption[] }
  supporters: AcctOption[]
  accounts: AcctOption[]
}

export type AccountBalance = { id: string; name: string; balanceUsd: number; currency: string | null }

export type AccountInput = {
  name: string
  currency: Currency
  info?: string | null // 계좌정보(계좌번호·용도 등, 선택)
}

export type InoutInput = {
  gubun: Gubun
  date: string // YYYY-MM-DD
  itemId: string // 항목 id(이체는 '')
  name: string
  currency: Currency
  principal: number // 원금(현지통화)
  rate: number // 환율(1 USD당 현지통화)
  amountUsd: number // 금액(USD) = 원금 ÷ 환율
  accountId?: string | null // 수입=입금계좌 · 지출=지불계좌 · 이체=출금계좌
  toAccountId?: string | null // 이체 입금계좌
  supporterId?: string | null
  source?: InoutSource // 미지정 = manual
}

export type InoutRow = {
  id: string
  gubun: string | null
  date: string | null
  name: string | null
  currency: string | null
  principal: number | null
  rate: number | null
  amountUsd: number | null
  itemId: string | null
  accountId: string | null
  toAccountId: string | null // 이체 입금계좌
  supporterId: string | null
  createdTime: string | null // 입력 시각 — '최근 입력' 정렬용
}

export type InoutPatch = { itemId?: string; accountId?: string }

export type DonationYearly = {
  total: number
  years: { year: number; sum: number }[]
  byCurrency: { currency: string; sum: number }[] // 실제 입금 통화별 원금 합(KRW·HNL·USD 순)
}

export type ActionResult = { ok: boolean; error?: string }

// ===== 카드 문자 승인대기 인박스(card_tx_inbox) =====
export type InboxRow = {
  id: string
  smsKey: string
  smsAt: string // ISO
  cardLast4: string
  currency: string
  principal: number
  merchant: string
  suggestedItemId: string | null
  suggestedName: string | null
  suggestedAccountId: string | null
}

// 승인 입력 — 행 id + 사용자가 확정한 값. amount_usd 는 서버에서 principal ÷ rate 로 계산.
export type InboxApproveInput = {
  id: string
  itemId: string
  name: string
  accountId: string | null
  rate: number
}
