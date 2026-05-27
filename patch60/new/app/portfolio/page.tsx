// MFH-PORTFOLIO-EDIT-PAGE-V1
// /portfolio — 우진 본인이 포트폴리오 편집. 로그인 필요.

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import type { Portfolio, PortfolioHistory } from '@/lib/portfolio';
import PortfolioForm from './PortfolioForm';
import HistoryEditor from './HistoryEditor';

export const dynamic = 'force-dynamic';

export default async function PortfolioEditPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: portfolioRow } = await supabase
    .from('portfolio')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const portfolio = (portfolioRow ?? null) as Portfolio | null;

  const { data: historyRows } = await supabase
    .from('portfolio_history')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true });

  const history = (historyRows ?? []) as PortfolioHistory[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-medium text-primary">포트폴리오 편집</h1>
        {portfolio?.slug && portfolio.is_public && (
          <Link
            href={`/p/${portfolio.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft"
          >
            공개 페이지 보기 ↗
          </Link>
        )}
      </header>

      <PortfolioForm initial={portfolio} userId={user.id} />

      <div className="mt-8">
        <HistoryEditor initial={history} userId={user.id} />
      </div>
    </div>
  );
}
