-- MFH patch95: 프로젝트 내 할 일 수동 순서 (sort_order)
--
-- tasks.sort_order int 추가 → 프로젝트 상세에서 "미완료(sort_order ASC) → 완료(sort_order ASC)"
-- 그룹 나열. 영상(portfolio_videos) 선례대로 10단위 간격(10·20·30…)으로 부여해 교환을 단순화.
--
-- ★ 재정렬 권한 문제: tasks UPDATE 정책(patch73·91)은 "본인 task 또는 마스터"만 허용한다.
--   한 프로젝트에 두 멤버의 할 일이 섞이면, 소유자가 상대의 할 일 순서를 못 바꿔 순서가 깨진다.
--   → sort_order 만 교환하는 SECURITY DEFINER 함수로 RLS 를 우회하되,
--     "프로젝트 소유자 또는 마스터" 권한과 "같은 프로젝트" 를 함수 내부에서 엄격히 검증한다.
--     (다른 컬럼은 절대 건드리지 않으므로 공유 모델 ' 쓰기는 본인 것만 ' 은 sort_order 에 한해서만 완화.)
--
-- 선행조건: patch73(is_member)·patch91(is_master) 적용 완료.
-- 멱등: add column if not exists · 백필은 sort_order is null 행만 · 함수 create or replace.
-- 실행: Supabase 콘솔 SQL Editor 에 붙여넣고 실행. 재실행해도 안전.

begin;

-- ─────────────────────────────────────────────
-- 1) 컬럼
-- ─────────────────────────────────────────────
alter table public.tasks add column if not exists sort_order int;

-- ─────────────────────────────────────────────
-- 2) 기존 행 백필 — 프로젝트별로 현재 화면 순서(미완료 먼저 → 마감일 → 생성일)대로 10단위 부여.
--    · project_id 가 null(단독 할 일) 인 행은 순서가 무의미 → 건드리지 않음(null 유지).
--    · 이미 sort_order 가 채워진 행은 보존(재실행 안전).
-- ─────────────────────────────────────────────
with ranked as (
  select
    id,
    row_number() over (
      partition by project_id
      order by done asc, due_date asc nulls last, created_at asc
    ) * 10 as so
  from public.tasks
  where project_id is not null
    and sort_order is null
)
update public.tasks t
   set sort_order = ranked.so
  from ranked
 where t.id = ranked.id;

-- ─────────────────────────────────────────────
-- 3) 인덱스 — 프로젝트 상세 정렬 가속
-- ─────────────────────────────────────────────
create index if not exists tasks_project_sort_idx
  on public.tasks (project_id, sort_order);

-- ─────────────────────────────────────────────
-- 4) 순서 교환 RPC — 프로젝트 소유자 또는 마스터만, sort_order 만, 원자적.
--    같은 프로젝트의 두 할 일 sort_order 를 맞바꾼다. ↑↓ 한 칸 이동에 사용.
-- ─────────────────────────────────────────────
create or replace function public.swap_task_sort_order(a_id uuid, b_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a_proj uuid;
  b_proj uuid;
  a_so   int;
  b_so   int;
  owner  uuid;
begin
  select project_id, sort_order into a_proj, a_so from public.tasks where id = a_id;
  select project_id, sort_order into b_proj, b_so from public.tasks where id = b_id;

  if a_proj is null or b_proj is null then
    raise exception '프로젝트에 속한 할 일만 순서를 바꿀 수 있습니다.';
  end if;
  if a_proj <> b_proj then
    raise exception '같은 프로젝트의 할 일끼리만 순서를 바꿀 수 있습니다.';
  end if;

  select user_id into owner from public.projects where id = a_proj;

  if not (auth.uid() = owner or public.is_master(auth.uid())) then
    raise exception '이 프로젝트의 순서를 변경할 권한이 없습니다.';
  end if;

  -- 한쪽이라도 null 이면(백필 이전 행) 안전하게 채운 뒤 교환.
  if a_so is null then a_so := 0; end if;
  if b_so is null then b_so := 0; end if;

  update public.tasks set sort_order = b_so where id = a_id;
  update public.tasks set sort_order = a_so where id = b_id;
end;
$$;

grant execute on function public.swap_task_sort_order(uuid, uuid) to authenticated;

commit;
