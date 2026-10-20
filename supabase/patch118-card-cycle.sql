-- MFH patch118: 신용카드 이용기간 마감일(cycle_end_day)
--
-- 배경: 삼성카드 7092 = 전월 3일 ~ 당월 2일 이용분을 당월 15일(due_day, patch117) 상환.
--       마감일을 알면 「확정 청구(이번 상환)」와 「이용 중(다음 청구 예정)」을 나눠 보여줄 수 있다.
-- 변경: acct_accounts.cycle_end_day(1~31, null = 미지정 → 전체 미상환만 표시) 추가 · 삼성카드 7092 = 2.
-- 선행: patch117. 멱등. 실행: Supabase 콘솔 SQL Editor.

begin;

alter table public.acct_accounts add column if not exists cycle_end_day smallint;
alter table public.acct_accounts drop constraint if exists acct_accounts_cycle_end_day_check;
alter table public.acct_accounts add constraint acct_accounts_cycle_end_day_check check (cycle_end_day is null or cycle_end_day between 1 and 31);

update public.acct_accounts set cycle_end_day = 2 where card_last4 = '7092';

commit;
