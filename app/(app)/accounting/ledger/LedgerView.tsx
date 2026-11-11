'use client'
// MFH-ACCOUNTING-LEDGER-VIEW-V4 — 수정 진입 시 markFilterReturn('ledger')(돌아오면 필터 복원)
// MFH-ACCOUNTING-LEDGER-VIEW-V3 — accountInfo(사용자·카드 필터) 전달
// MFH-ACCOUNTING-LEDGER-VIEW-V2 — 딥링크 필터(initialFilter) 전달
// MFH-ACCOUNTING-LEDGER-VIEW-V1
// 내역 탭 클라이언트 래퍼 — 전체 거래 TransactionList. 수정 클릭 → /accounting/entry?edit=<id> 로 이동(기록 폼 프리필).
import { useRouter } from 'next/navigation'
import type { AcctOptions, InoutRow } from '@/lib/accounting-types'
import { markFilterReturn } from '../SearchFilters'
import TransactionList, { type LedgerAccountInfo, type LedgerFilter } from '../TransactionList'

export default function LedgerView({
  recent,
  options,
  initialFilter,
  accountInfo,
}: {
  recent: InoutRow[]
  options: AcctOptions
  initialFilter?: LedgerFilter
  accountInfo?: LedgerAccountInfo[]
}) {
  const router = useRouter()
  return (
    <TransactionList
      recent={recent}
      options={options}
      editingId={null}
      onEdit={(r) => {
        markFilterReturn('ledger')
        router.push(`/accounting/entry?edit=${r.id}`)
      }}
      onAfterMutate={() => router.refresh()}
      initialFilter={initialFilter}
      accountInfo={accountInfo}
    />
  )
}
