// MFH-VERSE-TEXT-V1 — 성경 절 1개 렌더(서버·클라이언트 공용, 훅 없음). Manna components/VerseText.tsx V1 이식.
// 본문에 인라인 보존된 <소제목> 을 절 위(또는 절 중간이면 그 자리) **별도 블록**으로 분리해 그린다.
// 절 번호는 첫 본문 조각 앞에 sup 로 1회. \n 은 줄바꿈 유지.
import type { ReactNode } from 'react'

const HEADING_CLS = 'mb-1 mt-2 text-[13.5px] font-bold leading-snug text-primary first:mt-0'

export default function VerseText({
  label,
  body,
  textClassName = 'text-[16.5px] leading-[1.8] text-ink',
}: {
  label: string // sup 표기(예: "1" · "18-19" · "10:1")
  body: string
  textClassName?: string
}) {
  const parts = body.split(/<([^>]+)>/) // 홀수 인덱스 = 소제목
  const out: ReactNode[] = []
  let numbered = false
  parts.forEach((p, i) => {
    if (i % 2 === 1) {
      out.push(
        <p key={i} className={HEADING_CLS}>
          {p}
        </p>,
      )
      return
    }
    const text = p.replace(/^\s+|\s+$/g, '')
    if (!text) return
    out.push(
      <p key={i} className={textClassName}>
        {!numbered && <sup className="mr-1 font-display text-[11px] font-bold text-accent">{label}</sup>}
        <span className="whitespace-pre-line">{text}</span>
      </p>,
    )
    numbered = true
  })
  // 본문이 소제목뿐(비정상)이어도 번호는 남긴다
  if (!numbered)
    out.push(
      <p key="n" className={textClassName}>
        <sup className="mr-1 font-display text-[11px] font-bold text-accent">{label}</sup>
      </p>,
    )
  return <>{out}</>
}
