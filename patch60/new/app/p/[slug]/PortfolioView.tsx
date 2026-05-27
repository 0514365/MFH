// MFH-PORTFOLIO-VIEW-V1
// 공개 readonly 뷰. 모바일(<740) / 태블릿(740~1099) / 데스크탑(>=1100) 3단계 반응형.
// 디자인 사양: MFH-PORTFOLIO-DESIGN.md v2

import type { Portfolio, PortfolioHistory } from '@/lib/portfolio';

type Props = {
  portfolio: Portfolio;
  history: PortfolioHistory[];
};

export default function PortfolioView({ portfolio: p, history }: Props) {
  const heroBg = p.hero_image_url
    ? { backgroundImage: `url(${p.hero_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'linear-gradient(135deg, #F1E4E4 0%, #FAE3E4 100%)' };

  const taglineNames = [p.missionary_a_name, p.missionary_b_name].filter(Boolean).join(' · ');

  return (
    <div style={{ background: 'var(--paper)', minHeight: '100vh' }}>
      <div className="mx-auto max-w-6xl px-4 py-6 min-[740px]:px-6 min-[740px]:py-8 min-[1100px]:px-8">

        {/* HERO */}
        <section className="min-[740px]:bg-surface min-[740px]:rounded-lg min-[740px]:border min-[740px]:border-line min-[740px]:p-5 min-[1100px]:p-6">
          {/* 모바일: 세로 / 태블릿+: 가로 3열 */}
          <div className="grid grid-cols-1 gap-4 min-[740px]:grid-cols-[200px_1fr_auto] min-[740px]:items-center min-[1100px]:grid-cols-[280px_1fr_auto] min-[740px]:gap-5">
            {/* hero image */}
            <div
              className="h-[140px] rounded-md min-[740px]:h-[130px] min-[1100px]:h-[150px]"
              style={heroBg}
              aria-label="포트폴리오 대표 이미지"
            />
            {/* text */}
            <div>
              {taglineNames && (
                <span
                  className="inline-block rounded px-2 py-1 text-xs font-medium"
                  style={{ background: 'var(--accent-soft)', color: 'var(--primary)' }}
                >
                  {taglineNames}
                </span>
              )}
              <h1 className="mt-2 text-base font-medium text-ink min-[740px]:text-lg min-[1100px]:text-xl">
                Mission for Honduras
              </h1>
              {p.intro_text && (
                <p className="mt-2 text-xs leading-relaxed text-muted min-[740px]:text-sm">
                  {p.intro_text}
                </p>
              )}
              {p.email_public && (
                <p className="mt-2 text-xs text-muted">
                  <span aria-hidden>📧</span> {p.email_public}
                </p>
              )}
            </div>
            {/* SNS */}
            <div className="flex gap-2 min-[740px]:flex-col min-[740px]:gap-1.5">
              {p.intro_video_url && (
                <a
                  href={p.intro_video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-md px-3 py-2 text-center text-xs font-medium text-white min-[740px]:flex-none"
                  style={{ background: 'var(--accent)' }}
                >
                  사역소개
                </a>
              )}
              {p.youtube_url && (
                <a
                  href={p.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-md px-3 py-2 text-center text-xs font-medium text-white min-[740px]:flex-none"
                  style={{ background: '#221C1C' }}
                >
                  YouTube
                </a>
              )}
              {p.facebook_url && (
                <a
                  href={p.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-md px-3 py-2 text-center text-xs font-medium text-white min-[740px]:flex-none"
                  style={{ background: '#1877F2' }}
                >
                  Facebook
                </a>
              )}
            </div>
          </div>
        </section>

        {/* 모바일 섹션 띠 */}
        <div className="h-2 bg-surface-subtle min-[740px]:hidden" />

        {/* MAIN: 태블릿+ 2열 (선교사 좌측 / 연혁 우측) */}
        <div className="mt-4 grid grid-cols-1 gap-4 min-[740px]:mt-5 min-[740px]:grid-cols-[1fr_1.2fr] min-[740px]:gap-5 min-[1100px]:grid-cols-[260px_1fr]">

          {/* 선교사 */}
          <section>
            <h2 className="border-l-[3px] border-accent pl-2 text-sm font-medium text-primary">
              선교사 소개
            </h2>
            <div className="mt-3 space-y-2">
              {/* 김우진 (A — 위) */}
              {p.missionary_a_name && (
                <MissionaryCard
                  name={p.missionary_a_name}
                  photoUrl={p.missionary_a_photo_url}
                  bio={p.missionary_a_bio}
                />
              )}
              {/* 서진아 (B — 아래) */}
              {p.missionary_b_name && (
                <MissionaryCard
                  name={p.missionary_b_name}
                  photoUrl={p.missionary_b_photo_url}
                  bio={p.missionary_b_bio}
                />
              )}
            </div>
          </section>

          {/* 연혁 */}
          <section>
            <h2 className="border-l-[3px] border-accent pl-2 text-sm font-medium text-primary">
              선교 연혁
            </h2>
            <div className="mt-3">
              {history.length === 0 ? (
                <p className="text-xs text-faint">아직 연혁이 등록되지 않았습니다.</p>
              ) : (
                <>
                  {/* 모바일: 세로 라인 + 점 */}
                  <ol className="relative space-y-3 border-l-[1.5px] border-primary-soft pl-4 min-[740px]:hidden">
                    {history.map((h) => (
                      <li key={h.id} className="relative">
                        <span
                          className="absolute -left-[22px] top-1 inline-block h-2 w-2 rounded-full border-2 border-surface"
                          style={{ background: h.is_ongoing ? 'var(--accent)' : 'var(--text-muted)' }}
                          aria-hidden
                        />
                        <p
                          className="text-[11px] font-medium"
                          style={{ color: h.is_ongoing ? 'var(--accent)' : 'var(--text-muted)' }}
                        >
                          {h.period_text}
                        </p>
                        <p className="text-xs text-ink">{h.title}</p>
                      </li>
                    ))}
                  </ol>
                  {/* 태블릿+: 2/3열 그리드 (white 카드) */}
                  <ol className="hidden rounded-md border border-line bg-surface p-3 min-[740px]:grid min-[740px]:grid-cols-2 min-[740px]:gap-x-4 min-[740px]:gap-y-2 min-[1100px]:grid-cols-3">
                    {history.map((h) => (
                      <li key={h.id} className="flex gap-2">
                        <span
                          className="mt-[6px] inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                          style={{ background: h.is_ongoing ? 'var(--accent)' : 'var(--text-muted)' }}
                          aria-hidden
                        />
                        <div>
                          <p
                            className="text-[10px] font-medium"
                            style={{ color: h.is_ongoing ? 'var(--accent)' : 'var(--text-muted)' }}
                          >
                            {h.period_text}
                          </p>
                          <p className="text-xs text-ink">{h.title}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          </section>
        </div>

        {/* footer */}
        <footer className="mt-8 border-t border-line pt-4 text-center text-[11px] text-faint min-[740px]:mt-10">
          <p>Mission for Honduras · {p.email_public}</p>
        </footer>
      </div>
    </div>
  );
}

function MissionaryCard({
  name,
  photoUrl,
  bio,
}: {
  name: string;
  photoUrl: string | null;
  bio: string | null;
}) {
  return (
    <div className="rounded-md border border-line bg-surface p-3">
      <div className="flex gap-3 min-[1100px]:flex-col min-[1100px]:items-center min-[1100px]:text-center">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={name}
            className="h-[72px] w-[60px] flex-shrink-0 rounded-md object-cover min-[1100px]:h-[80px] min-[1100px]:w-[70px]"
          />
        ) : (
          <div
            className="flex h-[72px] w-[60px] flex-shrink-0 items-center justify-center rounded-md text-[10px] text-muted min-[1100px]:h-[80px] min-[1100px]:w-[70px]"
            style={{ background: 'var(--primary-soft)' }}
          >
            사진
          </div>
        )}
        <div className="min-w-0 flex-1 min-[1100px]:flex-none">
          <p className="text-sm font-medium text-primary">{name}</p>
          {bio && (
            <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-muted">
              {bio}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
