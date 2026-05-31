-- MFH patch73: 멤버 공유 모델 (2명 — 김우진 / 서진아)
-- 정책: 멤버는 일지·프로젝트·할일·인사이트를 모두 "읽기" 가능, "쓰기/수정/삭제는 본인 것만".
--       포트폴리오 계열은 변경하지 않음(김우진만 편집, 공개 읽기 유지).
--       year_themes 는 멤버 읽기 + 기존 공개 읽기(비로그인 오프닝) 둘 다 허용.
--
-- ★★★ 실행 전 필수 ★★★
--   1) Supabase Auth 콘솔에서 "서진아" 계정 생성(이메일+비밀번호).
--   2) 두 사람 user_id 확인:   select id, email from auth.users;
--   3) 아래 (2) 멤버 등록 INSERT 의 '<...>' 두 곳을 실제 uuid 로 교체.
--   교체 없이 실행하면 FK 위반으로 전체 롤백됨(잠김 방지) — 반드시 교체 후 실행.
--
-- 전체를 트랜잭션으로 감싸 원자 적용(중간 실패 시 전부 롤백).

begin;

-- ─────────────────────────────────────────────
-- 1) 멤버 인프라: app_members + is_member()
-- ─────────────────────────────────────────────
create table if not exists public.app_members (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

alter table public.app_members enable row level security;

-- is_member: SECURITY DEFINER 라 app_members RLS 를 우회 → 정책에서 호출해도 재귀 없음.
create or replace function public.is_member(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.app_members m where m.user_id = uid);
$$;
grant execute on function public.is_member(uuid) to anon, authenticated;

-- 멤버는 멤버 목록(이름 표시용)을 읽을 수 있음. 쓰기는 콘솔(service_role)로만.
drop policy if exists "app_members member read" on public.app_members;
create policy "app_members member read"
  on public.app_members for select
  using (public.is_member(auth.uid()));

-- ─────────────────────────────────────────────
-- 2) 멤버 등록 ★ uuid 두 곳 교체 후 실행 ★
-- ─────────────────────────────────────────────
insert into public.app_members (user_id, display_name) values
  ('6920f3d8-d132-4859-a73f-12b6ce2210c8', '김우진'),
  ('5564d6ee-170c-433a-85e6-62724c3f4b49', '서진아')
on conflict (user_id) do update set display_name = excluded.display_name;

-- ─────────────────────────────────────────────
-- 3) 기존 정책 일괄 제거 (정책명 무관 — 동적 drop)
-- ─────────────────────────────────────────────
do $$
declare
  r record;
  tb text;
  tbls text[] := array['journal_entries', 'projects', 'tasks', 'insights', 'year_themes'];
begin
  foreach tb in array tbls loop
    for r in
      select policyname from pg_policies where schemaname = 'public' and tablename = tb
    loop
      execute format('drop policy if exists %I on public.%I', r.policyname, tb);
    end loop;
  end loop;
end $$;

-- ─────────────────────────────────────────────
-- 4) 공유 RLS — 멤버 읽기 / 본인 쓰기 (journal_entries, projects, tasks, insights)
--    INSERT 는 본인+멤버, UPDATE/DELETE 는 본인만.
-- ─────────────────────────────────────────────

-- journal_entries
alter table public.journal_entries enable row level security;
create policy "journal_entries member read"  on public.journal_entries for select using (public.is_member(auth.uid()));
create policy "journal_entries owner insert"  on public.journal_entries for insert with check (auth.uid() = user_id and public.is_member(auth.uid()));
create policy "journal_entries owner update"  on public.journal_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "journal_entries owner delete"  on public.journal_entries for delete using (auth.uid() = user_id);

-- projects (남의 프로젝트는 수정 불가 / 읽기 가능 — 그 프로젝트에 할일 추가는 tasks 정책으로 허용됨)
alter table public.projects enable row level security;
create policy "projects member read"  on public.projects for select using (public.is_member(auth.uid()));
create policy "projects owner insert"  on public.projects for insert with check (auth.uid() = user_id and public.is_member(auth.uid()));
create policy "projects owner update"  on public.projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "projects owner delete"  on public.projects for delete using (auth.uid() = user_id);

-- tasks (작성자=본인이면 OK. project_id 가 상대 프로젝트여도 무방 → 남의 프로젝트에 할일 추가 허용)
alter table public.tasks enable row level security;
create policy "tasks member read"  on public.tasks for select using (public.is_member(auth.uid()));
create policy "tasks owner insert"  on public.tasks for insert with check (auth.uid() = user_id and public.is_member(auth.uid()));
create policy "tasks owner update"  on public.tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks owner delete"  on public.tasks for delete using (auth.uid() = user_id);

-- insights (두 사람 데이터 종합 — 읽기 공유, 쓰기 본인)
alter table public.insights enable row level security;
create policy "insights member read"  on public.insights for select using (public.is_member(auth.uid()));
create policy "insights owner insert"  on public.insights for insert with check (auth.uid() = user_id and public.is_member(auth.uid()));
create policy "insights owner update"  on public.insights for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "insights owner delete"  on public.insights for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 5) year_themes — 멤버 읽기 + 공개 읽기(비로그인 오프닝) / 본인 쓰기
-- ─────────────────────────────────────────────
alter table public.year_themes enable row level security;
create policy "year_themes read (member or public portfolio)"
  on public.year_themes for select
  using (
    public.is_member(auth.uid())
    or exists (
      select 1 from public.portfolio pf
      where pf.user_id = year_themes.user_id and pf.is_public = true
    )
  );
create policy "year_themes owner insert" on public.year_themes for insert with check (auth.uid() = user_id and public.is_member(auth.uid()));
create policy "year_themes owner update" on public.year_themes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "year_themes owner delete" on public.year_themes for delete using (auth.uid() = user_id);

commit;
