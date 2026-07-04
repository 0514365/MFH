// MFH-PORTFOLIO-LETTER-FULL-SECTION-V1
// /p/[slug]/letters 전용 — 년도별 전체 선교편지 카드 그리드 + 연도 앵커(id="year-YYYY").
// 메인(/p/[slug])의 "선교편지 목록" 연도 카드에서 #year-YYYY 로 진입(scroll-mt 여백).
// 서버 컴포넌트. 표지·링크 헬퍼는 lib/portfolio 공유.

import {
  groupLettersByYear,
  letterMonthLabel,
  letterCoverSrc,
  letterLink,
  letterSubLink,
  isVideoLetter,
  type LetterWithUrls,
} from '@/lib/portfolio';

type Props = { letters: LetterWithUrls[] };

export default function LetterFullSection({ letters }: Props) {
  if (letters.length === 0) return null;

  const groups = groupLettersByYear(letters);

  return (
    <div className="mt-4 space-y-9">
      {groups.map((g) => (
        <div key={g.year} id={`year-${g.year}`} className="scroll-mt-6 min-[740px]:scroll-mt-8">
          <h3 className="pf-group-title mb-4 flex items-center gap-2">
            {g.year}년
            <span className="pf-count-badge">{g.letters.length}편</span>
          </h3>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 min-[560px]:grid-cols-3 min-[1100px]:grid-cols-4">
            {g.letters.map((l) => (
              <li key={l.id}>
                <LetterCard letter={l} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// 편지 카드: 표지(3:4) + 제목 + 월·링크 라벨. 클릭 = 모바일/PDF/영상(주 링크).
// 모바일+PDF 둘 다 있으면 카드 아래 PDF 부 링크 병기(카드 <a> 밖 — 중첩 링크 방지).
function LetterCard({ letter: l }: { letter: LetterWithUrls }) {
  const link = letterLink(l);
  const sub = letterSubLink(l);
  const cover = letterCoverSrc(l);
  const video = isVideoLetter(l);
  const month = letterMonthLabel(l.year_month);
  const meta = [month, link.label].filter(Boolean).join(' · ');

  const inner = (
    <>
      <div
        className="pf-media pf-media--portrait"
        style={cover ? { backgroundImage: `url(${cover})` } : undefined}
      >
        {!cover && <span className="pf-media__ph">{video ? '영상' : 'PDF'}</span>}
        {video && cover && (
          <span className="pf-media__play" aria-hidden>
            <span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        )}
        {l.number && <span className="pf-media__badge">No.{l.number}</span>}
      </div>
      <div className="pf-card-title">{l.title}</div>
      {meta && <div className="pf-card-meta">{meta}</div>}
    </>
  );

  if (!link.href) return <div className="pf-vcard">{inner}</div>;
  return (
    <>
      <a href={link.href} target="_blank" rel="noopener noreferrer" className="pf-vcard">
        {inner}
      </a>
      {sub && (
        <a
          href={sub.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block text-[11px] font-medium text-muted hover:text-primary"
        >
          {sub.label}
        </a>
      )}
    </>
  );
}
