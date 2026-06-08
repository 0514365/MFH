-- MFH patch85: 반복 할 일 시리즈
--  · recurrence_id   : 같은 반복 시리즈를 묶는 uuid (단건 할 일은 null).
--  · recurrence_freq : 'daily' | 'weekly' | 'monthly' (뱃지·범위변경 라벨용).
-- 반복 생성 시 한 시리즈의 모든 발생 행에 같은 recurrence_id 를 부여한다.
-- 편집/삭제 시 "이 항목만 / 이후 모두"는 recurrence_id 로 같은 시리즈를 찾아 처리한다.
-- RLS 는 기존 tasks 정책(auth.uid() = user_id)이 컬럼과 무관하게 그대로 커버한다.
-- 멱등: 반복 실행 안전.

begin;

alter table public.tasks add column if not exists recurrence_id uuid;
alter table public.tasks add column if not exists recurrence_freq text;

create index if not exists tasks_recurrence_idx
  on public.tasks (recurrence_id)
  where recurrence_id is not null;

commit;
