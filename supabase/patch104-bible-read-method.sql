-- MFH patch104: 성경통독 — 통독 방법(read_method)
-- 읽음 체크 시 방법 선택: aloud(낭독) / audio(오디오 듣기) / aloud_audio(낭독+듣기). null = 미선택(묵독 기준 시간 추정).
-- 앱은 방법에 따라 소요 분 자동값을 다르게 추정한다(묵독 500자/분, 낭독·듣기 280자/분 — README 7절).
-- 멱등: add column if not exists / drop constraint if exists 후 add.

alter table public.reading_plan_days
  add column if not exists read_method text;

alter table public.reading_plan_days
  drop constraint if exists reading_plan_days_read_method_check;
alter table public.reading_plan_days
  add constraint reading_plan_days_read_method_check
  check (read_method is null or read_method in ('aloud', 'audio', 'aloud_audio'));
