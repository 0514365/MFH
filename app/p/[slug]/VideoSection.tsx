// MFH-PORTFOLIO-VIDEO-SECTION-V3
// 공개 readonly 사역 영상 섹션. 카테고리별 H3 그룹 + 반응형 그리드(1/2/3열).
// 썸네일은 YouTube hqdefault 자동. 클릭 시 새 탭 watch.
// 영상 없는 카테고리는 렌더 안 함.
// V2: 영상 전용 페이지(/p/[slug]/videos)에서 전체 표시. 폰트 전반 상향(가독성).
//     showHeader=false 면 섹션 헤더 생략(전용 페이지에서 자체 타이틀 사용).
// V3: 각 그룹에 앵커 id="cat-<카테고리id>" 부여 → 메인페이지 배너에서 점프(scroll-mt 여백).

import type { PortfolioVideo, PortfolioVideoCategory } from '@/lib/portfolio';
import { youtubeThumbnailUrl, youtubeWatchUrl } from '@/lib/portfolio';

type Props = {
  categories: PortfolioVideoCategory[];
  videos: PortfolioVideo[];
  showHeader?: boolean;
};

export default function VideoSection({ categories, videos, showHeader = true }: Props) {
  if (videos.length === 0) return null;

  // 카테고리별 그룹 (sort_order 순). category_id null 인 영상은 '기타' 그룹으로.
  const sortedCats = [...categories].sort((a, b) => a.sort_order - b.sort_order);
  const groups: { key: string; name: string; items: PortfolioVideo[] }[] = [];

  for (const cat of sortedCats) {
    const items = videos
      .filter((v) => v.category_id === cat.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (items.length > 0) {
      groups.push({ key: cat.id, name: cat.name, items });
    }
  }

  // 카테고리 미지정 영상
  const orphans = videos
    .filter((v) => !v.category_id || !sortedCats.some((c) => c.id === v.category_id))
    .sort((a, b) => a.sort_order - b.sort_order);
  if (orphans.length > 0) {
    groups.push({ key: '__orphan__', name: '기타', items: orphans });
  }

  if (groups.length === 0) return null;

  return (
    <section className="mt-4 min-[740px]:mt-5">
      {showHeader && (
        <h2 className="border-l-[3px] border-accent pl-2.5 text-base font-semibold text-primary min-[740px]:text-lg">
          사역 영상
        </h2>
      )}
      <div className={`${showHeader ? 'mt-4' : ''} space-y-7`}>
        {groups.map((g) => (
          <div key={g.key} id={`cat-${g.key}`} className="scroll-mt-6 min-[740px]:scroll-mt-8">
            <h3 className="mb-3 text-sm font-semibold text-ink min-[740px]:text-base">{g.name}</h3>
            <ul className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 min-[1100px]:grid-cols-3">
              {g.items.map((v) => (
                <li key={v.id}>
                  <a
                    href={youtubeWatchUrl(v.youtube_url) ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-lg border border-line bg-surface transition hover:border-primary"
                  >
                    <VideoThumb url={v.youtube_url} year={v.year} title={v.title} />
                    <p className="px-3 py-2.5 text-sm leading-snug text-ink">
                      {v.title}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function VideoThumb({
  url,
  year,
  title,
}: {
  url: string;
  year: number | null;
  title: string;
}) {
  const thumb = youtubeThumbnailUrl(url);
  return (
    <div className="relative aspect-video bg-[#221C1C]">
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : null}
      {/* play overlay */}
      <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
      {year ? (
        <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
          {year}
        </span>
      ) : null}
    </div>
  );
}
