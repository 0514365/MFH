-- ============================================
-- MFH patch60 — Portfolio Step A
-- Supabase SQL 에디터에서 순서대로 실행하세요.
-- ============================================

-- 1) portfolio 테이블
create table if not exists portfolio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  slug text unique not null,
  hero_image_url text,
  intro_text text,
  email_public text,
  facebook_url text,
  youtube_url text,
  intro_video_url text,
  missionary_a_name text,
  missionary_a_photo_url text,
  missionary_a_bio text,
  missionary_b_name text,
  missionary_b_photo_url text,
  missionary_b_bio text,
  is_public boolean default true,
  updated_at timestamptz default now(),
  unique (user_id)
);

-- 2) portfolio_history 테이블
create table if not exists portfolio_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  period_text text not null,
  title text not null,
  is_ongoing boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_portfolio_history_user_sort
  on portfolio_history (user_id, sort_order);

-- 3) RLS
alter table portfolio enable row level security;
alter table portfolio_history enable row level security;

drop policy if exists "portfolio_owner_all" on portfolio;
create policy "portfolio_owner_all" on portfolio
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "portfolio_public_read" on portfolio;
create policy "portfolio_public_read" on portfolio
  for select using (is_public = true);

drop policy if exists "history_owner_all" on portfolio_history;
create policy "history_owner_all" on portfolio_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "history_public_read" on portfolio_history;
create policy "history_public_read" on portfolio_history
  for select using (
    exists (
      select 1 from portfolio p
      where p.user_id = portfolio_history.user_id
        and p.is_public = true
    )
  );

-- 4) Storage 버킷 (public)
insert into storage.buckets (id, name, public)
values ('portfolio-photos', 'portfolio-photos', true)
on conflict (id) do nothing;

-- 5) Storage RLS — 본인만 쓰기, 누구나 읽기
drop policy if exists "portfolio_photos_public_read" on storage.objects;
create policy "portfolio_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'portfolio-photos');

drop policy if exists "portfolio_photos_owner_insert" on storage.objects;
create policy "portfolio_photos_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'portfolio-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "portfolio_photos_owner_update" on storage.objects;
create policy "portfolio_photos_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'portfolio-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "portfolio_photos_owner_delete" on storage.objects;
create policy "portfolio_photos_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'portfolio-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- 6) 시드 데이터 — 노션 콘텐츠 기반
-- ⚠️ 실행 시점에 auth.uid() 가 honduras0691@gmail.com 으로 로그인된 세션이어야 합니다.
--    Supabase SQL 에디터는 service_role 로 실행되므로 user_id 를 명시적으로 넣습니다.
-- ⚠️ user_id 부분을 본인의 실제 user id 로 교체하세요.
--    조회: select id from auth.users where email = 'honduras0691@gmail.com';
-- ============================================

-- 6-1) portfolio row (이미 있으면 SKIP)
insert into portfolio (
  user_id, slug,
  intro_text, email_public,
  facebook_url, youtube_url, intro_video_url,
  missionary_a_name, missionary_a_bio,
  missionary_b_name, missionary_b_bio,
  is_public
)
select
  (select id from auth.users where email = 'honduras0691@gmail.com' limit 1),
  'mfh',
  '2016년부터 중미 온두라스에서 어린이·도시빈민을 대상으로 어린이 교육과 교회개척 사역을 하고 있으며 유치원, 방과후학교를 운영하고 있습니다.',
  'honduras0691@gmail.com',
  'https://www.facebook.com/groups/forhonduras',
  'https://www.youtube.com/@missionhondurastv13',
  'https://youtu.be/-dEzFmX-mZY',
  '김우진 선교사',
  E'명지대학교 영어영문학과 졸업 (2005)\n대한민국 육군 장교 임관 (학사 45기, 2005~2011)\n대한예수교 장로회 더좋은교회 안수집사 임직 (2012)\n대한예수교 장로회 이룸교회 장로 임직 (2016)\n온두라스 선교사 파송 (2016. 2)',
  '서진아 선교사',
  E'아세아연합신학대학교 기독교교육학과 졸업 (2007)\n대한예수교 장로회 더좋은교회 주일학교 전도사 (2004)\n기독교 대한성결교회 예닮교회 주일학교 전도사 (2006)\n대한예수교 장로회 이룸교회 주일학교·학생부 전도사 (2007)\n강도사 임직 (2011)\n온두라스 선교사 파송 (2016. 2)',
  true
on conflict (user_id) do nothing;

-- 6-2) portfolio_history rows
with target as (
  select id as uid from auth.users where email = 'honduras0691@gmail.com' limit 1
)
insert into portfolio_history (user_id, period_text, title, is_ongoing, sort_order)
select uid, period_text, title, is_ongoing, sort_order
from target,
  (values
    ('2016. 2 ~ 현재',       '온두라스 선교 파송',                            true,  10),
    ('2016. 4 ~ 2017. 2',    'Las Brisas 교회 어린이 예배사역',               false, 20),
    ('2016. 4 ~ 2017. 2',    'Las Brisas 교회 청년 찬양팀 사역',              false, 30),
    ('2017. 3 ~ 2018. 12',   'OJC Kinder (유치원)',                           false, 40),
    ('2017. 3 ~ 2018. 12',   'Rio Blanco 교회 어린이 예배사역',               false, 50),
    ('2020. 8 ~ 현재',       'Iglesia de Mejor Pacto (Zapotal) 개척',         true,  60),
    ('2022. 8 ~ 2023. 12',   'Zapotal 영어 선교원',                           false, 70),
    ('2024. 4',              'Zapotal 건축부지 매입',                          true,  80)
  ) as v(period_text, title, is_ongoing, sort_order)
where not exists (
  select 1 from portfolio_history h
  where h.user_id = target.uid and h.title = v.title and h.period_text = v.period_text
);

-- 끝.
-- 확인: select count(*) from portfolio;            -- 1
--      select count(*) from portfolio_history;    -- 8
