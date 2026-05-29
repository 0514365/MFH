// MFH-PORTFOLIO-VIEW-V6
// 공개 readonly 뷰. 모바일(<740) / 태블릿(740~1099) / 데스크탑(>=1100) 3단계 반응형.
// V6: 섹션 순서 변경 — 선교편지(LetterSection)를 사역 영상(VideoSummary) 위로 이동.
// 디자인 사양: MFH-PORTFOLIO-DESIGN.md v2
// V2: 선교사 소개 = MissionaryAccordion(접힘 개요→약력), 연혁 = HistoryAccordion(섹션 전체 접이식).
// V3: 상단 BrandBar(로고+SNS) + 가로 긴 배너 hero + 폰트 전반 상향 + 영상은 요약(VideoSummary)
//     으로 표시하고 전체는 /p/[slug]/videos 전용 페이지로 분리.
// V4: 헤더=로고+이메일(얇은 1행). 히어로 사진 우하단=흰색 로고+선교사명. 사진 하단=유튜브/페이스북
//     링크. 인트로 텍스트는 사진 아래로.
// V5: 데스크탑(≥1100) 선교사 소개 재디자인 = MissionaryDesktop(사진 크게 + 요약 글상자 + 약력 2열),
//     연혁은 그 아래 전체폭 접이식(grid 1열로 reflow). 모바일·태블릿(<1100)은 현행 유지.
//     「선교사 소개」 타이틀 옆에 사역소개영상(intro_video_url) 링크 추가(전 폭 공통).

