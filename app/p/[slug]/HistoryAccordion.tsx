'use client';
// MFH-PORTFOLIO-HISTORY-ACCORDION-V2
// 선교 연혁 접이식(섹션 전체). 헤더("선교 연혁" + 개수 + ▾)가 토글 버튼.
// 기본 접힘. 펼치면 기존 타임라인(모바일 세로 ol + 태블릿+ 그리드 ol) 그대로 표시.
// 서버부모(PortfolioView)가 history 를 props 로 주입하는 클라이언트 자식.
// V2: 폰트 전반 상향(가독성).

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
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="pf-section-head block min-w-0">
          <span className="flex items-center gap-2">
            <span className="pf-section-title">선교 연혁</span>
            {count > 0 && (
              <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs font-normal text-muted">
                {count}
              </span>
            )}
          </span>
          <span className="pf-section-sub block">Our mission journey</span>
        </span>
        <span
          aria-hidden
          className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-3">
          {count === 0 ? (
            <p className="text-sm text-faint">아직 연혁이 등록되지 않았습니다.</p>
          ) : (
            <>
              {/* 모바일: 세로 라인 + 점 */}
              <ol className="relative space-y-3.5 border-l-[1.5px] border-primary-soft pl-4 min-[740px]:hidden">
                {history.map((h) => (
                  <li key={h.id} className="relative">
                    <span
                      className="absolute -left-[22px] top-1 inline-block h-2 w-2 rounded-full border-2 border-surface"
                      style={{ background: h.is_ongoing ? 'var(--accent)' : 'var(--text-muted)' }}
                      aria-hidden
                    />
                    <p
                      className="text-xs font-medium"
                      style={{ color: h.is_ongoing ? 'var(--accent)' : 'var(--text-muted)' }}
                    >
                      {h.period_text}
                    </p>
                    <p className="text-sm text-ink">{h.title}</p>
                  </li>
                ))}
              </ol>
              {/* 태블릿+: 2/3열 그리드 (white 카드) */}
              <ol className="hidden rounded-lg border border-line bg-surface p-4 min-[740px]:grid min-[740px]:grid-cols-2 min-[740px]:gap-x-5 min-[740px]:gap-y-3 min-[1100px]:grid-cols-3">
                {history.map((h) => (
                  <li key={h.id} className="flex gap-2">
                    <span
                      className="mt-[7px] inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ background: h.is_ongoing ? 'var(--accent)' : 'var(--text-muted)' }}
                      aria-hidden
                    />
                    <div>
                      <p
                        className="text-xs font-medium"
                        style={{ color: h.is_ongoing ? 'var(--accent)' : 'var(--text-muted)' }}
                      >
                        {h.period_text}
                      </p>
                      <p className="text-sm text-ink">{h.title}</p>
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
