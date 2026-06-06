-- MFH patch83: insights.domain CHECK 에 비서(능동 제안) 도메인 2개 추가.
--
-- 배경: Phase 4 비서 — project/task 페이지 상단 "다음 행동 제안" 카드.
--       인사이트(회고)와 별개 도메인으로 저장해 (user_id,domain) unique 충돌 없이
--       insight pull/push·카드 인프라(Phase 3b)를 그대로 재사용한다.
-- 조치: patch76 의 8개 허용 목록에 project_assist·task_assist 를 더해 10개로 재정의.
-- 멱등: drop constraint if exists → add constraint. 반복 실행해도 안전.

begin;

alter table public.insights drop constraint if exists insights_domain_check;

alter table public.insights
  add constraint insights_domain_check
  check (domain in (
    'journal', 'project', 'task', 'overall',
    'prayer', 'balance', 'fruit', 'letter',
    'project_assist', 'task_assist'
  ));

commit;
