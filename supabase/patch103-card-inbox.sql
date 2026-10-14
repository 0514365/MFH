-- MFH patch103: Ficohsa 카드 문자 승인대기 인박스 — card_tx_inbox / merchant_rules
--
-- 배경: Mac 메시지(chat.db)의 Ficohsa 카드 거래 문자를 매일 22:00 수집(scripts/ficohsa-collect.ts)해
--       대기열에 넣고, 앱 /accounting/inbox 에서 항목·적요·계좌·환율을 확인·승인하면 acct_inout 에 저장한다.
--       설계 정본 = docs/MFH-CARD-SMS-INBOX-DESIGN.md §3. 선행: patch102(acct_*).
--
-- 구조:
--   card_tx_inbox   수집된 거래 1건 = 1행. sms_key(카드끝4-일시) unique 로 중복 수집 방지.
--                   suggested_* = 수집 시 merchant_rules 로 채운 추천값(없으면 null → 앱에서 지정).
--                   status: pending(대기) / approved(승인 → inout_id) / ignored(무시).
--   merchant_rules  상점명 → 항목·적요·계좌 학습 사전. 승인할 때마다 upsert(최신 값으로 갱신, hit_count+1).
--
-- RLS: 부부 2인(is_member) 읽기·수정·삭제, INSERT 는 본인 user_id + 멤버 (patch102 동일).
--      수집 스크립트는 service role 로 insert(RLS 우회) — user_id 는 .env.local MFH_USER_ID.
-- 멱등. 실행: Supabase 콘솔 SQL Editor.

begin;

-- ─────────────────────────────────────────────
-- 1) merchant_rules — 상점 학습 사전
-- ─────────────────────────────────────────────
create table if not exists public.merchant_rules (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  merchant     text not null unique,                      -- 문자의 상점명 그대로(대문자, 공백 정규화)
  item_id      uuid not null references public.acct_items (id) on delete cascade,
  name         text,                                      -- 추천 적요(null = 상점명 사용)
  account_id   uuid references public.acct_accounts (id) on delete set null,
  hit_count    integer not null default 1,
  last_used_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 2) card_tx_inbox — 승인대기 거래
-- ─────────────────────────────────────────────
create table if not exists public.card_tx_inbox (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  sms_key              text not null unique,               -- '<card_last4>-<YYYYMMDDHHMMSS>-<원금>' (문자 수신 로컬시각 + 금액)
  sms_at               timestamptz not null,               -- 문자 수신 시각
  card_last4           text not null,
  currency             text not null check (currency in ('KRW', 'USD', 'HNL')),
  principal            numeric not null,                   -- 원금(현지통화)
  merchant             text not null,
  raw_text             text,
  status               text not null default 'pending' check (status in ('pending', 'approved', 'ignored')),
  suggested_item_id    uuid references public.acct_items (id) on delete set null,
  suggested_name       text,
  suggested_account_id uuid references public.acct_accounts (id) on delete set null,
  inout_id             uuid references public.acct_inout (id) on delete set null,  -- 승인 결과
  decided_at           timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists card_tx_inbox_status_idx on public.card_tx_inbox (status, sms_at desc);
create index if not exists card_tx_inbox_sms_at_idx on public.card_tx_inbox (sms_at desc);

-- ─────────────────────────────────────────────
-- 3) RLS — 멤버(부부) 읽기·수정·삭제 / 본인+멤버 작성
-- ─────────────────────────────────────────────
do $$
declare
  tb text;
  r  record;
  tbls text[] := array['merchant_rules', 'card_tx_inbox'];
begin
  foreach tb in array tbls loop
    execute format('alter table public.%I enable row level security', tb);

    for r in select policyname from pg_policies where schemaname = 'public' and tablename = tb loop
      execute format('drop policy if exists %I on public.%I', r.policyname, tb);
    end loop;

    execute format(
      'create policy %I on public.%I for select using (public.is_member(auth.uid()))',
      tb || ' member read', tb);

    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id and public.is_member(auth.uid()))',
      tb || ' owner insert', tb);

    execute format(
      'create policy %I on public.%I for update '
      || 'using (public.is_member(auth.uid())) '
      || 'with check (public.is_member(auth.uid()))',
      tb || ' member update', tb);

    execute format(
      'create policy %I on public.%I for delete using (public.is_member(auth.uid()))',
      tb || ' member delete', tb);
  end loop;
end $$;

commit;
