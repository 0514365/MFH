-- MFH patch107: 성경통독 — 통독 범위(scope)
-- 계획 수립 시 범위 선택: all(신구약 전체 1,189장) / ot(구약만 929장) / nt(신약만 260장).
-- 부분 범위는 정경 순으로 읽으며 read_order 는 무시된다. 일정 행의 start_seq/end_seq 는
-- 범위·순서별 목록 인덱스(lib/bible/plan.ts orderedChapters(order, scope)).
-- 기존 행은 기본값 'all' 로 채워져 동작이 바뀌지 않는다.
-- 멱등: add column if not exists / drop constraint if exists 후 add.

alter table public.reading_plans
  add column if not exists scope text not null default 'all';

alter table public.reading_plans
  drop constraint if exists reading_plans_scope_check;
alter table public.reading_plans
  add constraint reading_plans_scope_check
  check (scope in ('all', 'ot', 'nt'));
