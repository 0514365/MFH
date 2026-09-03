-- MFH patch103: 성경통독 — reading_plans · reading_plan_days
--
-- 기능:
--   · 계정별 통독 계획(타이틀·기간·제외 요일·읽기 순서·배분 방식). 활성 계획은 계정당 1개(partial unique).
--   · 계획 저장 시 앱이 하루 1행 일정(reading_plan_days)을 일괄 생성(범위·장수·글자수·라벨 사전 계산).
--   · 읽음 체크 = done + 읽은 날/시각/소요 분(자동 입력 후 수동 수정) + 한 줄 은혜 + 기도제목 포함 여부.
--   · 기도제목 포함 시 앱이 일지(journal_entries, 분류 '성경통독', 기도후보) 를 만들고 journal_entry_id 로 연결.
-- RLS = 본인 전용(auth.uid() = user_id). 멤버 간 공유 없음(부부 각자 계획).
-- 멱등: create table if not exists / create index if not exists / drop policy if exists 후 create.

begin;

-- ─────────────────────────────────────────────
-- 1) 계획
-- ─────────────────────────────────────────────
create table if not exists public.reading_plans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  title            text not null,
  start_date       date not null,
  end_date         date not null,
  -- 읽기 제외 요일: JS getDay 기준 0=일 … 6=토
  exclude_weekdays smallint[] not null default '{}',
  read_order       text not null default 'ot_first' check (read_order in ('ot_first', 'nt_first')),
  split_mode       text not null default 'chars' check (split_mode in ('chapters', 'chars')),
  total_days       integer not null,
  total_chapters   integer not null default 1189,
  total_chars      integer not null default 1363149,
  is_active        boolean not null default true,
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint reading_plans_dates check (end_date >= start_date)
);

-- 계정당 활성 계획 1개.
create unique index if not exists reading_plans_active_uidx
  on public.reading_plans (user_id) where is_active;
create index if not exists reading_plans_user_idx
  on public.reading_plans (user_id, created_at desc);

alter table public.reading_plans enable row level security;

drop policy if exists "reading_plans owner select" on public.reading_plans;
create policy "reading_plans owner select"
  on public.reading_plans for select
  using (auth.uid() = user_id);

drop policy if exists "reading_plans owner insert" on public.reading_plans;
create policy "reading_plans owner insert"
  on public.reading_plans for insert
  with check (auth.uid() = user_id);

drop policy if exists "reading_plans owner update" on public.reading_plans;
create policy "reading_plans owner update"
  on public.reading_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "reading_plans owner delete" on public.reading_plans;
create policy "reading_plans owner delete"
  on public.reading_plans for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.reading_plans to authenticated;

-- ─────────────────────────────────────────────
-- 2) 일정(하루 1행) + 읽음 기록
-- ─────────────────────────────────────────────
create table if not exists public.reading_plan_days (
  id               uuid primary key default gen_random_uuid(),
  plan_id          uuid not null references public.reading_plans (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  day_no           integer not null,          -- 1-based 일차
  read_date        date not null,             -- 읽기로 예정된 날
  start_seq        integer not null,          -- 읽기 순서상 첫 장(0-based, lib/bible/plan.ts orderedChapters)
  end_seq          integer not null,          -- 마지막 장(inclusive)
  chapters         integer not null,
  chars            integer not null,
  range_label      text not null,             -- "창세기 1~15장" (README 8절 규칙, 앱이 사전 계산)
  -- 읽음 기록
  done             boolean not null default false,
  read_on          date,                      -- 실제 읽은 날(체크 시 오늘 자동, 수정 가능)
  read_time        time,                      -- 실제 읽은 시각(체크 시 지금 자동, 수정 가능)
  read_minutes     integer,                   -- 소요 분(체크 시 예상값 자동, 수정 가능)
  grace            text,                      -- 오늘의 한 줄 은혜(선택)
  prayer_candidate boolean not null default false,
  journal_entry_id uuid references public.journal_entries (id) on delete set null,
  updated_at       timestamptz not null default now(),
  constraint reading_plan_days_plan_day_uniq unique (plan_id, day_no)
);

create index if not exists reading_plan_days_plan_date_idx
  on public.reading_plan_days (plan_id, read_date);
create index if not exists reading_plan_days_user_date_idx
  on public.reading_plan_days (user_id, read_date);

alter table public.reading_plan_days enable row level security;

drop policy if exists "reading_plan_days owner select" on public.reading_plan_days;
create policy "reading_plan_days owner select"
  on public.reading_plan_days for select
  using (auth.uid() = user_id);

drop policy if exists "reading_plan_days owner insert" on public.reading_plan_days;
create policy "reading_plan_days owner insert"
  on public.reading_plan_days for insert
  with check (auth.uid() = user_id);

drop policy if exists "reading_plan_days owner update" on public.reading_plan_days;
create policy "reading_plan_days owner update"
  on public.reading_plan_days for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "reading_plan_days owner delete" on public.reading_plan_days;
create policy "reading_plan_days owner delete"
  on public.reading_plan_days for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.reading_plan_days to authenticated;

commit;
