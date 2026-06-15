// MFH-ATTACHMENTS-LIB-V1
// 할 일·프로젝트 첨부 공통 헬퍼. 사진모음·캡션 루틴·편지 재료가
// "이미지 첨부만"(PDF·기타 제외)을 동일 기준으로 거르고, 같은 기준으로 월에 귀속한다.
import type { Attachment } from '@/lib/types'

// 이미지 첨부인가(PDF·기타 제외). mime 우선, 확장자 fallback. AttachmentList 의 판별과 일치.
export function isImageAttachment(a: Pick<Attachment, 'mime' | 'name'>): boolean {
  if (a.mime === 'application/pdf') return false
  return a.mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|heif|bmp)$/i.test(a.name)
}

// 'YYYY-MM-DD...' (date 또는 ISO timestamptz) → 'YYYY-MM-DD'. 빈 값은 null.
function toDateStr(v: string | null | undefined): string | null {
  return v ? v.slice(0, 10) : null
}

// 첨부엔 촬영일이 없어 출처 행의 날짜로 월에 귀속한다.
//  task:    due_date → completed_at → created_at
//  project: due_date → start_date   → created_at
export function taskAttachmentDate(t: {
  due_date?: string | null
  completed_at?: string | null
  created_at?: string | null
}): string | null {
  return toDateStr(t.due_date) ?? toDateStr(t.completed_at) ?? toDateStr(t.created_at)
}

export function projectAttachmentDate(p: {
  due_date?: string | null
  start_date?: string | null
  created_at?: string | null
}): string | null {
  return toDateStr(p.due_date) ?? toDateStr(p.start_date) ?? toDateStr(p.created_at)
}
