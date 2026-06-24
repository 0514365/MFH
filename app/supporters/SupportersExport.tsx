'use client'

// MFH-SUPPORTERS-EXPORT-V1
// 노션 연동용 후원자 내보내기 — CSV(노션 수동 import, 한글 헤더+BOM) / JSON(향후 API 동기화, 영문 키).
// app_id(supporter.id)를 매핑 키로 포함 → 노션 후원자 DB "앱ID" 컬럼과 1:1 연결.
import { supportersToCSV, supportersToJSON } from '@/lib/supporters'
import { downloadText } from '@/lib/download'
import type { Supporter } from '@/lib/types'

export default function SupportersExport({ supporters }: { supporters: Supporter[] }) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface-subtle px-4 py-3">
      <span className="text-sm text-ink">노션 연동용 내보내기</span>
      <span className="text-xs text-faint">{supporters.length}명</span>
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
        CSV
      </button>
      <button
        type="button"
        onClick={() =>
          downloadText(`supporters-${today}.json`, supportersToJSON(supporters), 'application/json')
        }
        className="rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-muted transition hover:border-primary"
      >
        JSON
      </button>
    </div>
  )
}
