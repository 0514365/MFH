// MFH-PORTFOLIO-VIDEO-SUMMARY-V4
// 메인 공개페이지의 "사역 영상" = 사역 구분별 카드 그리드.
// 카드 클릭 → /p/[slug]/videos#cat-<카테고리id> (영상 목록 페이지의 해당 그룹으로 점프).
// V4: Airbnb-Style 테마(.portfolio-theme) 적용 — 마룬 가로 배너 → 흰 카드 + 큰 썸네일 그리드(.pf-vcard).
//     썸네일 우선순위 = 커스텀 → YouTube → surface placeholder(재생 오버레이).
// 서버 컴포넌트(Link 만). 영상 없으면 렌더 안 함.

import Link from 'next/link';
import type { PortfolioVideo, PortfolioVideoCategory } from '@/lib/portfolio';
import { videoThumbnail } from '@/lib/portfolio';

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
        <div className="pf-section-head">
          <h2 className="pf-section-title">사역 영상</h2>
          <p className="pf-section-sub">Ministry in action</p>
        </div>
        <Link href={`/p/${slug}/videos`} className="pf-btn pf-btn--outline pf-btn--pill flex-shrink-0">
          전체 영상 보기 →
        </Link>
      </div>

      {/* Airbnb 리스팅 카드 그리드: 큰 썸네일(16:9 둥근 모서리) + 사역명 + 영상 수 */}
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 min-[740px]:grid-cols-3 min-[1100px]:grid-cols-4">
        {groups.map((g) => {
          const thumb = videoThumbnail(g.items[0] ?? { thumbnail_url: null, youtube_url: '' });
          return (
            <Link key={g.cat.id} href={`/p/${slug}/videos#cat-${g.cat.id}`} className="pf-vcard">
              <div
                className="pf-media"
                style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
              >
                <span className="pf-media__play" aria-hidden>
                  <span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </span>
              </div>
              <div className="pf-card-title">{g.cat.name}</div>
              <div className="mt-1">
                <span className="pf-count-badge">영상 {g.items.length}개</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
