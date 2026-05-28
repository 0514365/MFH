'use client';
// MFH-PORTFOLIO-HISTORY-ACCORDION-V1
// 선교 연혁 접이식(섹션 전체). 헤더("선교 연혁" + 개수 + ▾)가 토글 버튼.
// 기본 접힘. 펼치면 기존 타임라인(모바일 세로 ol + 태블릿+ 그리드 ol) 그대로 표시.
// 서버부모(PortfolioView)가 history 를 props 로 주입하는 클라이언트 자식.

import { useState } from 'react';
import type { PortfolioHistory } from '@/lib/portfolio';

type Props = {
  history: PortfolioHistory[];
};

export default function HistoryAccordion({ history }: Props) {
  const [open, setOpen] = useState(false);
  const count = history.length;

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 border-l-[3px] border-accent pl-2 text-left text-sm font-medium text-primary"
      >
        <span>선교 연혁</span>
        {count > 0 && (
          <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] font-normal text-muted">
            {count}
          </span>
        )}
        <span
          aria-hidden
          className={`ml-auto text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-3">
          {count === 0 ? (
            <p className="text-xs text-faint">아직 연혁이 등록되지 않았습니다.</p>
          ) : (
            <>
              {/* 모바일: 세로 라인 + 점 */}
              <ol className="relative space-y-3 border-l-[1.5px] border-primary-soft pl-4 min-[740px]:hidden">
                {history.map((h) => (
                  <li key={h.id} className="relative">
                    <span
                      className="absolute -left-[22px] top-1 inline-block h-2 w-2 rounded-full border-2 border-surface"
                      style={{ background: h.is_ongoing ? 'var(--accent)' : 'var(--text-muted)' }}
                      aria-hidden
                    />
                    <p
                      className="text-[11px] font-medium"
                      style={{ color: h.is_ongoing ? 'var(--accent)' : 'var(--text-muted)' }}
                    >
                      {h.period_text}
                    </p>
                    <p className="text-xs text-ink">{h.title}</p>
                  </li>
                ))}
              </ol>
              {/* 태블릿+: 2/3열 그리드 (white 카드) */}
              <ol className="hidden rounded-md border border-line bg-surface p-3 min-[740px]:grid min-[740px]:grid-cols-2 min-[740px]:gap-x-4 min-[740px]:gap-y-2 min-[1100px]:grid-cols-3">
                {history.map((h) => (
                  <li key={h.id} className="flex gap-2">
                    <span
                      className="mt-[6px] inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ background: h.is_ongoing ? 'var(--accent)' : 'var(--text-muted)' }}
                      aria-hidden
                    />
                    <div>
                      <p
                        className="text-[10px] font-medium"
                        style={{ color: h.is_ongoing ? 'var(--accent)' : 'var(--text-muted)' }}
                      >
                        {h.period_text}
                      </p>
                      <p className="text-xs text-ink">{h.title}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </section>
  );
}
