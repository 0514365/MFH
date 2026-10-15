-- MFH patch112: 카드 문자 수집 출처 — card_tx_inbox.source ('mac' | 'shortcut')
--
-- 배경: iPhone 단축어 실시간 수집(/api/accounting/sms-ingest)을 추가하고 Mac 수집(scripts/ficohsa-collect.ts)은 백업으로 둔다.
--       같은 거래는 카드·금액·상점 + 수신 ±5분으로 판정해 한 번만 넣는다(lib/ficohsa-sms.ts). 출처는 디버깅·통계용.
--       선행: patch103.
-- 멱등. 실행: Supabase 콘솔 SQL Editor.

begin;

alter table public.card_tx_inbox add column if not exists source text not null default 'mac';

alter table public.card_tx_inbox drop constraint if exists card_tx_inbox_source_check;
alter table public.card_tx_inbox add constraint card_tx_inbox_source_check check (source in ('mac', 'shortcut'));

-- 중복 판정 조회(카드·금액·시각 범위)용
create index if not exists card_tx_inbox_dupe_idx on public.card_tx_inbox (card_last4, principal, sms_at);

commit;
