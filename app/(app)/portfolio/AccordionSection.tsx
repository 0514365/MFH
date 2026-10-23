'use client';
// MFH-PORTFOLIO-ACCORDION-SECTION-V2 — 2027(4-8): 타이틀 알약(연회색 알약 + 라벤더 8px 사각형 + 이름 + 건수 회색 + ▾), 펼친 내용은 흰 바탕·테두리 없음.
// MFH-PORTFOLIO-ACCORDION-SECTION-V1
// 편집 페이지 그룹 접이식 래퍼. 헤더(제목 + ▾) 클릭으로 본문 토글.
// 접힌 그룹의 입력은 unmount 되지만 controlled 상태는 부모(폼)가 보유 → 저장에 영향 없음.

import { useState, type ReactNode } from 'react';
import { LAVENDER_BLOCK } from './ui';

type Props = {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
};

export default function AccordionSection({ title, count, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-full bg-b27-card px-4 py-3 text-left transition active:opacity-80"
      >
        <i className="inline-block h-2 w-2 shrink-0 rounded-[2px]" style={{ background: LAVENDER_BLOCK }} aria-hidden />
        <span className="min-w-0 truncate text-[14px] font-medium text-b27-ink">{title}</span>
        {count != null && <span className="font-num text-[12px] text-b27-muted">{count}</span>}
        <span aria-hidden className={`ml-auto text-[12px] text-b27-muted transition-transform ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && <div className="px-0.5 pb-2 pt-4">{children}</div>}
    </section>
  );
}
