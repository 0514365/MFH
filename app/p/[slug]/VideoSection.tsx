// MFH-PORTFOLIO-VIDEO-SECTION-V5
// 공개 readonly 사역 영상 섹션 — 카테고리별 그룹 + Airbnb 카드 그리드(1/2/3/4열).
// 클릭 시 새 탭 watch.
// V5: Airbnb-Style 테마 — 그라데이션 배너 그룹 타이틀 → 잉크 소제목(.pf-group-title),
//     영상 카드 = .pf-vcard(둥근 16:9 썸네일 + 중립 재생 오버레이 + 호버 그림자).
//     showHeader=false 면 섹션 헤더 생략(전용 페이지 자체 타이틀 사용).

import type { PortfolioVideo, PortfolioVideoCategory } from '@/lib/portfolio';
import { youtubeWatchUrl, videoThumbnail } from '@/lib/portfolio';

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
        <div className="pf-section-head">
          <h2 className="pf-section-title">사역 영상</h2>
          <p className="pf-section-sub">Ministry in action</p>
        </div>
      )}
      <div className={`${showHeader ? 'mt-4' : ''} space-y-9`}>
        {groups.map((g) => (
          <div key={g.key} id={`cat-${g.key}`} className="scroll-mt-6 min-[740px]:scroll-mt-8">
            <h3 className="pf-group-title mb-4 flex items-center gap-2">
              {g.name}
              <span className="pf-count-badge">{g.items.length}개</span>
            </h3>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-6 min-[740px]:grid-cols-3 min-[1100px]:grid-cols-4">
              {g.items.map((v) => {
                const thumb = videoThumbnail(v);
                return (
                  <li key={v.id}>
                    <a
                      href={youtubeWatchUrl(v.youtube_url) ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pf-vcard"
                    >
                      <div className="pf-media">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt={v.title} loading="lazy" />
                        ) : null}
                        <span className="pf-media__play" aria-hidden>
                          <span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </span>
                        </span>
                        {v.year ? <span className="pf-media__badge">{v.year}</span> : null}
                      </div>
                      <div className="pf-card-title">{v.title}</div>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
