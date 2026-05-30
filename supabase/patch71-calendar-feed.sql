-- MFH patch71: 구독형 캘린더 피드(ICS)
-- 목적: 사용자별 비밀 토큰으로 보호되는 ICS 피드를 비로그인(anon)으로 서빙.
--       아이폰/구글 캘린더 "구독"에 webcal URL 등록 → 프로젝트·할 일 일정 자동 동기화.
-- 구성:
--   1) calendar_feeds  : user_id 당 토큰 1개(uuid). 소유자만 RLS 접근.
--   2) ensure_calendar_token()      : SECURITY INVOKER. 로그인 사용자 토큰 조회/없으면 발급.
--   3) regenerate_calendar_token()  : SECURITY INVOKER. 토큰 재발급(기존 폐기).
--   4) get_calendar_feed(p_token)   : SECURITY DEFINER. 토큰→user_id 검증 후 그 사람 일정 반환.
--                                     anon 으로 호출되며, 토큰 외 인증 없음.
-- 멱등: create ... if not exists / drop policy if exists / create or replace function.

-- 1) 토큰 테이블 ───────────────────────────────────────────────
create table if not exists public.calendar_feeds (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  token      uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create unique index if not exists calendar_feeds_token_key on public.calendar_feeds (token);

alter table public.calendar_feeds enable row level security;

drop policy if exists "calendar_feeds owner select" on public.calendar_feeds;
create policy "calendar_feeds owner select"
  on public.calendar_feeds for select
  using (auth.uid() = user_id);

drop policy if exists "calendar_feeds owner insert" on public.calendar_feeds;
create policy "calendar_feeds owner insert"
  on public.calendar_feeds for insert
  with check (auth.uid() = user_id);

drop policy if exists "calendar_feeds owner update" on public.calendar_feeds;
create policy "calendar_feeds owner update"
  on public.calendar_feeds for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) 토큰 발급/조회 (로그인 사용자 본인) ──────────────────────
create or replace function public.ensure_calendar_token()
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_token uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.calendar_feeds (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  select token into v_token from public.calendar_feeds where user_id = auth.uid();
  return v_token;
end;
$$;

-- 3) 토큰 재발급(기존 폐기) ────────────────────────────────────
create or replace function public.regenerate_calendar_token()
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_token uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.calendar_feeds (user_id, token)
  values (auth.uid(), gen_random_uuid())
  on conflict (user_id) do update set token = gen_random_uuid(), created_at = now();

  select token into v_token from public.calendar_feeds where user_id = auth.uid();
  return v_token;
end;
$$;

-- 4) 피드 조회 (토큰만으로, anon 허용) ─────────────────────────
-- kind='project' : 기간 막대(start_date~end_date). status 로 done 판단(JS).
-- kind='task'    : due_date 하루(+due_time). done 컬럼 그대로.
create or replace function public.get_calendar_feed(p_token uuid)
returns table (
  kind       text,
  id         uuid,
  title      text,
  start_date date,
  end_date   date,
  due_time   time,
  status     text,
  done       boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid;
begin
  select user_id into v_user from public.calendar_feeds where token = p_token;
  if v_user is null then
    return;  -- 토큰 불일치 → 빈 결과
  end if;

  return query
    select
      'project'::text,
      p.id,
      p.title,
      p.start_date,
      p.due_date,
      null::time,
      p.status,
      null::boolean
    from public.projects p
    where p.user_id = v_user
      and (p.start_date is not null or p.due_date is not null)
    union all
    select
      'task'::text,
      t.id,
      t.title,
      t.due_date,
      t.due_date,
      t.due_time,
      t.status,
      t.done
    from public.tasks t
    where t.user_id = v_user
      and t.due_date is not null;
end;
$$;

-- 권한: 발급/재발급=로그인 사용자, 피드=anon 포함(토큰이 인증 역할).
grant execute on function public.ensure_calendar_token()      to authenticated;
grant execute on function public.regenerate_calendar_token()  to authenticated;
grant execute on function public.get_calendar_feed(uuid)      to anon, authenticated;
