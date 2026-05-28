// MFH-PORTFOLIO-VIDEOS-PAGE-V1
// /p/[slug]/videos — 공개 사역 영상 전체 목록 전용 페이지.
// 메인(/p/[slug])의 VideoSummary "전체 영상 보기" 에서 진입. 카테고리별 전체 그리드.

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import type { Portfolio, PortfolioVideo, PortfolioVideoCategory } from '@/lib/portfolio';
import BrandBar from '../BrandBar';
import VideoSection from '../VideoSection';

type Props = { params: { slug: string } };

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'MFH — 사역 영상', description: 'Mission for Honduras 사역 영상' };
}

export default async function PortfolioVideosPage({ params }: Props) {
  const supabase = createClient();

  const { data: portfolio } = await supabase
    .from('portfolio')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_public', true)
    .maybeSingle();

  if (!portfolio) {
    notFound();
  }

  const p = portfolio as Portfolio;

  const { data: catRows } = await supabase
    .from('portfolio_video_categories')
    .select('*')
    .eq('user_id', p.user_id)
    .order('sort_order', { ascending: true });

  const categories = (catRows ?? []) as PortfolioVideoCategory[];

  const { data: vidRows } = await supabase
    .from('portfolio_videos')
    .select('*')
    .eq('user_id', p.user_id)
    .order('sort_order', { ascending: true });

  const videos = (vidRows ?? []) as PortfolioVideo[];

  return (
    <div style={{ background: 'var(--paper)', minHeight: '100vh' }}>
      <BrandBar
        homeHref={`/p/${p.slug}`}
        introVideoUrl={p.intro_video_url}
        youtubeUrl={p.youtube_url}
        facebookUrl={p.facebook_url}
      />

      <div className="mx-auto max-w-6xl px-4 py-6 min-[740px]:px-6 min-[740px]:py-8 min-[1100px]:px-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-primary min-[740px]:text-3xl">사역 영상</h1>
          <Link
            href={`/p/${p.slug}`}
            className="flex-shrink-0 rounded-md border border-line px-3.5 py-2 text-sm font-medium text-primary transition hover:border-primary"
          >
            ← 포트폴리오
          </Link>
        </div>

        {videos.length === 0 ? (
          <p className="mt-6 text-sm text-faint">아직 등록된 영상이 없습니다.</p>
        ) : (
          <VideoSection categories={categories} videos={videos} showHeader={false} />
        )}

        <footer className="mt-10 border-t border-line pt-5 text-center text-sm text-faint min-[740px]:mt-12">
          <p>Mission for Honduras · {p.email_public}</p>
        </footer>
      </div>
    </div>
  );
}
