// MFH-PORTFOLIO-VIDEO-SUMMARY-V2
// 메인 공개페이지의 "사역 영상" = 사역 구분별 배너 그리드.
// 배너 클릭 → /p/[slug]/videos#cat-<카테고리id> (영상 목록 페이지의 해당 그룹으로 점프).
// 사역 성격별 파스텔 색을 sort_order 순서대로 배정(브랜드 토큰 palette.ts 미사용 — 배너 전용).
// 썸네일 있는 영상은 첫 영상 썸네일, 재생목록·Facebook 등은 같은 파스텔 그라데이션 placeholder.
// 서버 컴포넌트(Link 만). 영상 없으면 렌더 안 함.

import Link from 'next/link';
import type { PortfolioVideo, PortfolioVideoCategory } from '@/lib/portfolio';
import { youtubeThumbnailUrl } from '@/lib/portfolio';

type Props = {
  slug: string;
  categories: PortfolioVideoCategory[];
  videos: PortfolioVideo[];
};

// 사역 성격별 파스텔 팔레트 (배너 순서대로 배정):
// 노랑(어린이) · 피치(유치원) · 그린(방과후) · 라벤더(교회) · 블루(긴급구호) · 로즈(찬양)
const PALETTE = [
  { bg: '#FDF6D8', bd: '#E6C24A', nm: '#7E6116', ph1: '#F8E498', ph2: '#E6C24A' },
  { bg: '#FCEBDD', bd: '#E69E6E', nm: '#955227', ph1: '#F6C79E', ph2: '#E69E6E' },
  { bg: '#E4F2E5', bd: '#7FBC87', nm: '#3C7445', ph1: '#AEDBB3', ph2: '#7FBC87' },
  { bg: '#ECE6F6', bd: '#A186CE', nm: '#5A468A', ph1: '#C7B6E6', ph2: '#A186CE' },
  { bg: '#E2EEF7', bd: '#76A8CE', nm: '#33597D', ph1: '#A9CDE8', ph2: '#76A8CE' },
  { bg: '#FBE6EC', bd: '#DE8AA3', nm: '#8A3B54', ph1: '#F2B3C6', ph2: '#DE8AA3' },
];

export default function VideoSummary({ slug, categories, videos }: Props) {
  if (videos.length === 0) return null;

  // sort_order 순 카테고리 중 영상이 있는 것만 그룹화
  const groups = [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({
      cat: c,
      items: videos
        .filter((v) => v.category_id === c.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter((g) => g.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <section className="mt-8 min-[740px]:mt-10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="border-l-[3px] border-accent pl-2.5 text-base font-semibold text-primary min-[740px]:text-lg">
          사역 영상
        </h2>
        <Link
          href={`/p/${slug}/videos`}
          className="flex-shrink-0 rounded-md border border-line px-3.5 py-2 text-sm font-medium text-primary transition hover:border-primary"
        >
          전체 영상 보기 →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 min-[740px]:grid-cols-2">
        {groups.map((g, i) => {
          const c = PALETTE[i % PALETTE.length];
          const thumb = youtubeThumbnailUrl(g.items[0]?.youtube_url);
          return (
            <Link
              key={g.cat.id}
              href={`/p/${slug}/videos#cat-${g.cat.id}`}
              className="flex min-h-[76px] items-stretch overflow-hidden rounded-xl border shadow-sm transition hover:shadow-md"
              style={{ background: c.bg, borderColor: c.bd, borderLeftWidth: 4, borderLeftColor: c.bd }}
            >
              {/* 썸네일 / placeholder */}
              <div
                className="relative w-[112px] flex-shrink-0 bg-[#221C1C] min-[740px]:w-[130px]"
                style={thumb ? undefined : { background: `linear-gradient(135deg, ${c.ph1}, ${c.ph2})` }}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt={g.cat.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : null}
                <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="white" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </span>
              </div>

              {/* 사역명 */}
              <div className="flex min-w-0 flex-1 items-center px-4 py-3">
                <span
                  className="text-sm font-bold leading-snug min-[740px]:text-[15px]"
                  style={{ color: c.nm }}
                >
                  {g.cat.name}
                </span>
              </div>

              {/* chevron */}
              <span
                className="flex items-center pr-3.5 text-xl font-bold"
                style={{ color: c.bd }}
                aria-hidden
              >
                ›
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
