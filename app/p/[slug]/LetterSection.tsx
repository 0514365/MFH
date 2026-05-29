'use client';

// MFH-PORTFOLIO-LETTER-SECTION-V3
// 공개 페이지 선교편지 섹션. 사역 영상 위에 전체 폭.
// 구성: ① 최신 선교편지(표지 좌 + 요약 기도문 우 칼럼) ② 년도별 목록(앰버 배너 + 접이식).
// V3: 최신 선교편지 블록 신설 / 년도 배너 컬러(LETTER_BANNER_RAMP, 앰버·세피아) / 개수 표기 제거 /
//     데스크탑 = 년도 박스 2열·박스 내부 편지 1열 (patch67).
// 디자인 사양: MFH-PORTFOLIO-DESIGN.md v4 §5-5

import { useState } from 'react';
import type { PortfolioLetter } from '@/lib/portfolio';
import { groupLettersByYear, letterMonthLabel, letterBannerStyle } from '@/lib/portfolio';

type LetterWithUrls = PortfolioLetter & {
  pdf_url: string | null;
  cover_url: string | null;
};

type Props = { letters: LetterWithUrls[] };

export default function LetterSection({ letters }: Props) {
  const groups = groupLettersByYear(letters);
  // 년도 박스는 각자 접이식(2열 배치). 기본 = 최신 년도만 펼침.
  const [openYears, setOpenYears] = useState<Set<string>>(
    () => new Set(groups.length > 0 ? [groups[0].year] : [])
  );

  if (letters.length === 0) return null;

  const latest = letters[0];

  function toggleYear(year: string) {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  return (
    <section className="mt-8 min-[740px]:mt-10">
      <h2 className="border-l-[3px] border-accent pl-2.5 text-base font-semibold text-primary min-[740px]:text-lg">
        선교편지
      </h2>
      <p className="mt-1 pl-2.5 text-sm text-faint">Monthly prayer letters</p>

      {/* ① 최신 선교편지 */}
      <LatestLetter letter={latest} />

      {/* ② 년도별 목록 (데스크탑 2열 / 박스 내부 1열) */}
      <h3 className="mt-7 border-l-[3px] border-accent pl-2.5 text-base font-semibold text-primary">
        선교편지 목록
      </h3>
      <div className="mt-3 grid grid-cols-1 items-start gap-3.5 min-[1100px]:grid-cols-2">
        {groups.map((g, i) => {
          const c = letterBannerStyle(i);
          const open = openYears.has(g.year);
          return (
            <div key={g.year} className="overflow-hidden rounded-lg shadow-sm">
              <button
                type="button"
                onClick={() => toggleYear(g.year)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                style={{ background: `linear-gradient(90deg, ${c.from}, ${c.to})`, color: c.text }}
              >
                <span className="text-base font-bold">{g.year}</span>
                <span
                  aria-hidden
                  style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
                >
                  ⌄
                </span>
              </button>

              {open && (
                <div className="border border-t-0 border-line bg-surface p-3">
                  <ul className="flex flex-col gap-2.5">
                    {g.letters.map((l) => (
                      <li key={l.id}>
                        <LetterRow letter={l} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// 최신 선교편지: 표지(좌) + 요약 기도문(우 칼럼)
function LatestLetter({ letter: l }: { letter: LetterWithUrls }) {
  const month = letterMonthLabel(l.year_month);
  const year = l.year_month?.match(/^(\d{4})/)?.[1] ?? '';
  const meta = [year && `${year}년`, month, l.number && `No.${l.number}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="mt-4 flex gap-4 rounded-xl border border-line bg-surface p-4 min-[740px]:gap-5">
      <LetterCover
        letter={l}
        className="w-[108px] flex-shrink-0 min-[740px]:w-[150px]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">
            최신 선교편지
          </span>
          <span className="text-base font-bold text-ink min-[740px]:text-lg">{l.title}</span>
          {meta && <span className="text-xs text-muted">{meta}</span>}
        </div>

        {l.summary && l.summary.trim() ? (
          <div className="mt-2.5 rounded-lg border border-line bg-surface-subtle p-3">
            <p className="mb-1.5 text-[11px] font-bold text-primary">🙏 요약 기도문</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{l.summary}</p>
          </div>
        ) : null}

        {l.pdf_url && (
          <a
            href={l.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-block rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-primary transition hover:border-primary"
          >
            편지 전문 보기 (PDF) →
          </a>
        )}
      </div>
    </div>
  );
}

// 목록 행: 작은 표지 + 호수·월 + 제목
function LetterRow({ letter: l }: { letter: LetterWithUrls }) {
  const month = letterMonthLabel(l.year_month);

  const inner = (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2 transition hover:border-primary">
      <LetterCover letter={l} className="w-10 flex-shrink-0" small />
      <div className="min-w-0">
        <p className="text-xs text-muted">
          {l.number && (
            <span
              className="mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{ background: 'var(--accent-soft)', color: 'var(--primary)' }}
            >
              No.{l.number}
            </span>
          )}
          {month}
        </p>
        <p className="mt-0.5 truncate text-sm leading-snug text-ink">{l.title}</p>
      </div>
    </div>
  );

  if (!l.pdf_url) return <div className="block">{inner}</div>;
  return (
    <a href={l.pdf_url} target="_blank" rel="noopener noreferrer" className="block">
      {inner}
    </a>
  );
}

// 표지 이미지 또는 PDF placeholder (3:4)
function LetterCover({
  letter: l,
  className,
  small = false,
}: {
  letter: LetterWithUrls;
  className?: string;
  small?: boolean;
}) {
  return (
    <div className={`relative aspect-[3/4] overflow-hidden rounded-md ${className ?? ''}`}>
      {l.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={l.cover_url} alt={l.title} className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ background: 'var(--surface-subtle)' }}
        >
          <span className={`text-faint ${small ? 'text-[9px] font-bold' : 'text-2xl'}`} aria-hidden>
            PDF
          </span>
        </div>
      )}
      {!small && l.number && (
        <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          No.{l.number}
        </span>
      )}
    </div>
  );
}
