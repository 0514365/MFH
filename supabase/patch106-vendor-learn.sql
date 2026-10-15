-- MFH patch106: 구매처 표시명 학습
--
-- 배경: 문자 상점명은 은행이 16자로 잘라 보냄("SUPERMERCADOS LA"). 승인 때 구매처를 바로잡을 수 있게 하고,
--       바로잡은 이름을 상점 사전에 학습해 같은 상점의 다음 거래(대기 중인 행 포함)에 추천한다.
--       설계 = docs/MFH-CARD-SMS-INBOX-DESIGN.md §5-3. 선행: patch103 · patch105.
-- 멱등. 실행: Supabase 콘솔 SQL Editor.

begin;

alter table public.merchant_rules add column if not exists vendor text;        -- 학습된 구매처 표시명(null = 상점명 그대로)
alter table public.card_tx_inbox add column if not exists suggested_vendor text; -- 수집 시 추천 구매처(앱은 사전을 실시간 우선)

commit;
