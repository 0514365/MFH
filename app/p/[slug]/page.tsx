// MFH-PORTFOLIO-PUBLIC-PAGE-V3
// /p/[slug] — 공개 readonly. 로그인 불필요.
// RLS 의 public_read 정책 (is_public=true) 로 접근.
// V2: 비로그인 방문자에게 오프닝(SplashGate) 표시. 로그인 상태면 건너뜀(skip).
// V3: 공유 링크 미리보기(Open Graph/Twitter) 메타 추가 — og:image=브랜드 로고 카드(/og-image.png)로 고정.

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import type { Portfolio, PortfolioHistory, PortfolioVideo, PortfolioVideoCategory, PortfolioLetter } from '@/lib/portfolio';
import PortfolioView from './PortfolioView';
import PrayerCta from './PrayerCta';
import SplashGate from '@/app/SplashGate';
import OwnerBar from '@/components/OwnerBar';

type Props = { params: { slug: string } };

// 공유 링크 미리보기(Open Graph)에 쓸 공개 도메인.
const SITE_URL = 'https://mfh-snowy.vercel.app';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase
    .from('portfolio')
    .select('intro_text, missionary_a_name, missionary_b_name')
    .eq('slug', params.slug)
    .eq('is_public', true)
    .maybeSingle();

  const names = data
    ? [data.missionary_a_name, data.missionary_b_name].filter(Boolean).join(' · ')
    : '';
  const title = `MFH — ${names || 'Mission for Honduras'}`;
  const description = data?.intro_text ?? '온두라스 선교사역 — 기록·인사이트·포트폴리오';
  const url = `${SITE_URL}/p/${params.slug}`;

  // og:image 를 브랜드 로고 카드로 고정 → 카카오톡·WhatsApp·iMessage 등에서 일관되게 로고 표시.
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    openGraph: {
      type: 'website',
      url,
      siteName: 'Mission for Honduras',
      title,
      description,
      locale: 'ko_KR',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Mission for Honduras' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
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
      <OwnerBar userId={user?.id ?? null} />
      <PortfolioView
        portfolio={p}
        history={history}
        videoCategories={videoCategories}
        videos={videos}
        letters={letters}
      />
      <PrayerCta slug={params.slug} />
    </SplashGate>
  );
}
