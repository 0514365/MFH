'use client'

// MFH-BULK-MAIL-V1
// 통합 발송 — 이메일 보유 후원자 전체를 bcc mailto 로 열거나 주소 목록을 복사.
// 발송 서버 없이 메일앱에서 직접 발송(수동). 주소가 많으면 mailto URL 한계가 있어 '주소 복사' 병행.
import { useState } from 'react'

export default function BulkMailButton({ emails }: { emails: string[] }) {
  const [copied, setCopied] = useState(false)
  if (emails.length === 0) return null

  const href = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent('MFH 선교 소식')}`

  async function copyAddrs() {
    try {
      await navigator.clipboard.writeText(emails.join(', '))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      alert('복사에 실패했어요.')
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface-subtle px-4 py-3">
      <span className="text-sm text-ink">
        이메일 보유 <b className="font-semibold">{emails.length}</b>명에게 단체 메일
      </span>
      <a
        href={href}
        className="ml-auto rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
      >
        단체 메일
      </a>
      <button
        type="button"
        onClick={copyAddrs}
        className="rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-muted transition hover:border-primary"
      >
        {copied ? '복사됨' : '주소 복사'}
      </button>
    </div>
  )
}
