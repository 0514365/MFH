'use client'
// MFH-ACCOUNTING-LEDGER-VIEW-V1
// 내역 탭 클라이언트 래퍼 — 전체 거래 TransactionList. 수정 클릭 → /accounting/entry?edit=<id> 로 이동(기록 폼 프리필).
import { useRouter } from 'next/navigation'
import type { AcctOptions, InoutRow } from '@/lib/notion'
import TransactionList from '../TransactionList'

export default function LedgerView({
  recent,
  options,
}: {
  recent: InoutRow[]
  options: AcctOptions
}) {
  const router = useRouter()
  return (
    <TransactionList
      recent={recent}
      options={options}
      editingId={null}
      onEdit={(r) => router.push(`/accounting/entry?edit=${r.id}`)}
      onAfterMutate={() => router.refresh()}
    />
  )
}
