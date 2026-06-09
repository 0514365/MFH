-- MFH patch86: 주간 Facebook 게시 추천 — weekly_fb
-- 매주 앱 데이터(최근 7일 일지·사진캡션·인사이트)를 Claude Code 가 분석해
-- "이번 주 게시안" 2~3개(문구+추천사진+해시태그)를 posts jsonb 배열로 저장한다.
--   · 분석 주체 = Claude Code(구독) → 종량제 API 비용 0. 저장은 service role(RLS 우회).
--   · 표시 = 앱 /facebook 전용 페이지(멤버 읽기). 게시 자체는 우진이 수동(추천만).
-- RLS = insights 와 동일(patch73): 멤버 읽기 / 본인 쓰기. is_member() 재사용.
-- 멱등: create table if not exists / drop policy if exists 후 create / add column if not exists.

create table if not exists public.weekly_fb (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  week_start  date not null,
  week_end    date not null,
  -- posts: [{ text, photos:[{path,caption}], hashtags:[string], rationale }]
  posts       jsonb not null default '[]'::jsonb,
  model       text not null default 'claude-code',
  created_at  timestamptz not null default now()
);

-- 같은 주(user_id,week_start) 재생성은 덮어쓰기(upsert) → 주차당 1행 유지.
create unique index if not exists weekly_fb_user_week_idx
  on public.weekly_fb (user_id, week_start);
create index if not exists weekly_fb_created_idx
  on public.weekly_fb (created_at desc);

alter table public.weekly_fb enable row level security;

-- 읽기: 멤버(부부 둘 다). insights 와 동일 패턴.
drop policy if exists "weekly_fb member read" on public.weekly_fb;
create policy "weekly_fb member read"
  on public.weekly_fb for select
  using (public.is_member(auth.uid()));

-- 쓰기: 본인 것만(insert 는 멤버 조건도 함께).
drop policy if exists "weekly_fb owner insert" on public.weekly_fb;
create policy "weekly_fb owner insert"
  on public.weekly_fb for insert
  with check (auth.uid() = user_id and public.is_member(auth.uid()));

drop policy if exists "weekly_fb owner update" on public.weekly_fb;
create policy "weekly_fb owner update"
  on public.weekly_fb for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "weekly_fb owner delete" on public.weekly_fb;
create policy "weekly_fb owner delete"
  on public.weekly_fb for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.weekly_fb to authenticated;
