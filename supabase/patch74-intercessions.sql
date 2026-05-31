-- MFH patch74: 중보기도(방문자 메시지) — intercessions
-- 공개페이지 방문자가 이름+메시지를 남기면(anon insert), 멤버만 열람(select).
-- is_member() 는 patch73 에서 생성됨(재사용).
-- 멱등: create table if not exists / drop policy if exists 후 create.

create table if not exists public.intercessions (
  id           uuid primary key default gen_random_uuid(),
  visitor_name text not null,
  message      text not null,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists intercessions_created_idx on public.intercessions (created_at desc);

alter table public.intercessions enable row level security;

-- 열람: 멤버만 (anon 의 auth.uid()=null → is_member=false → 차단)
drop policy if exists "intercessions member read" on public.intercessions;
create policy "intercessions member read"
  on public.intercessions for select
  using (public.is_member(auth.uid()));

-- 작성: 누구나(비로그인 방문자 포함). 이름/메시지 길이 검증으로 빈값·과길이 차단.
drop policy if exists "intercessions public insert" on public.intercessions;
create policy "intercessions public insert"
  on public.intercessions for insert
  with check (
    char_length(btrim(visitor_name)) between 1 and 50
    and char_length(btrim(message)) between 1 and 2000
  );

-- 읽음 토글: 멤버만
drop policy if exists "intercessions member update" on public.intercessions;
create policy "intercessions member update"
  on public.intercessions for update
  using (public.is_member(auth.uid()))
  with check (public.is_member(auth.uid()));

-- 삭제: 멤버만
drop policy if exists "intercessions member delete" on public.intercessions;
create policy "intercessions member delete"
  on public.intercessions for delete
  using (public.is_member(auth.uid()));

grant select, insert on public.intercessions to anon, authenticated;
grant update, delete on public.intercessions to authenticated;
