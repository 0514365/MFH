-- MFH patch72: 캘린더 구독 피드에서 프로젝트 제외(할 일/To-Do 만 전송)
-- 배경: 아이폰 구독 캘린더에는 기간 프로젝트가 아닌 할 일만 보내기로 결정(v2t).
-- patch71 의 get_calendar_feed 를 교체 — projects union 제거.
-- 멱등: create or replace.

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

grant execute on function public.get_calendar_feed(uuid) to anon, authenticated;
