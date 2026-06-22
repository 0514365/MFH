// MFH-PORTFOLIO-LETTER-SECTION-V10
// 공개 페이지 선교편지 섹션. ① 최신 선교편지(표지 + 요약 기도문) ② 년도별 카드 그리드.
// V9: 년도 목록을 접이식 → 사역영상식 카드 그리드. 카드 클릭 → /p/[slug]/letters#year-YYYY.
// V10: 타이틀을 다른 섹션과 동일 위상(pf-section-head + 영어 부제)으로 통일.
//      "선교편지 목록"도 동급 제목 + "전체 편지 보기" 뱃지 버튼. 연도 썸네일 축소(최신편지보다 작게,
//      동일 고정폭) + 캡션 "YYYY년 - N편" 한 행.
//      편지 표지·링크 헬퍼는 lib/portfolio 공통화(LetterFullSection·letters page 와 공유).

import Link from 'next/link';
import {
  groupLettersByYear,
  letterMonthLabel,
  letterCoverSrc,
  letterLink,
  isVideoLetter,
  type LetterWithUrls,
} from '@/lib/portfolio';

type Props = { letters: LetterWithUrls[]; slug: string };

export default function LetterSection({ letters, slug }: Props) {
  if (letters.length === 0) return null;

  const groups = groupLettersByYear(letters);
  const latest = letters[0];

  return (
    <section className="mt-8 min-[740px]:mt-10">
      <div className="pf-section-head">
        <h2 className="pf-section-title">선교편지</h2>
        <p className="pf-section-sub">Letters from Honduras</p>
      </div>

      {/* ① 최신 선교편지 */}
      <LatestLetter letter={latest} />

      {/* ② 년도별 카드 그리드 → 전체 페이지의 해당 연도로 점프 */}
      <div className="mt-7 flex items-center justify-between gap-3">
        <div className="pf-section-head">
          <h2 className="pf-section-title">선교편지 목록</h2>
          <p className="pf-section-sub">Letter archive</p>
        </div>
        <Link
          href={`/p/${slug}/letters`}
          className="pf-btn pf-btn--outline pf-btn--pill flex-shrink-0"
        >
          전체 편지 보기 →
        </Link>
      </div>

      {/* 작은 고정폭 썸네일(최신편지 표지보다 작게) + 한 행 캡션 */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-5">
        {groups.map((g) => {
          const rep = g.letters[0]; // 그 해 대표(최신) 편지 표지
          const cover = letterCoverSrc(rep);
          return (
            <Link
              key={g.year}
              href={`/p/${slug}/letters#year-${g.year}`}
              className="pf-vcard w-[108px] min-[740px]:w-[150px]"
            >
              <div
                className="pf-media pf-media--portrait"
                style={cover ? { backgroundImage: `url(${cover})` } : undefined}
              >
                {!cover && <span className="pf-media__ph">편지</span>}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
                {g.year}년
                <span className="pf-count-badge">{g.letters.length}편</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// 최신 선교편지: 데스크탑·태블릿(≥740) = 표지 좌 + 우측 칼럼 / 모바일(<740) = 표지+제목 한 행 + 요약 아래
function LatestLetter({ letter: l }: { letter: LetterWithUrls }) {
  const month = letterMonthLabel(l.year_month);
  const year = l.year_month?.match(/^(\d{4})/)?.[1] ?? '';
  const meta = [year && `${year}년`, month, l.number && `No.${l.number}`]
    .filter(Boolean)
    .join(' · ');

  const titleRow = (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">
        최신 선교편지
      </span>
      <span className="text-base font-bold text-ink min-[740px]:text-lg">{l.title}</span>
      {meta && <span className="text-xs text-muted">{meta}</span>}
    </div>
  );

  const prayer =
    l.summary && l.summary.trim() ? (
      <div className="rounded-lg border border-line bg-surface-subtle p-3">
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{l.summary}</p>
      </div>
    ) : null;

  // 표지(썸네일) = PDF 또는 영상 링크. 둘 다 없으면 비링크 표지. 표지 아래 캡션으로 클릭 안내.
  const link = letterLink(l);
  const cover = (widthClass: string) =>
    link.href ? (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${l.title} — ${link.label}`}
        className={`group block flex-shrink-0 ${widthClass}`}
      >
        <LetterCover letter={l} className="w-full transition group-hover:opacity-90" />
        <span className="mt-1.5 block text-center text-[11px] font-semibold text-primary">
          {link.label}
        </span>
      </a>
    ) : (
      <LetterCover letter={l} className={`flex-shrink-0 ${widthClass}`} />
    );

  return (
    <div className="mt-4 rounded-xl border border-line bg-surface p-4">
      {/* 데스크탑·태블릿(≥740): 표지(클릭=PDF) 좌 + 우측 칼럼(제목·요약) */}
      <div className="hidden gap-5 min-[740px]:flex">
        {cover('w-[150px]')}
        <div className="min-w-0 flex-1">
          {titleRow}
          {prayer && <div className="mt-2.5">{prayer}</div>}
        </div>
      </div>

      {/* 모바일(<740): 표지(클릭=PDF)+제목 한 행 → 요약 아래 별도 구역 */}
      <div className="min-[740px]:hidden">
        <div className="flex gap-4">
          {cover('w-[108px]')}
          <div className="min-w-0 flex-1">{titleRow}</div>
        </div>
        {prayer && <div className="mt-3">{prayer}</div>}
      </div>
    </div>
  );
}

// 표지 이미지 또는 PDF/영상 placeholder (3:4)
function LetterCover({
  letter: l,
  className,
  small = false,
}: {
  letter: LetterWithUrls;
  className?: string;
  small?: boolean;
}) {
  const src = letterCoverSrc(l);
  const video = isVideoLetter(l);
  return (
    <div className={`relative aspect-[3/4] overflow-hidden rounded-md ${className ?? ''}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={l.title} className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ background: 'var(--surface-subtle)' }}
        >
          <span className={`text-faint ${small ? 'text-[9px] font-bold' : 'text-2xl'}`} aria-hidden>
            {video ? '영상' : 'PDF'}
          </span>
        </div>
      )}
      {/* 영상 편지: 재생 ▶ 오버레이 */}
      {video && src && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <span
            className={`flex items-center justify-center rounded-full bg-black/45 ${small ? 'h-5 w-5' : 'h-8 w-8'}`}
          >
            <svg viewBox="0 0 24 24" fill="white" className={small ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      )}
      {!small && l.number && (
        <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          No.{l.number}
        </span>
      )}
    </div>
  );
}
