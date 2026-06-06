// MFH-PORTFOLIO-EDIT-PAGE-V2
// /portfolio — 우진 본인이 포트폴리오 편집. 로그인 필요.
// V2: 셸 개편 — 고정 헤더(저장·공개토글)는 PortfolioForm 내부. 그룹 접이식(AccordionSection),
//     순서 ① 기본정보(외부링크 통합) ② 부부·선교사·후원(PortfolioForm) → 연혁 → 편지 → 영상(children).

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { PORTFOLIO_OWNER_ID, PUBLIC_PORTFOLIO_PATH } from '@/lib/members';
import type { Portfolio, PortfolioHistory, PortfolioVideo, PortfolioVideoCategory, PortfolioLetter } from '@/lib/portfolio';
import PortfolioForm from './PortfolioForm';
import AccordionSection from './AccordionSection';
import HistoryEditor from './HistoryEditor';
import VideoEditor from './VideoEditor';
import LetterEditor from './LetterEditor';

export const dynamic = 'force-dynamic';

export default async function PortfolioEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 포트폴리오 편집은 소유자(김우진)만 — 다른 멤버는 공개 페이지로.
  if (user.id !== PORTFOLIO_OWNER_ID) {
    redirect(PUBLIC_PORTFOLIO_PATH);
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

  const { data: videoCatRows } = await supabase
    .from('portfolio_video_categories')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true });

  const videoCategories = (videoCatRows ?? []) as PortfolioVideoCategory[];

  const { data: videoRows } = await supabase
    .from('portfolio_videos')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true });

  const videos = (videoRows ?? []) as PortfolioVideo[];

  const { data: letterRows } = await supabase
    .from('letters')
    .select('*')
    .eq('user_id', user.id)
    .order('year_month', { ascending: false })
    .order('sort_order', { ascending: true });

  const letters = (letterRows ?? []) as PortfolioLetter[];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10">
      <PortfolioForm initial={portfolio} userId={user.id}>
        <AccordionSection title="선교 연혁 관리">
          <HistoryEditor initial={history} userId={user.id} />
        </AccordionSection>

        <AccordionSection title="선교편지 관리">
          <LetterEditor initial={letters} userId={user.id} />
        </AccordionSection>

        <AccordionSection title="사역 영상 관리">
          <VideoEditor
            initialCategories={videoCategories}
            initialVideos={videos}
            userId={user.id}
          />
        </AccordionSection>
      </PortfolioForm>
    </div>
  );
}
