-- MFH patch117: 신용카드 상환일(due_day)
--
-- 배경: 카드마다 매월 상환일이 다르다(삼성카드 7092 진아 = 매월 15일). 달력·자산 탭에 「15일 상환」 표시,
--       상환 입력의 상환일 기본값 = 다가오는 상환일.
-- 변경: acct_accounts.due_day(1~31, null = 미지정) 추가 · 삼성카드 7092 = 15.
-- 멱등. 실행: Supabase 콘솔 SQL Editor.

begin;

alter table public.acct_accounts add column if not exists due_day smallint;
alter table public.acct_accounts drop constraint if exists acct_accounts_due_day_check;
alter table public.acct_accounts add constraint acct_accounts_due_day_check check (due_day is null or due_day between 1 and 31);

update public.acct_accounts set due_day = 15 where card_last4 = '7092';

commit;
