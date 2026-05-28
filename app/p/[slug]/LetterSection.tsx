'use client';

// MFH-PORTFOLIO-LETTER-SECTION-V1
// 공개 페이지 선교편지 섹션. 영상 아래 전체 폭. 년도별 accordion(최신 펼침).
// 카드 = 표지(3:4) 또는 PDF placeholder. 클릭 = 새 탭 PDF.
// 디자인 사양: MFH-PORTFOLIO-DESIGN.md v4 §5-5

import { useState } from 'react';
import type { PortfolioLetter } from '@/lib/portfolio';
import { groupLettersByYear, letterMonthLabel } from '@/lib/portfolio';

type LetterWithUrls = PortfolioLetter & {
  pdf_url: string | null;
  cover_url: string | null;
};

type Props = { letters: LetterWithUrls[] };

export default function LetterSection({ letters }: Props) {
  const groups = groupLettersByYear(letters);
  const [openYear, setOpenYear] = useState<string | null>(
    groups.length > 0 ? groups[0].year : null
  );

  if (letters.length === 0) return null;

  return (
    <section className="mt-8 min-[740px]:mt-10">
      <h2 className="border-l-[3px] border-accent pl-2 text-sm font-medium text-primary">
        선교편지
      </h2>
      <p className="mt-1 pl-2 text-[11px] text-faint">Monthly prayer letters</p>

      <div className="mt-3 space-y-2.5">
        {groups.map((g) => {
          const open = openYear === g.year;
          return (
            <div
              key={g.year}
              className="overflow-hidden rounded-md border border-line bg-surface"
            >
              <button
                type="button"
                onClick={() => setOpenYear(open ? null : g.year)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-medium text-ink">
                  {g.year}
                  <span className="ml-2 text-xs font-normal text-faint">
                    · {g.letters.length}편
                  </span>
                </span>
                <span
                  className="text-muted"
                  aria-hidden
                  style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
                >
                  ⌄
                </span>
              </button>

              {open && (
                <div className="border-t border-line p-3">
                  <ul className="grid grid-cols-2 gap-3 min-[740px]:grid-cols-3 min-[1100px]:grid-cols-4">
                    {g.letters.map((l) => (
                      <li key={l.id}>
                        <LetterCard letter={l} />
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

function LetterCard({ letter: l }: { letter: LetterWithUrls }) {
  const month = letterMonthLabel(l.year_month);
  const label = month ? `${month} — ${l.title}` : l.title;

  const inner = (
    <>
      <div className="relative aspect-[3/4] overflow-hidden rounded-md">
        {l.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={l.cover_url}
            alt={label}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center"
            style={{ background: 'var(--surface-subtle)' }}
          >
            <span className="text-2xl text-faint" aria-hidden>
              PDF
            </span>
          </div>
        )}
        {l.number && (
          <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            No.{l.number}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-ink min-[740px]:text-xs">
        {label}
      </p>
    </>
  );

  if (!l.pdf_url) {
    return <div className="block">{inner}</div>;
  }

  return (
    <a
      href={l.pdf_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      {inner}
    </a>
  );
}
