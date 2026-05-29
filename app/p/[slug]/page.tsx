// MFH-PORTFOLIO-PUBLIC-PAGE-V2
// /p/[slug] — 공개 readonly. 로그인 불필요.
// RLS 의 public_read 정책 (is_public=true) 로 접근.
// V2: 비로그인 방문자에게 오프닝(SplashGate) 표시. 로그인 상태면 건너뜀(skip).

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import type { Portfolio, PortfolioHistory, PortfolioVideo, PortfolioVideoCategory, PortfolioLetter } from '@/lib/portfolio';
import PortfolioView from './PortfolioView';
import SplashGate from '@/app/SplashGate';

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase
    .from('portfolio')
    .select('intro_text, missionary_a_name, missionary_b_name')
    .eq('slug', params.slug)
    .eq('is_public', true)
    .maybeSingle();
  if (!data) {
    return { title: 'MFH — Mission for Honduras' };
  }
  const names = [data.missionary_a_name, data.missionary_b_name].filter(Boolean).join(' · ');
  return {
    title: `MFH — ${names || 'Mission for Honduras'}`,
    description: data.intro_text ?? '온두라스 선교사역',
  };
}

export default async function PublicPortfolioPage({ params }: Props) {
  const supabase = createClient();

  // 로그인 상태면 오프닝 건너뜀(소유자가 자기 공개페이지를 볼 때)
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const { data: historyRows } = await supabase
    .from('portfolio_history')
    .select('*')
    .eq('user_id', p.user_id)
    .order('sort_order', { ascending: true });

  const history = (historyRows ?? []) as PortfolioHistory[];

  const { data: videoCatRows } = await supabase
    .from('portfolio_video_categories')
    .select('*')
    .eq('user_id', p.user_id)
    .order('sort_order', { ascending: true });

  const videoCategories = (videoCatRows ?? []) as PortfolioVideoCategory[];

  const { data: videoRows } = await supabase
    .from('portfolio_videos')
    .select('*')
    .eq('user_id', p.user_id)
    .order('sort_order', { ascending: true });

  const videos = (videoRows ?? []) as PortfolioVideo[];

  const { data: letterRows } = await supabase
    .from('letters')
    .select('*')
    .eq('user_id', p.user_id)
    .eq('public_view', true)
    .order('year_month', { ascending: false })
    .order('sort_order', { ascending: true });

  const letters = ((letterRows ?? []) as PortfolioLetter[]).map((l) => ({
    ...l,
    pdf_url: supabase.storage.from('portfolio-letters').getPublicUrl(l.pdf_path).data.publicUrl,
    cover_url: l.cover_path
      ? supabase.storage.from('portfolio-letters').getPublicUrl(l.cover_path).data.publicUrl
      : null,
  }));

  return (
    <SplashGate skip={!!user}>
      <PortfolioView
        portfolio={p}
        history={history}
        videoCategories={videoCategories}
        videos={videos}
        letters={letters}
      />
    </SplashGate>
  );
}
