'use client';
// MFH-PORTFOLIO-HASH-SCROLL-V1
// 해시(#year-YYYY 등)로 진입 시 해당 요소로 정확히 스크롤. 이미지 로딩에 따른
// 레이아웃 시프트로 브라우저 기본 해시 스크롤이 어긋나는 것을 재보정한다(CSS scroll-margin 존중).

import { useEffect } from 'react';

export default function HashScroll() {
  useEffect(() => {
    const id = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));
    if (!id) return;

    const scrollToTarget = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ block: 'start' });
    };

    scrollToTarget();
    // 이미지·폰트 로딩으로 높이가 변하므로 몇 차례 재보정
    const timers = [80, 300, 700].map((ms) => window.setTimeout(scrollToTarget, ms));
    window.addEventListener('load', scrollToTarget);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('load', scrollToTarget);
    };
  }, []);

  return null;
}
