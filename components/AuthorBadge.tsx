// MFH-AUTHOR-BADGE-V2 — 2027 공용 부품(4-0): 남색 글자 · 연회색 면 · b27 선 · 굵기 600 이하 · 위험 = 지출 빨강.
// MFH-AUTHOR-BADGE-V1
// 작성자 이름 배지. 서버/클라 양쪽에서 사용(순수 표시 컴포넌트).
export default function AuthorBadge({ name }: { name?: string | null }) {
  if (!name) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-b27-card px-2 py-0.5 text-[11px] font-medium text-b27-muted">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      {name}
    </span>
  )
}
