'use client';
// MFH-PORTFOLIO-ACCORDION-SECTION-V1
// 편집 페이지 그룹 접이식 래퍼. 헤더(제목 + ▾) 클릭으로 본문 토글.
// 접힌 그룹의 입력은 unmount 되지만 controlled 상태는 부모(폼)가 보유 → 저장에 영향 없음.

import { useState, type ReactNode } from 'react';

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export default function AccordionSection({ title, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-primary">{title}</span>
        <span aria-hidden className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && <div className="border-t border-line p-4">{children}</div>}
    </section>
  );
}
