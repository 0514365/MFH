// MFH-ATTACHMENT-LIST-V1
// 상세 페이지 첨부 미리보기(서버 컴포넌트). signed URL 로 변환된 항목을 받아 렌더.
// 이미지=썸네일 그리드(탭 시 원본 새 탭), PDF=인라인 iframe + 새 탭 링크, 기타=파일 링크.
export type AttItem = { url: string; name: string; mime: string }

function isPdf(it: AttItem): boolean {
  return it.mime === 'application/pdf' || it.name.toLowerCase().endsWith('.pdf')
}
function isImage(it: AttItem): boolean {
  return it.mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|heif|bmp)$/i.test(it.name)
}

export default function AttachmentList({ items }: { items: AttItem[] }) {
  if (!items.length) return null
  const images = items.filter(isImage)
  const pdfs = items.filter(isPdf)
  const others = items.filter((it) => !isImage(it) && !isPdf(it))

  return (
    <div className="flex flex-col gap-5">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((it) => (
            <a
              key={it.url}
              href={it.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-xl border border-line"
              title={it.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.url}
                alt={it.name}
                className="aspect-square w-full object-cover transition group-active:opacity-80"
              />
            </a>
          ))}
        </div>
      )}

      {pdfs.map((it) => (
        <div key={it.url} className="overflow-hidden rounded-2xl border border-line">
          <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-subtle px-3 py-2">
            <span className="min-w-0 truncate text-[12px] font-medium text-ink" title={it.name}>
              {it.name}
            </span>
            <a
              href={it.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 font-display text-[11px] font-bold uppercase tracking-wide text-primary"
            >
              새 탭 ↗
            </a>
          </div>
          <iframe src={it.url} title={it.name} className="h-[460px] w-full bg-white" />
        </div>
      ))}

      {others.map((it) => (
        <a
          key={it.url}
          href={it.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl border border-line bg-surface-subtle px-3 py-2.5 text-[13px] font-medium text-ink"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-primary"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
          <span className="min-w-0 truncate" title={it.name}>
            {it.name}
          </span>
        </a>
      ))}
    </div>
  )
}
