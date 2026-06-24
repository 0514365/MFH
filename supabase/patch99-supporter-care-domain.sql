-- MFH patch99: insights.domain CHECK 에 후원자 관계관리 도메인 추가.
--
-- 배경: Phase C — 후원자 관계관리 AI(supporter_care). insight pull/push·DomainInsightPanel 인프라를
--       그대로 재사용한다(별도 스크립트 없음). 비서(project_assist·task_assist)와 동일 패턴.
-- 조치: patch83 의 10개 허용 목록에 supporter_care 를 더해 11개로 재정의.
-- 멱등: drop constraint if exists → add constraint. 반복 실행해도 안전.

begin;

alter table public.insights drop constraint if exists insights_domain_check;

alter table public.insights
  add constraint insights_domain_check
  check (domain in (
    'journal', 'project', 'task', 'overall',
    'prayer', 'balance', 'fruit', 'letter',
    'project_assist', 'task_assist',
    'supporter_care'
  ));

commit;
