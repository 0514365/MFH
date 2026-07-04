// MFH-PORTFOLIO-LETTERS-PAGE-V1
// /p/[slug]/letters — 공개 선교편지 전체 목록 전용 페이지.
// 메인(/p/[slug])의 "선교편지 목록" 연도 카드에서 #year-YYYY 앵커로 진입.
// 사역 영상 전용 페이지(videos)와 동일 구조.

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import type { Portfolio, PortfolioLetter } from '@/lib/portfolio';
import BrandBar from '../BrandBar';
import LetterFullSection from '../LetterFullSection';
import HashScroll from '../HashScroll';
import OwnerBar from '@/components/OwnerBar';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'MFH — 선교편지', description: 'Mission for Honduras 선교편지' };
}

export default async function PortfolioLettersPage(props: Props) {
  const params = await props.params;
  const supabase = await createClient();

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

  const { data: letterRows } = await supabase
    .from('letters')
    .select('*')
    .eq('user_id', p.user_id)
    .eq('public_view', true)
    .order('year_month', { ascending: false })
    .order('sort_order', { ascending: true });

  const letters = ((letterRows ?? []) as PortfolioLetter[]).map((l) => ({
    ...l,
    pdf_url: l.pdf_path
      ? supabase.storage.from('portfolio-letters').getPublicUrl(l.pdf_path).data.publicUrl
      : null,
    // 모바일 편지는 스토리지 직링크가 아니라 뷰어 라우트로 (Storage 가 html 을 text/plain 으로 서빙 — V8)
    mobile_url: l.mobile_path ? `/letters/view/${l.id}` : null,
    cover_url: l.cover_path
      ? supabase.storage.from('portfolio-letters').getPublicUrl(l.cover_path).data.publicUrl
      : null,
  }));

  return (
    <div style={{ background: 'var(--paper)', minHeight: '100vh' }}>
      <OwnerBar userId={user?.id ?? null} />
      <BrandBar homeHref={`/p/${p.slug}`} />

      <div className="mx-auto max-w-6xl px-4 py-6 min-[740px]:px-6 min-[740px]:py-8 min-[1100px]:px-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-ink min-[740px]:text-3xl">선교편지</h1>
          <Link href={`/p/${p.slug}`} className="pf-btn pf-btn--outline flex-shrink-0">
            ← 포트폴리오
          </Link>
        </div>

        {letters.length === 0 ? (
          <p className="mt-6 text-sm text-faint">아직 등록된 선교편지가 없습니다.</p>
        ) : (
          <>
            <LetterFullSection letters={letters} />
            <HashScroll />
          </>
        )}

        <footer className="mt-10 border-t border-line pt-5 text-center text-sm text-faint min-[740px]:mt-12">
          <p>Mission for Honduras{p.email_public ? ` · ${p.email_public}` : ''}</p>
        </footer>
      </div>
    </div>
  );
}
