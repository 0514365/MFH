// MFH-PORTFOLIO-PUBLIC-PAGE-V1
// /p/[slug] — 공개 readonly. 로그인 불필요.
// RLS 의 public_read 정책 (is_public=true) 로 접근.

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import type { Portfolio, PortfolioHistory } from '@/lib/portfolio';
import PortfolioView from './PortfolioView';

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

  return <PortfolioView portfolio={p} history={history} />;
}
