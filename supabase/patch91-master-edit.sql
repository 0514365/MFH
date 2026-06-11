-- MFH patch91: 마스터 편집 권한 (김우진 = 마스터)
-- 정책: 마스터(김우진)는 모든 멤버의 일지·프로젝트·할일·인사이트·연주제를
--       수정(UPDATE)·삭제(DELETE)할 수 있다. 그 외 멤버(서진아)는 본인 것만.
--       SELECT(멤버 읽기)·INSERT(본인) 정책은 patch73 그대로 유지 — 건드리지 않음.
--       포트폴리오 계열도 변경 없음(김우진만 편집, 공개 읽기 유지).
--
-- ★ 선행조건: patch73(멤버 공유)이 먼저 적용되어 app_members 에 두 사람이 등록돼 있어야 함.
-- 멱등: 컬럼 add if not exists · 함수 create or replace · 정책 drop if exists 후 create.
-- 전체를 트랜잭션으로 감싸 원자 적용(중간 실패 시 전부 롤백).

begin;

-- ─────────────────────────────────────────────
-- 1) 마스터 플래그: app_members.is_master + is_master()
-- ─────────────────────────────────────────────
alter table public.app_members
  add column if not exists is_master boolean not null default false;

-- 김우진을 마스터로 지정(나머지 전원 false 로 보장).
update public.app_members
  set is_master = (user_id = '6920f3d8-d132-4859-a73f-12b6ce2210c8');

-- is_master: SECURITY DEFINER 라 app_members RLS 를 우회 → 정책에서 호출해도 재귀 없음.
create or replace function public.is_master(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.app_members m
    where m.user_id = uid and m.is_master
  );
$$;
grant execute on function public.is_master(uuid) to anon, authenticated;

-- ─────────────────────────────────────────────
-- 2) UPDATE/DELETE 정책 — 본인 또는 마스터 (5개 테이블)
--    cmd in ('UPDATE','DELETE') 정책만 교체 → SELECT/INSERT(patch73) 는 보존.
--    UPDATE 는 WITH CHECK 에도 마스터 우회를 넣어야 함:
--    안 넣으면 마스터가 남의 행을 수정한 뒤 user_id 가 그대로라 check 에 걸려 실패.
-- ─────────────────────────────────────────────
do $$
declare
  r record;
  tb text;
  tbls text[] := array['journal_entries', 'projects', 'tasks', 'insights', 'year_themes'];
begin
  foreach tb in array tbls loop
    for r in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = tb and cmd in ('UPDATE', 'DELETE')
    loop
      execute format('drop policy if exists %I on public.%I', r.policyname, tb);
    end loop;

    execute format(
      'create policy %I on public.%I for update '
      || 'using (auth.uid() = user_id or public.is_master(auth.uid())) '
      || 'with check (auth.uid() = user_id or public.is_master(auth.uid()))',
      tb || ' owner or master update', tb);

    execute format(
      'create policy %I on public.%I for delete '
      || 'using (auth.uid() = user_id or public.is_master(auth.uid()))',
      tb || ' owner or master delete', tb);
  end loop;
end $$;

commit;
