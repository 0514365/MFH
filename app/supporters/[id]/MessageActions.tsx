'use client'

// MFH-MESSAGE-ACTIONS-V1
// 후원자 개별 메시지 — 발송 서버 없이 메일앱(mailto) + 클립보드 복사로 수동 발송.
// AI 초안(supporter_care 의 메시지 초안)이 있으면 복사 버튼 제공. 이메일 없으면 등록 유도.
import { useState } from 'react'

function buildBody(name: string): string {
  return [
    `${name}님께,`,
    '',
    '온두라스에서 사역하는 김우진·서진아 선교사입니다.',
    '',
    '',
    '',
    '늘 기도와 후원으로 함께해 주셔서 감사합니다. 주님의 평강이 가정에 가득하시기를 기도합니다.',
    'MFH 드림',
  ].join('\n')
}

export default function MessageActions({
  email,
  name,
  aiDraft,
}: {
  email: string | null
  name: string
  aiDraft: string | null
}) {
  const [copied, setCopied] = useState<'' | 'draft' | 'mail'>('')

  if (!email) {
    return <p className="text-xs text-faint">이메일을 등록하면 여기서 바로 메일을 보낼 수 있어요.</p>
  }

  const href = `mailto:${email}?subject=${encodeURIComponent('MFH 선교 소식')}&body=${encodeURIComponent(buildBody(name))}`

  async function copy(text: string, kind: 'draft' | 'mail') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      alert('복사에 실패했어요. 길게 눌러 직접 복사해 주세요.')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={href}
        className="rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
      >
        메일 보내기
      </a>
      <button
        type="button"
        onClick={() => copy(email, 'mail')}
        className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-muted transition hover:border-primary"
      >
        {copied === 'mail' ? '복사됨' : '주소 복사'}
      </button>
      {aiDraft && (
        <button
          type="button"
          onClick={() => copy(aiDraft, 'draft')}
          className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-muted transition hover:border-primary"
        >
          {copied === 'draft' ? '복사됨' : 'AI 초안 복사'}
        </button>
      )}
    </div>
  )
}
