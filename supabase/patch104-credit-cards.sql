-- MFH patch104: 신용카드 계좌 + 이체 구분
--
-- 배경: Ficohsa 카드 4956·7697 은 신용카드(한 달 뒤 Ficohsa(달러) 계좌에서 상환), 3070 은 Ficohsa(달러) 직불카드.
--       (1568 은 2024-02~2025-04 사용 후 7697 로 교체된 옛 카드 — 미연결. 직불 3070 은 문자 알림이 오지 않음.)
--       카드 결제는 결제 시점에 지출이고, 상환은 지출이 아닌 "이체"(은행 → 카드 부채 정산)로 기록해 이중 계산을 막는다.
--       설계 = docs/MFH-CARD-SMS-INBOX-DESIGN.md §5. 선행: patch102 · patch103.
--
-- 변경:
--   1) acct_accounts.card_last4 — 카드 끝 4자리(수집기가 결제 카드 → 계좌 자동 연결).
--   2) 계좌 2개 생성(없을 때만): 'Ficohsa 신용카드 4956' · 'Ficohsa 신용카드 7697' (HNL, 유형 신용카드). Ficohsa(달러) ← 3070.
--   3) acct_inout: 구분에 '이체' 허용 · item_id null 허용(이체) · to_account_id(입금계좌) 추가 · 정합성 check.
--      이체 = account_id(출금) → to_account_id(입금). 잔액: 출금계좌 −, 입금계좌 +. 집계(수입/지출)는 이체 제외.
--   4) 데이터 보정: 이미 승인된 카드 결제 지출(source=sms) 과 승인대기 추천 계좌를 카드 끝자리 기준으로 카드 계좌로 변경.
-- 멱등. 실행: Supabase 콘솔 SQL Editor.

begin;

-- 1) 카드 끝자리
alter table public.acct_accounts add column if not exists card_last4 text;
create unique index if not exists acct_accounts_card_last4_idx on public.acct_accounts (card_last4) where card_last4 is not null;

-- 2) 신용카드 계좌 생성 + 직불 연결 (user_id 는 기존 계좌 소유자)
insert into public.acct_accounts (user_id, name, currency, info, kind, card_last4, sort_order)
select a.user_id, v.name, 'HNL', v.info, '신용카드', v.card_last4, v.sort_order
from (values
  ('Ficohsa 신용카드 4956', '신용카드 · 상환은 Ficohsa(달러)에서 이체', '4956', 10),
  ('Ficohsa 신용카드 7697', '신용카드 · 상환은 Ficohsa(달러)에서 이체', '7697', 11)
) as v(name, info, card_last4, sort_order)
cross join (select user_id from public.acct_accounts order by created_at limit 1) a
where not exists (select 1 from public.acct_accounts x where x.name = v.name);

update public.acct_accounts set card_last4 = '3070' where name = 'Ficohsa(달러)' and (card_last4 is null or card_last4 = '1568');

-- 3) 이체 구분
alter table public.acct_inout drop constraint if exists acct_inout_gubun_check;
alter table public.acct_inout add constraint acct_inout_gubun_check check (gubun in ('수입', '지출', '이체'));

alter table public.acct_inout alter column item_id drop not null;
alter table public.acct_inout add column if not exists to_account_id uuid references public.acct_accounts (id) on delete set null;
create index if not exists acct_inout_to_account_idx on public.acct_inout (to_account_id);

alter table public.acct_inout drop constraint if exists acct_inout_gubun_fields_check;
alter table public.acct_inout add constraint acct_inout_gubun_fields_check check (
  (gubun in ('수입', '지출') and item_id is not null and to_account_id is null)
  or
  (gubun = '이체' and item_id is null and account_id is not null and to_account_id is not null and account_id <> to_account_id)
);

-- 4) 데이터 보정 — 카드 끝자리 → 카드 계좌
update public.acct_inout t
set account_id = a.id
from public.card_tx_inbox i
join public.acct_accounts a on a.card_last4 = i.card_last4
where i.inout_id = t.id and t.source = 'sms' and t.account_id is distinct from a.id;

update public.card_tx_inbox i
set suggested_account_id = a.id
from public.acct_accounts a
where a.card_last4 = i.card_last4 and i.status = 'pending' and i.suggested_account_id is distinct from a.id;

commit;
