// MFH-VERSE-TEXT-V2 — 본문 폰트 확대(폰·패드 17.5px, ≥740px 18.5px · 소제목 14/15px · 절 번호 12px). 우진 실기기 피드백(09-25).
// MFH-VERSE-TEXT-V1 — 성경 절 1개 렌더(서버·클라이언트 공용, 훅 없음). Manna components/VerseText.tsx V1 이식.
// 본문에 인라인 보존된 <소제목> 을 절 위(또는 절 중간이면 그 자리) **별도 블록**으로 분리해 그린다.
// 절 번호는 첫 본문 조각 앞에 sup 로 1회. \n 은 줄바꿈 유지.
import type { ReactNode } from 'react'

const HEADING_CLS = 'mb-1 mt-2 text-[14px] font-bold leading-snug text-primary first:mt-0 min-[740px]:text-[15px]'
// 본문 기본 크기 — 통독 /bible/read 와 QT 접이식이 공유(한 곳에서 조정).
export const VERSE_TEXT_CLS = 'text-[17.5px] leading-[1.85] text-ink min-[740px]:text-[18.5px]'

export default function VerseText({
  label,
  body,
  textClassName = VERSE_TEXT_CLS,
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
        {!numbered && <sup className="mr-1 font-display text-[12px] font-bold text-accent">{label}</sup>}
        <span className="whitespace-pre-line">{text}</span>
      </p>,
    )
    numbered = true
  })
  // 본문이 소제목뿐(비정상)이어도 번호는 남긴다
  if (!numbered)
    out.push(
      <p key="n" className={textClassName}>
        <sup className="mr-1 font-display text-[12px] font-bold text-accent">{label}</sup>
      </p>,
    )
  return <>{out}</>
}