import type { Portfolio, PortfolioHistory, PortfolioVideo, PortfolioVideoCategory, PortfolioLetter } from '@/lib/portfolio';
import { youtubeWatchUrl } from '@/lib/portfolio';
import BrandBar from './BrandBar';
import VideoSummary from './VideoSummary';
import LetterSection from './LetterSection';
import MissionaryAccordion from './MissionaryAccordion';
import MissionaryDesktop from './MissionaryDesktop';
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
      {/* 최상단 브랜드 바: 로고 + 주소공유 (얇은 1행) */}
      <BrandBar />

      <div className="mx-auto max-w-6xl px-4 py-6 min-[740px]:px-6 min-[740px]:py-8 min-[1100px]:px-8">

        {/* HERO: 가로 긴 배너 + 우하단 흰색 로고 / 선교사명 */}
        <section className="relative overflow-hidden rounded-xl border border-line">
          <div
            className="h-[220px] w-full min-[740px]:h-[340px] min-[1100px]:h-[420px]"
            style={heroBg}
            aria-label="포트폴리오 대표 이미지"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
          <h1 className="sr-only">Mission for Honduras</h1>
          <div className="absolute inset-x-0 bottom-0 flex justify-end p-4 min-[740px]:p-6">
            <div className="flex flex-col items-end gap-2 text-right">
              {/* 1행: 유튜브·페이스북(작게) + MFH 흰색 로고(크게), 하단 베이스라인 정렬 */}
              <div className="flex items-end gap-3">
                {(p.youtube_url || p.facebook_url) && (
                  <div className="flex items-center gap-2">
                    {p.youtube_url && (
                      <a
                        href={p.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="YouTube"
                        className="flex h-5 w-5 items-center justify-center rounded-full text-white shadow-md transition hover:opacity-90 min-[740px]:h-[42px] min-[740px]:w-[42px]"
                        style={{ background: '#FF0000' }}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-3 w-3 min-[740px]:h-6 min-[740px]:w-6">
                          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.5 15.5v-7l6.3 3.5-6.3 3.5z" />
                        </svg>
                      </a>
                    )}
                    {p.facebook_url && (
                      <a
                        href={p.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Facebook"
                        className="flex h-5 w-5 items-center justify-center rounded-full text-white shadow-md transition hover:opacity-90 min-[740px]:h-[42px] min-[740px]:w-[42px]"
                        style={{ background: '#1877F2' }}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-3 w-3 min-[740px]:h-6 min-[740px]:w-6">
                          <path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7v-3.5h3.1V9.4c0-3 1.8-4.7 4.6-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.2h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />
                        </svg>
                      </a>
                    )}
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-white.svg"
                  alt="Mission for Honduras"
                  className="h-7 w-auto drop-shadow-md min-[740px]:h-[60px]"
                />
              </div>
              {taglineNames && (
                <span className="text-base font-semibold text-white drop-shadow-md min-[740px]:text-3xl">
                  {taglineNames}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* MAIN: 태블릿(740~1099) 2열 (선교사 좌 / 연혁 우) → 데스크탑(≥1100) 1열로 reflow */}
        <div className="mt-6 grid grid-cols-1 gap-6 min-[740px]:mt-8 min-[740px]:grid-cols-[1fr_1.25fr] min-[740px]:gap-7 min-[1100px]:grid-cols-1">

          {/* 선교사 (모바일·태블릿: 접이식 / 데스크탑: 사진+요약+약력 2열) */}
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="border-l-[3px] border-accent pl-2.5 text-base font-semibold text-primary min-[740px]:text-lg">
                선교사 소개
              </h2>
              {p.intro_video_url && (
                <a
                  href={youtubeWatchUrl(p.intro_video_url) ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-primary transition hover:border-primary"
                >
                  <span
                    className="flex h-[18px] w-[18px] items-center justify-center rounded-full"
                    style={{ background: '#FF0000' }}
                    aria-hidden
                  >
                    <svg viewBox="0 0 24 24" fill="#fff" className="h-2.5 w-2.5">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  사역소개영상
                </a>
              )}
            </div>

            {/* 모바일·태블릿(<1100): 접이식 */}
            <div className="mt-3 min-[1100px]:hidden">
              <MissionaryAccordion
                couplePhotoUrl={p.couple_photo_url}
                coupleIntro={p.couple_intro}
                a={{ name: p.missionary_a_name, bio: p.missionary_a_bio }}
                b={{ name: p.missionary_b_name, bio: p.missionary_b_bio }}
              />
            </div>

            {/* 데스크탑(≥1100): 사진 크게 + 요약 글상자 + 약력 2열 */}
            <div className="mt-3 hidden min-[1100px]:block">
              <MissionaryDesktop
                couplePhotoUrl={p.couple_photo_url}
                coupleIntro={p.couple_intro}
                a={{ name: p.missionary_a_name, bio: p.missionary_a_bio }}
                b={{ name: p.missionary_b_name, bio: p.missionary_b_bio }}
              />
            </div>
          </section>

          {/* 연혁 (섹션 전체 접이식) — 데스크탑에선 grid 1열 reflow 로 전체폭 아래 배치 */}
          <HistoryAccordion history={history} />
        </div>

        {/* 선교편지 (전체 폭) — 사역 영상 위 */}
        <LetterSection letters={letters} />

        {/* 사역 영상 요약 (전체는 /p/[slug]/videos) */}
        <VideoSummary slug={p.slug} categories={videoCategories} videos={videos} />

        {/* footer: 후원방법 + SNS 링크 + 카피 */}
        <footer className="mt-10 border-t border-line pt-7 min-[740px]:mt-12">
          {/* 후원방법 (donation_info 있을 때만) */}
          {p.donation_info && p.donation_info.trim() && (
            <div className="mx-auto max-w-md rounded-xl border border-line bg-surface p-5 text-center">
              <h2 className="border-l-[3px] border-accent pl-2.5 text-left text-base font-semibold text-primary">
                후원방법
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink">
                {p.donation_info}
              </p>
            </div>
          )}

          {/* SNS 링크 */}
          {(p.youtube_url || p.facebook_url) && (
            <div className="mt-6 flex items-center justify-center gap-3">
              {p.youtube_url && (
                <a
                  href={p.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm transition hover:opacity-90"
                  style={{ background: '#FF0000' }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-6 w-6">
                    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.5 15.5v-7l6.3 3.5-6.3 3.5z" />
                  </svg>
                </a>
              )}
              {p.facebook_url && (
                <a
                  href={p.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm transition hover:opacity-90"
                  style={{ background: '#1877F2' }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-6 w-6">
                    <path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7v-3.5h3.1V9.4c0-3 1.8-4.7 4.6-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.2h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />
                  </svg>
                </a>
              )}
            </div>
          )}

          {/* 카피 */}
          <p className="mt-7 text-center text-sm text-faint">
            Mission for Honduras{p.email_public ? ` · ${p.email_public}` : ''}
          </p>
        </footer>
      </div>
    </div>
  );
}
