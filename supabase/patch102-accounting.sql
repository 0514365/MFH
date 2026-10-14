-- MFH patch102: 회계 장부 Supabase 이전 — acct_items / acct_accounts / acct_inout
--
-- 배경: 2026-06 A안(노션 SoT + 앱 입력)을 폐기하고 장부를 Supabase 로 이전한다.
--       설계 정본 = docs/MFH-CARD-SMS-INBOX-DESIGN.md §2. 노션 장부는 읽기전용 백업으로 보존.
--       후속 patch103(카드 문자 승인대기 인박스)이 acct_inout 을 참조한다.
--
-- 구조:
--   acct_items     항목(카테고리) — 구분(수입/지출) · 대분류. 노션 항목 DB 이관.
--   acct_accounts  계좌(자산) — 통화 · 계좌정보 · 초기/조정 금액(USD). 노션 자산 DB 이관.
--   acct_inout     거래 — 원금(현지통화) · 환율 · 금액(USD 환산) · 항목/계좌/후원자 FK. 노션 입출금기록 이관.
--
-- 환산 규칙(기존 그대로): amount_usd = principal ÷ rate, rate = 1 USD 당 현지통화(USD 는 1).
-- 계좌 잔액(앱 계산): initial_usd + adjust_usd + Σ(수입 amount_usd) − Σ(지출 amount_usd).
-- notion_id: 마이그레이션 upsert 키(재실행 안전). 앱 신규 입력은 null.
--
-- RLS: 부부 2인(is_member) 전원 읽기·수정·삭제, INSERT 는 본인 user_id + 멤버 (patch101 패턴).
-- ★ 선행조건: patch73(is_member) · patch97(supporters) 적용 완료.
-- 멱등: create table if not exists · add column if not exists · 정책 drop 후 create.
-- 실행: Supabase 콘솔 SQL Editor 에 붙여넣고 실행.

begin;

-- ─────────────────────────────────────────────
-- 1) acct_items — 항목
-- ─────────────────────────────────────────────
create table if not exists public.acct_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  gubun       text not null check (gubun in ('수입', '지출')),
  name        text not null,
  category    text,                                   -- 대분류(후원·헌금·기타수입 / 사역·생활·차량·운영/행정)
  description text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  notion_id   text,                                   -- 노션 항목 page id(이관 키)
  created_at  timestamptz not null default now(),
  constraint acct_items_gubun_name_key unique (gubun, name)
);

create unique index if not exists acct_items_notion_idx on public.acct_items (notion_id) where notion_id is not null;

-- ─────────────────────────────────────────────
-- 2) acct_accounts — 계좌
-- ─────────────────────────────────────────────
create table if not exists public.acct_accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null unique,
  currency    text not null check (currency in ('KRW', 'USD', 'HNL')),
  info        text,                                   -- 계좌정보(계좌번호·용도)
  kind        text not null default '현금',            -- 유형(현금·카드 등)
  initial_usd numeric not null default 0,             -- 초기 보유 금액(USD 환산)
  adjust_usd  numeric not null default 0,             -- 조정 금액(USD 환산)
  is_favorite boolean not null default false,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  notion_id   text,
  created_at  timestamptz not null default now()
);

create unique index if not exists acct_accounts_notion_idx on public.acct_accounts (notion_id) where notion_id is not null;

-- ─────────────────────────────────────────────
-- 3) acct_inout — 거래
-- ─────────────────────────────────────────────
create table if not exists public.acct_inout (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  gubun        text not null check (gubun in ('수입', '지출')),
  date         date not null,
  item_id      uuid not null references public.acct_items (id) on delete restrict,
  name         text not null default '',               -- 적요
  currency     text not null check (currency in ('KRW', 'USD', 'HNL')),
  principal    numeric not null,                       -- 원금(현지통화)
  rate         numeric not null default 1,             -- 환율(1 USD 당 현지통화)
  amount_usd   numeric not null,                       -- 금액(USD 환산)
  account_id   uuid references public.acct_accounts (id) on delete set null,  -- 수입=입금계좌 / 지출=지불계좌
  supporter_id uuid references public.supporters (id) on delete set null,     -- 수입 거래의 후원자
  receipt_path text,                                   -- 영수증 Storage 경로(후속)
  source       text not null default 'manual' check (source in ('manual', 'csv', 'sms', 'notion')),
  notion_id    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists acct_inout_date_idx      on public.acct_inout (date desc);
create index if not exists acct_inout_item_idx      on public.acct_inout (item_id);
create index if not exists acct_inout_account_idx   on public.acct_inout (account_id);
create index if not exists acct_inout_supporter_idx on public.acct_inout (supporter_id);
create unique index if not exists acct_inout_notion_idx on public.acct_inout (notion_id) where notion_id is not null;

-- updated_at 자동 갱신
create or replace function public.acct_inout_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists acct_inout_updated_at on public.acct_inout;
create trigger acct_inout_updated_at
  before update on public.acct_inout
  for each row execute function public.acct_inout_set_updated_at();

-- ─────────────────────────────────────────────
-- 4) RLS — 멤버(부부) 읽기·수정·삭제 / 본인+멤버 작성 (3개 테이블 동일)
-- ─────────────────────────────────────────────
do $$
declare
  tb text;
  r  record;
  tbls text[] := array['acct_items', 'acct_accounts', 'acct_inout'];
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
