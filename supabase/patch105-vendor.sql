-- MFH patch105: 거래 구매처(vendor) 분리
--
-- 배경: 카드 문자 승인 시 상점명이 적요(name)에 들어갔으나, 적요는 "무엇을 샀는지"여야 한다.
--       구매처(vendor) 컬럼을 분리하고, 적요는 상점 사전(merchant_rules.name)으로 학습·추천한다.
--       설계 = docs/MFH-CARD-SMS-INBOX-DESIGN.md §5-2. 선행: patch102~104.
-- 보정: 기존 SMS 승인분은 vendor ← card_tx_inbox.merchant, 적요가 상점명과 같으면 비움.
-- 멱등. 실행: Supabase 콘솔 SQL Editor.

begin;

alter table public.acct_inout add column if not exists vendor text;

update public.acct_inout t
set vendor = i.merchant
from public.card_tx_inbox i
where i.inout_id = t.id and t.source = 'sms' and t.vendor is null;

update public.acct_inout
set name = ''
where source = 'sms' and vendor is not null and name = vendor;

commit;
