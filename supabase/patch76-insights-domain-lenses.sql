-- MFH patch76: insights.domain CHECK 제약을 목적 렌즈까지 허용하도록 재정의.
--
-- 배경: 기존 제약 insights_domain_check 가 journal/project/task/overall 만 허용 →
--       목적 렌즈(prayer/balance/fruit/letter) insert 시
--       'new row ... violates check constraint "insights_domain_check"' 로 실패.
-- 조치: 기존 제약 drop 후, 레거시 4 + 목적 렌즈 4 = 8개 허용으로 재생성.
-- 멱등: drop constraint if exists → add constraint. 반복 실행해도 안전.

begin;

alter table public.insights drop constraint if exists insights_domain_check;

alter table public.insights
  add constraint insights_domain_check
  check (domain in (
    'journal', 'project', 'task', 'overall',
    'prayer', 'balance', 'fruit', 'letter'
  ));

commit;
