-- MFH patch108: 구분 '조정'(잔액 조정) 허용
--
-- 배경: 2026-10-14 자산 재정립 때 계좌 adjust_usd(숨은 값)로 잔액을 맞췄는데, 내역에서 보이지 않아 추후 혼동 우려.
--       → 계좌별 조정액을 날짜 있는 '조정' 거래로 옮기고 adjust_usd 는 0 으로(scripts/accounting-adjust-to-rows.ts).
-- 규칙: 조정 = 항목 없음 · 계좌(account_id) 필수 · 입금계좌 없음 · amount_usd/principal 은 부호 있음(+ 늘림 / − 줄임).
--       잔액 = … + Σ조정 amount_usd. 수입/지출 집계·분석에서는 제외. 앱 폼에서는 만들지 않음(스크립트 전용), 내역에서 표시·삭제만.
-- 멱등. 실행: Supabase 콘솔 SQL Editor. 선행: patch104.

begin;

alter table public.acct_inout drop constraint if exists acct_inout_gubun_check;
alter table public.acct_inout add constraint acct_inout_gubun_check check (gubun in ('수입', '지출', '이체', '조정'));

alter table public.acct_inout drop constraint if exists acct_inout_gubun_fields_check;
alter table public.acct_inout add constraint acct_inout_gubun_fields_check check (
  (gubun in ('수입', '지출') and item_id is not null and to_account_id is null)
  or
  (gubun = '이체' and item_id is null and account_id is not null and to_account_id is not null and account_id <> to_account_id)
  or
  (gubun = '조정' and item_id is null and account_id is not null and to_account_id is null)
);

commit;
