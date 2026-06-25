'use client'

// MFH-SUPPORTERS-EXPORT-V2
// 노션 연동용 내보내기 — 후원자(CSV: 수동 import / JSON: API) + 헌금(JSON: 입출금기록 등록).
// 후원자 app_id / 헌금 supporter_app_id 를 매핑 키로 포함 → 노션 후원자 DB·relation 과 1:1 연결.
import { supportersToCSV, supportersToJSON, donationsToJSON } from '@/lib/supporters'
import { downloadText } from '@/lib/download'
import type { Supporter, SupporterDonation } from '@/lib/types'

export default function SupportersExport({
  supporters,
  donations,
}: {
  supporters: Supporter[]
  donations: SupporterDonation[]
}) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface-subtle px-4 py-3">
      <span className="text-sm text-ink">노션 연동용 내보내기</span>
      <span className="text-xs text-faint">
        후원자 {supporters.length}명 · 헌금 {donations.length}건
      </span>
      <button
        type="button"
        onClick={() =>
          downloadText(
            `supporters-${today}.csv`,
            '﻿' + supportersToCSV(supporters),
            'text/csv;charset=utf-8',
          )
        }
        className="ml-auto rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-muted transition hover:border-primary"
      >
        후원자 CSV
      </button>
      <button
        type="button"
        onClick={() =>
          downloadText(`supporters-${today}.json`, supportersToJSON(supporters), 'application/json')
        }
        className="rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-muted transition hover:border-primary"
      >
        후원자 JSON
      </button>
      <button
        type="button"
        onClick={() =>
          downloadText(
            `donations-${today}.json`,
            donationsToJSON(donations, supporters),
            'application/json',
          )
        }
        className="rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-muted transition hover:border-primary"
      >
        헌금 JSON
      </button>
    </div>
  )
}
