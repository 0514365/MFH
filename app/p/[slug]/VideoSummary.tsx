// MFH-PORTFOLIO-VIDEO-SUMMARY-V1
// 메인 공개페이지의 "사역 영상" 요약. 대표 썸네일 몇 개 + 카테고리 칩 + 전체보기 링크.
// 전체 목록은 /p/[slug]/videos 전용 페이지(VideoSection)로 분리.
// 서버 컴포넌트(Link 만). 영상 없으면 렌더 안 함.

import Link from 'next/link';
import type { PortfolioVideo, PortfolioVideoCategory } from '@/lib/portfolio';
import { youtubeThumbnailUrl, youtubeWatchUrl } from '@/lib/portfolio';

type Props = {
  slug: string;
  categories: PortfolioVideoCategory[];
  videos: PortfolioVideo[];
};

export default function VideoSummary({ slug, categories, videos }: Props) {
  if (videos.length === 0) return null;

  // sort_order 순 정렬 후 대표 썸네일 4개
  const ordered = [...videos].sort((a, b) => a.sort_order - b.sort_order);
  const featured = ordered.slice(0, 4);
  const catNames = [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => c.name)
    .filter((n) => videos.some((v) => categories.find((c) => c.id === v.category_id)?.name === n));

  return (
    <section className="mt-8 min-[740px]:mt-10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="border-l-[3px] border-accent pl-2.5 text-base font-semibold text-primary min-[740px]:text-lg">
          사역 영상
          <span className="ml-2 text-sm font-normal text-faint">{videos.length}편</span>
        </h2>
        <Link
          href={`/p/${slug}/videos`}
          className="flex-shrink-0 rounded-md border border-line px-3.5 py-2 text-sm font-medium text-primary transition hover:border-primary"
        >
          전체 영상 보기 →
        </Link>
      </div>

      {catNames.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {catNames.map((name) => (
            <span
              key={name}
              className="rounded-full bg-surface-subtle px-3 py-1 text-xs text-muted min-[740px]:text-sm"
            >
              {name}
            </span>
          ))}
        </div>
      )}

      <ul className="mt-4 grid grid-cols-2 gap-3 min-[740px]:grid-cols-4">
        {featured.map((v) => (
          <li key={v.id}>
            <a
              href={youtubeWatchUrl(v.youtube_url) ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg border border-line bg-surface transition hover:border-primary"
            >
              <Thumb url={v.youtube_url} title={v.title} year={v.year} />
              <p className="px-3 py-2.5 text-sm leading-snug text-ink">{v.title}</p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Thumb({ url, title, year }: { url: string; title: string; year: number | null }) {
  const thumb = youtubeThumbnailUrl(url);
  return (
    <div className="relative aspect-video bg-[#221C1C]">
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt={title} loading="lazy" className="h-full w-full object-cover" />
      ) : null}
      <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
      {year ? (
        <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {year}
        </span>
      ) : null}
    </div>
  );
}
