// MFH-ACCOUNTING-TYPES-V5 — AccountBalance.upcoming(미래 날짜 거래 예정액, 잔액 미포함)
// MFH-ACCOUNTING-TYPES-V4 — 통화가 다른 이체의 입금 금액(toPrincipal, patch116). 수입·지출 환율은 DB 트리거가 결정
// MFH-ACCOUNTING-TYPES-V3 — 계좌 실보유(holdings)·공시 환율 평가액(valueUsd, patch114)
// MFH-ACCOUNTING-TYPES-V2 — AcctOption.active(숨긴 항목 포함, 콤보에서만 제외)
// MFH-ACCOUNTING-TYPES-V1
// 회계 공용 타입 — 서버(accounting-db.ts)·클라이언트 컴포넌트가 함께 import(타입 + 순수 헬퍼, 런타임 의존 없음).
// 2026-10 노션 → Supabase 이전 시 lib/notion.ts 의 타입을 그대로 옮김(이름·필드 호환).

export type Currency = 'KRW' | 'USD' | 'HNL'
export type Gubun = '수입' | '지출' | '이체' | '조정'
// 이체 = 출금계좌(accountId) → 입금계좌(toAccountId), 항목 없음, 집계 제외.
// 조정 = 잔액 조정(patch108): 계좌 1개, 항목 없음, 금액 부호 있음(+ 늘림/− 줄임), 집계 제외·잔액만 반영.
export type InoutSource = 'manual' | 'csv' | 'sms' | 'notion'

// active=false = 숨긴 항목(acct_items.is_active=false) — 이름 매핑엔 쓰고 입력 콤보에선 제외(activeOnly).
export type AcctOption = { id: string; name: string; currency?: string | null; category?: string | null; active?: boolean }
export const activeOnly = (list: AcctOption[], keepId?: string): AcctOption[] =>
  list.filter((o) => o.active !== false || (!!keepId && o.id === keepId))
export type AcctOptions = {
  items: { 수입: AcctOption[]; 지출: AcctOption[] }
  supporters: AcctOption[]
  accounts: AcctOption[]
}

export type AccountBalance = {
  id: string
  name: string
  balanceUsd: number
  currency: string | null
  kind: string | null // 현금 · 신용카드
  cardLast4: string | null
  info: string | null // 계좌정보(카드는 사용자 표기: 우진 · 진아)
  rate: number | null // 현지통화 환산율(그 통화의 최근 거래 환율, USD=1)
  balanceLocal: number | null // 계좌 통화 실보유액(holdings 의 계좌 통화분). USD 계좌는 null
  // 실보유(계좌 통화 기준, 통화별) — 계좌 통화와 같은 거래는 원금, 다른 통화 거래·USD 계좌는 금액(USD)로 USD 버킷.
  holdings: { currency: string; amount: number }[]
  // 공시 환율 평가액(USD) = Σ 보유 ÷ 공시 환율. 필요한 공시 환율이 없으면 null(→ 장부가로 표시).
  valueUsd: number | null
  // 오늘 이후 날짜 거래(예약·반복 입력) — 잔액에 넣지 않은 예정액(계좌 통화 기준, USD 계좌는 USD)·건수·가장 이른 날짜.
  upcoming: { amount: number; count: number; first: string } | null
}

// 통화별 최신 공시 환율(fx_rates) — 평가 표시용.
export type FxInfo = { currency: string; rate: number; date: string; source: string }

export type AccountInput = {
  name: string
  currency: Currency
  info?: string | null // 계좌정보(계좌번호·용도 등, 선택)
}

