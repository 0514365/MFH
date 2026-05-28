// MFH-PORTFOLIO-VIEW-V3
// 공개 readonly 뷰. 모바일(<740) / 태블릿(740~1099) / 데스크탑(>=1100) 3단계 반응형.
// 디자인 사양: MFH-PORTFOLIO-DESIGN.md v2
// V2: 선교사 소개 = MissionaryAccordion(접힘 개요→약력), 연혁 = HistoryAccordion(섹션 전체 접이식).
// V3: 상단 BrandBar(로고+SNS) + 가로 긴 배너 hero + 폰트 전반 상향 + 영상은 요약(VideoSummary)
//     으로 표시하고 전체는 /p/[slug]/videos 전용 페이지로 분리.

import type { Portfolio, PortfolioHistory, PortfolioVideo, PortfolioVideoCategory, PortfolioLetter } from '@/lib/portfolio';
import BrandBar from './BrandBar';
import VideoSummary from './VideoSummary';
import LetterSection from './LetterSection';
import MissionaryAccordion from './MissionaryAccordion';
import HistoryAccordion from './HistoryAccordion';

type LetterWithUrls = PortfolioLetter & { pdf_url: string | null; cover_url: string | null };

type Props = {
  portfolio: Portfolio;
  history: PortfolioHistory[];
  videoCategories?: PortfolioVideoCategory[];
  videos?: PortfolioVideo[];
  letters?: LetterWithUrls[];
};

export default function PortfolioView({ portfolio: p, history, videoCategories = [], videos = [], letters = [] }: Props) {
  const heroBg = p.hero_image_url
    ? { backgroundImage: `url(${p.hero_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'linear-gradient(135deg, #661F20 0%, #B61821 100%)' };

  const taglineNames = [p.missionary_a_name, p.missionary_b_name].filter(Boolean).join(' · ');

  return (
    <div style={{ background: 'var(--paper)', minHeight: '100vh' }}>
      {/* 최상단 브랜드 바: 로고 + SNS */}
      <BrandBar
        introVideoUrl={p.intro_video_url}
        youtubeUrl={p.youtube_url}
        facebookUrl={p.facebook_url}
      />

      <div className="mx-auto max-w-6xl px-4 py-6 min-[740px]:px-6 min-[740px]:py-8 min-[1100px]:px-8">

        {/* HERO: 가로 긴 배너 + 하단 그라데이션 위 텍스트 */}
        <section className="relative overflow-hidden rounded-xl border border-line">
          <div
            className="h-[200px] w-full min-[740px]:h-[300px] min-[1100px]:h-[360px]"
            style={heroBg}
            aria-label="포트폴리오 대표 이미지"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 min-[740px]:p-7 min-[1100px]:p-8">
            {taglineNames && (
              <span
                className="inline-block rounded-full px-3 py-1 text-sm font-medium"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {taglineNames}
              </span>
            )}
            <h1 className="mt-2.5 text-2xl font-bold text-white min-[740px]:text-3xl min-[1100px]:text-4xl">
              Mission for Honduras
            </h1>
            {p.intro_text && (
              <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-white/90 min-[740px]:text-base">
                {p.intro_text}
              </p>
            )}
            {p.email_public && (
              <p className="mt-2.5 text-sm text-white/85">
                <span aria-hidden>📧</span> {p.email_public}
              </p>
            )}
          </div>
        </section>

        {/* MAIN: 태블릿+ 2열 (선교사 좌측 / 연혁 우측) */}
        <div className="mt-6 grid grid-cols-1 gap-6 min-[740px]:mt-8 min-[740px]:grid-cols-[1fr_1.25fr] min-[740px]:gap-7 min-[1100px]:grid-cols-[320px_1fr]">

          {/* 선교사 (접이식: 부부 개요 → 약력) */}
          <section>
            <h2 className="border-l-[3px] border-accent pl-2.5 text-base font-semibold text-primary min-[740px]:text-lg">
              선교사 소개
            </h2>
            <div className="mt-3">
              <MissionaryAccordion
                couplePhotoUrl={p.couple_photo_url}
                coupleIntro={p.couple_intro}
                a={{ name: p.missionary_a_name, bio: p.missionary_a_bio }}
                b={{ name: p.missionary_b_name, bio: p.missionary_b_bio }}
              />
            </div>
          </section>

          {/* 연혁 (섹션 전체 접이식) */}
          <HistoryAccordion history={history} />
        </div>

        {/* 사역 영상 요약 (전체는 /p/[slug]/videos) */}
        <VideoSummary slug={p.slug} categories={videoCategories} videos={videos} />

        {/* 선교편지 (전체 폭) */}
        <LetterSection letters={letters} />

        {/* footer */}
        <footer className="mt-10 border-t border-line pt-5 text-center text-sm text-faint min-[740px]:mt-12">
          <p>Mission for Honduras · {p.email_public}</p>
        </footer>
      </div>
    </div>
  );
}
