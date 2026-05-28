-- MFH patch61 — 사역 영상 (portfolio_video_categories + portfolio_videos)
-- Supabase SQL Editor 에서 한 번에 실행.
-- RLS: 본인 CRUD + 공개 포트폴리오(is_public)의 영상은 anon SELECT 허용.

-- =====================================================================
-- 1) 카테고리 테이블
-- =====================================================================
create table if not exists public.portfolio_video_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.portfolio_video_categories enable row level security;

-- 본인 전체 CRUD
drop policy if exists "pvc_owner_all" on public.portfolio_video_categories;
create policy "pvc_owner_all"
  on public.portfolio_video_categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 공개 포트폴리오 소유자의 카테고리는 anon 도 읽기 가능
drop policy if exists "pvc_public_read" on public.portfolio_video_categories;
create policy "pvc_public_read"
  on public.portfolio_video_categories
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.portfolio p
      where p.user_id = portfolio_video_categories.user_id
        and p.is_public = true
    )
  );

-- =====================================================================
-- 2) 영상 테이블
-- =====================================================================
create table if not exists public.portfolio_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  category_id uuid references public.portfolio_video_categories on delete set null,
  title text not null,
  youtube_url text not null,
  year int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.portfolio_videos enable row level security;

drop policy if exists "pv_owner_all" on public.portfolio_videos;
create policy "pv_owner_all"
  on public.portfolio_videos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "pv_public_read" on public.portfolio_videos;
create policy "pv_public_read"
  on public.portfolio_videos
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.portfolio p
      where p.user_id = portfolio_videos.user_id
        and p.is_public = true
    )
  );

-- 조회 성능 인덱스
create index if not exists idx_pv_user_cat on public.portfolio_videos (user_id, category_id, sort_order);
create index if not exists idx_pvc_user on public.portfolio_video_categories (user_id, sort_order);

-- =====================================================================
-- 3) 카테고리 시드 6개 (현재 로그인 사용자 기준 — auth.uid())
--    이미 카테고리가 있으면 중복 삽입 안 함.
-- =====================================================================
insert into public.portfolio_video_categories (user_id, name, sort_order)
select auth.uid(), v.name, v.sort_order
from (values
  ('긴급구호',    10),
  ('어린이예배',  20),
  ('유치원',      30),
  ('Zapotal 교회', 40),
  ('방과후학교',  50),
  ('찬양',        60)
) as v(name, sort_order)
where auth.uid() is not null
  and not exists (
    select 1 from public.portfolio_video_categories c
    where c.user_id = auth.uid()
  );
