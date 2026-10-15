-- MFH patch113: 성경통독 — 밀렸을 때 남은 기간 재분배(rebalance_reading_plan)
--
-- 배경: 통독이 밀리면 /bible 「남은 기간 재분배」가 미완료 분량을 오늘부터 다시 나눈다.
--       분배 계산은 앱(lib/bible/plan.ts rebalanceSchedule), 저장은 이 함수가 한 트랜잭션으로 처리:
--         ① 미완료 일차 삭제(완료 일차·기록·은혜·기도제목 연결은 그대로)
--         ② 새 일차 insert
--         ③ 전체 일차 번호를 (read_date, start_seq) 순으로 1..N 재부여 — unique(plan_id, day_no) 충돌 방지를 위해 임시 번호 경유
--         ④ reading_plans.end_date · total_days 갱신
--       bible_chapter_reads.plan_day_id 는 삭제된 일차를 가리키면 null(기존 FK on delete set null).
--       SECURITY INVOKER — RLS(본인 전용)가 그대로 적용. 선행: patch103 · patch108.
-- 멱등. 실행: Supabase 콘솔 SQL Editor.

create or replace function public.rebalance_reading_plan(p_plan_id uuid, p_end_date date, p_days jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_total integer;
begin
  if v_user is null or not exists (
    select 1 from public.reading_plans where id = p_plan_id and user_id = v_user
  ) then
    raise exception 'plan not found';
  end if;
  if jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) = 0 then
    raise exception 'empty schedule';
  end if;

  delete from public.reading_plan_days where plan_id = p_plan_id and not done;

  update public.reading_plan_days set day_no = day_no + 1000000 where plan_id = p_plan_id;

  insert into public.reading_plan_days
    (plan_id, user_id, day_no, read_date, start_seq, end_seq, chapters, chars, range_label)
  select p_plan_id, v_user, 2000000 + t.ord,
         (t.e ->> 'read_date')::date, (t.e ->> 'start_seq')::int, (t.e ->> 'end_seq')::int,
         (t.e ->> 'chapters')::int, (t.e ->> 'chars')::int, t.e ->> 'range_label'
  from jsonb_array_elements(p_days) with ordinality as t(e, ord);

  with r as (
    select id, row_number() over (order by read_date, start_seq, day_no) as rn
    from public.reading_plan_days where plan_id = p_plan_id
  )
  update public.reading_plan_days d set day_no = r.rn from r where d.id = r.id;

  select count(*) into v_total from public.reading_plan_days where plan_id = p_plan_id;

  update public.reading_plans
     set end_date = greatest(p_end_date, start_date), total_days = v_total, updated_at = now()
   where id = p_plan_id;

  return v_total;
end;
$$;

grant execute on function public.rebalance_reading_plan(uuid, date, jsonb) to authenticated;
