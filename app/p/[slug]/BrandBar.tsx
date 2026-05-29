// MFH-PORTFOLIO-BRAND-BAR-V2
// 공개 포트폴리오 최상단 얇은 헤더(1행). 좌측 컬러 로고 + 우측 이메일.
// 서버 컴포넌트(링크만). 메인(/p/[slug])과 영상 전용 페이지(/p/[slug]/videos)가 공유.
// V2: SNS·사역소개 링크는 히어로 하단으로 이동. 헤더는 로고+이메일만, 항상 1행.
// 로고 자산: /logo-primary.svg (public). homeHref 주면 로고 클릭 시 이동.

type Props = {
  homeHref?: string;
  emailPublic?: string | null;
};

export default function BrandBar({ homeHref, emailPublic }: Props) {
  const logo = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-primary.svg"
      alt="Mission for Honduras"
      className="h-[68px] w-auto min-[740px]:h-[90px]"
    />
  );

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 min-[740px]:px-6 min-[1100px]:px-8">
        {homeHref ? (
          <a href={homeHref} aria-label="포트폴리오 홈" className="inline-flex flex-shrink-0">
            {logo}
          </a>
        ) : (
          <span className="inline-flex flex-shrink-0">{logo}</span>
        )}

        {emailPublic && (
          <a
            href={`mailto:${emailPublic}`}
            className="flex min-w-0 items-center gap-1.5 text-xs text-muted transition hover:text-primary min-[740px]:text-sm"
          >
            <span aria-hidden>📧</span>
            <span className="truncate">{emailPublic}</span>
          </a>
        )}
      </div>
    </header>
  );
}
