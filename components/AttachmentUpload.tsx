'use client'

// MFH-ATTACHMENT-UPLOAD-V1
// 할 일·프로젝트 첨부(이미지·PDF) 다중 업로드. 비공개 'attachments' 버킷.
// 경로 {userId}/{ts}-{rand}.{ext}. 업로드 후 메타({path,name,mime,size}) 배열을 onChange 로 상위에 전달.
// 미리보기는 상세 페이지(signed URL)에서 — 여기선 파일 칩만 표시. userId 는 현재 로그인 사용자(본인 폴더 정책).
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { MAX_ATTACHMENTS, type Attachment } from '@/lib/types'

const BUCKET = 'attachments'
const ACCEPT = 'image/*,application/pdf'
const MAX_MB = 20

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function isPdfAttachment(a: Attachment): boolean {
  return a.mime === 'application/pdf' || a.name.toLowerCase().endsWith('.pdf')
}

const PdfIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M9 13h6M9 17h4" />
  </svg>
)
const ImgIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
)
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

export default function AttachmentUpload({
  userId,
  value,
  onChange,
}: {
  userId: string
  value: Attachment[]
  onChange: (next: Attachment[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: FileList) {
    setError(null)
    if (!userId) {
      setError('로그인 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.')
      return
    }
    const room = MAX_ATTACHMENTS - value.length
    if (room <= 0) {
      setError(`첨부는 최대 ${MAX_ATTACHMENTS}개까지입니다.`)
      return
    }
    const picked = Array.from(files).slice(0, room)
    setBusy(true)
    try {
      const supabase = createClient()
      const added: Attachment[] = []
      for (const file of picked) {
        const isImg = file.type.startsWith('image/')
        const isPdf = file.type === 'application/pdf'
        if (!isImg && !isPdf) {
          setError('이미지 또는 PDF만 첨부할 수 있습니다.')
          continue
        }
        if (file.size > MAX_MB * 1024 * 1024) {
          setError(`파일당 최대 ${MAX_MB}MB 까지입니다: ${file.name}`)
          continue
        }
        const ext = (file.name.split('.').pop() || (isPdf ? 'pdf' : 'jpg')).toLowerCase()
        const rand = Math.random().toString(36).slice(2, 8)
        const path = `${userId}/${Date.now()}-${rand}.${ext}`
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type || undefined, upsert: false })
        if (upErr) {
          setError('업로드 실패: ' + upErr.message)
          continue
        }
        added.push({
          path,
          name: file.name,
          mime: file.type || (isPdf ? 'application/pdf' : 'application/octet-stream'),
          size: file.size,
        })
      }
      if (added.length) onChange([...value, ...added])
    } finally {
      setBusy(false)
    }
  }

  async function remove(idx: number) {
    const target = value[idx]
    onChange(value.filter((_, i) => i !== idx))
    // 저장 전이라도 Storage orphan 방지: 본인 폴더 정책상 보통 성공(실패는 무시).
    try {
      const supabase = createClient()
      await supabase.storage.from(BUCKET).remove([target.path])
    } catch {
      // 무시
    }
  }

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1.5">
          {value.map((a, i) => (
            <li
              key={a.path}
              className="flex items-center gap-2 rounded-xl border border-line bg-surface-subtle px-3 py-2"
            >
              <span className="shrink-0 text-primary">{isPdfAttachment(a) ? <PdfIcon /> : <ImgIcon />}</span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-ink" title={a.name}>
                {a.name}
              </span>
              <span className="shrink-0 text-[10px] text-faint">{fmtSize(a.size)}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`첨부 삭제: ${a.name}`}
                className="shrink-0 text-muted transition hover:text-accent"
              >
                <XIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        disabled={busy || value.length >= MAX_ATTACHMENTS}
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl border border-dashed border-line bg-surface px-3 py-2.5 text-[13px] font-medium text-primary transition hover:bg-primary-soft disabled:opacity-50"
      >
        {busy
          ? '업로드 중…'
          : value.length >= MAX_ATTACHMENTS
            ? `첨부 최대 ${MAX_ATTACHMENTS}개`
            : '+ 이미지·PDF 첨부'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  )
}
