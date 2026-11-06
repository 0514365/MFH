-- MFH patch120: 미수금(선지급) 계좌 유형
--
-- 배경: 공적 비용을 먼저 지불하고 뒤에 상환받는 돈은 수입·지출이 아니라 받을 돈(자산)이다(docs/MFH-CARD-SMS-INBOX-DESIGN.md §5-6).
--       앱은 계좌 유형(kind) = '미수금' 인 계좌를 "받을 돈 지갑"으로 알아보고, 기록 폼 「선지급」(지불계좌 → 미수금)·「상환」(미수금 → 입금계좌)
--       버튼이 입금·출금 계좌를 자동으로 잡는다. 수입·지출·조정·일반 이체의 계좌 콤보에서는 이 계좌를 숨긴다.
-- 변경: 이름이 '미수금' 으로 시작하는 계좌의 kind 를 '미수금' 으로. (우진이 앱에서 만든 계좌 `미수금(선지급)`, 유형 기본값 '현금' 이었음)
-- 멱등. 실행: Supabase 콘솔 SQL Editor.

begin;

update public.acct_accounts
set kind = '미수금'
where name like '미수금%' and kind is distinct from '미수금';

commit;
