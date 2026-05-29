'use client';
// MFH-PORTFOLIO-SHARE-BUTTON-V1
// 공개 포트폴리오 주소공유 버튼(헤더 우측). 서버부모 BrandBar 의 client 자식.
// 동작: navigator.share(모바일 네이티브 공유) 우선 → 미지원 시 클립보드 복사 + "복사됨" 피드백.
// 공유 대상 = 현재 페이지 URL(window.location.href).

import { useState } from 'react';

export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const title = 'Mission for Honduras';

    // 1) 네이티브 공유(주로 모바일)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // 사용자가 취소했거나 실패 → 조용히 종료
        return;
      }
    }

    // 2) 클립보드 복사 폴백(주로 데스크탑)
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // 복사 실패 시 무시
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label="페이지 주소 공유"
      className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary min-[740px]:text-sm"
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-4 w-4">
        <path
          d="M18 8a3 3 0 1 0-2.82-4H15a3 3 0 0 0 .12 4.07L8.9 11.2a3 3 0 1 0 0 1.6l6.22 3.13A3 3 0 1 0 18 16a3 3 0 0 0-2.1.86L9.7 13.74a3 3 0 0 0 0-1.48l6.2-3.12A3 3 0 0 0 18 8z"
          fill="currentColor"
        />
      </svg>
      {copied ? '복사됨' : '주소공유'}
    </button>
  );
}
