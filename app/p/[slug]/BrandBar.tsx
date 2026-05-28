// MFH-PORTFOLIO-BRAND-BAR-V1
// 공개 포트폴리오 최상단 브랜드 바. 좌측 가로형 컬러 로고 + 우측 SNS 버튼.
// 서버 컴포넌트(링크만). 메인(/p/[slug])과 영상 전용 페이지(/p/[slug]/videos)가 공유.
// 로고 자산: /logo-primary.svg (public). homeHref 주면 로고 클릭 시 이동.

type Props = {
  homeHref?: string;
  introVideoUrl?: string | null;
  youtubeUrl?: string | null;
  facebookUrl?: string | null;
};

export default function BrandBar({ homeHref, introVideoUrl, youtubeUrl, facebookUrl }: Props) {
  const logo = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-primary.svg"
      alt="Mission for Honduras"
      className="h-8 w-auto min-[740px]:h-10"
    />
  );

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 min-[560px]:flex-row min-[560px]:items-center min-[560px]:justify-between min-[740px]:px-6 min-[740px]:py-4 min-[1100px]:px-8">
        {homeHref ? (
          <a href={homeHref} aria-label="포트폴리오 홈" className="inline-flex">
            {logo}
          </a>
        ) : (
          logo
        )}

        <nav className="flex flex-wrap items-center gap-2">
          {introVideoUrl && (
            <a
              href={introVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md px-3.5 py-2 text-sm font-medium text-white"
              style={{ background: 'var(--accent)' }}
            >
              사역소개
            </a>
          )}
          {youtubeUrl && (
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md px-3.5 py-2 text-sm font-medium text-white"
              style={{ background: '#221C1C' }}
            >
              YouTube
            </a>
          )}
          {facebookUrl && (
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md px-3.5 py-2 text-sm font-medium text-white"
              style={{ background: '#1877F2' }}
            >
              Facebook
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
