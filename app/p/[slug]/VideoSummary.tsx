// MFH-PORTFOLIO-VIDEO-SUMMARY-V3
// 메인 공개페이지의 "사역 영상" = 사역 구분별 배너 그리드.
// 배너 클릭 → /p/[slug]/videos#cat-<카테고리id> (영상 목록 페이지의 해당 그룹으로 점프).
// V3: 브랜드 마룬 그라데이션 배너(옅음→진함, 각 배너 가로 그라데이션, VIDEO_BANNER_RAMP 공유).
//     썸네일 우선순위 = 커스텀 → YouTube → 그라데이션 placeholder.
// 서버 컴포넌트(Link 만). 영상 없으면 렌더 안 함.

import Link from 'next/link';
import type { PortfolioVideo, PortfolioVideoCategory } from '@/lib/portfolio';
import { videoThumbnail, videoBannerStyle } from '@/lib/portfolio';

type Props = {
  slug: string;
  categories: PortfolioVideoCategory[];
  videos: PortfolioVideo[];
};

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
          const c = videoBannerStyle(i);
          const thumb = videoThumbnail(g.items[0] ?? { thumbnail_url: null, youtube_url: '' });
          return (
            <Link
              key={g.cat.id}
              href={`/p/${slug}/videos#cat-${g.cat.id}`}
              className="flex min-h-[78px] items-stretch overflow-hidden rounded-xl shadow-sm transition hover:shadow-md"
              style={{ background: `linear-gradient(90deg, ${c.from}, ${c.to})` }}
            >
              {/* 썸네일 (없으면 투명 → 배너 그라데이션 노출 + ▶) */}
              <div
                className="relative w-[112px] flex-shrink-0 bg-cover bg-center min-[740px]:w-[130px]"
                style={thumb ? { backgroundImage: `url(${thumb})`, backgroundColor: '#221C1C' } : undefined}
              >
                <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40">
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
                  style={{ color: c.text }}
                >
                  {g.cat.name}
                </span>
              </div>

              {/* chevron */}
              <span
                className="flex items-center pr-3.5 text-xl font-bold opacity-80"
                style={{ color: c.text }}
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