export type InoutInput = {
  gubun: Gubun
  date: string // YYYY-MM-DD
  itemId: string // 항목 id(이체는 '')
  name: string // 적요(무엇을)
  vendor?: string | null // 구매처(어디서) — 카드 승인은 문자 상점명
  currency: Currency
  principal: number // 원금(현지통화)
  rate: number // 환율(1 USD당 현지통화)
  amountUsd: number // 금액(USD) = 원금 ÷ 환율
  accountId?: string | null // 수입=입금계좌 · 지출=지불계좌 · 이체=출금계좌
  toAccountId?: string | null // 이체 입금계좌
  supporterId?: string | null
  source?: InoutSource // 미지정 = manual
  receiptPath?: string | null // 영수증 Storage 경로(receipts 버킷, patch111). undefined = 건드리지 않음 · null = 제거
  toPrincipal?: number | null // 통화가 다른 이체의 입금 계좌 통화 금액(patch116). 그 외 null
}

export type InoutRow = {
  id: string
  gubun: string | null
  date: string | null
  name: string | null
  vendor: string | null
  currency: string | null
  principal: number | null
  rate: number | null
  amountUsd: number | null
  itemId: string | null
  accountId: string | null
  toAccountId: string | null // 이체 입금계좌
  supporterId: string | null
  createdTime: string | null // 입력 시각 — '최근 입력' 정렬용
  receiptPath: string | null // 영수증(receipts 버킷)
  toPrincipal: number | null // 통화가 다른 이체의 입금 금액(patch116)
}

// 통합 수정(부분 변경) — 지정된 필드만 바꾼다. supporterId '' = 연결 해제. rate 는 USD 외 행만 환율·금액(USD) 재계산.
export type InoutPatch = {
  itemId?: string
  accountId?: string
  date?: string // YYYY-MM-DD
  name?: string // 적요
  vendor?: string // 구매처
  rate?: number // 환율(1 USD 당 현지통화) → amount_usd = principal ÷ rate
  supporterId?: string | '' // '' = 해제
}

export type DonationYearly = {
  total: number
  years: { year: number; sum: number }[]
  byCurrency: { currency: string; sum: number }[] // 실제 입금 통화별 원금 합(KRW·HNL·USD 순)
}

export type ActionResult = { ok: boolean; error?: string }

// 항목(분류) 추가 입력 — 입력 폼·승인대기에서 즉석 생성.
export type ItemInput = {
  gubun: '수입' | '지출'
  name: string
  category: string // 대분류(기존 값 선택 또는 직접 입력)
}

// 항목 관리 모달용 — 숨긴 항목 포함 전체.
export type ItemPatch = { name: string; category: string }

// ===== 카드 문자 승인대기 인박스(card_tx_inbox) =====
export type InboxRow = {
  id: string
  smsKey: string
  smsAt: string // ISO
  cardLast4: string
  currency: string
  principal: number
  merchant: string // 문자 상점명(원문, 16자 절단)
  suggestedItemId: string | null
  suggestedName: string | null // 적요 추천
  suggestedVendor: string | null // 구매처 표시명 추천(학습) — 없으면 merchant
  suggestedAccountId: string | null
}

// 승인 입력 — 행 id + 사용자가 확정한 값. amount_usd 는 서버에서 principal ÷ rate 로 계산. 구매처는 문자 상점명(서버가 채움).
export type InboxApproveInput = {
  id: string
  itemId: string
  name: string // 적요(빈칸 허용 — 구매처만 기록)
  vendor: string // 구매처 표시명(수정 가능, 빈칸이면 상점명)
  accountId: string | null
  rate: number
}

// 카드 자동 승인(patch110) — 승인대기 화면 "자동 승인(최근 N일)" 목록 행.
export type AutoApprovedRow = {
  id: string // card_tx_inbox.id
  smsAt: string
  currency: string
  principal: number
  merchant: string
  itemId: string | null
  vendor: string | null
  amountUsd: number | null
}

// 상점 사전(merchant_rules) — 자동 승인 토글 모달용.
export type MerchantRuleRow = {
  id: string
  merchant: string
  itemId: string
  vendor: string | null
  hitCount: number
  autoApprove: boolean
  lastUsedAt: string
}
