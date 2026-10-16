-- MFH patch114: 공시 환율(fx_rates) — 자산 평가용
--
-- 배경: 계좌 잔액(USD)은 거래 시점 환율로 누적한 장부가라, 환율이 들쭉날쭉했던 계좌(특히 KRW)는 실제 가치와 어긋난다.
--       공시 환율을 날짜별로 저장해 "보유 현지통화 ÷ 공시 환율 = 평가액(USD)" 을 계산한다(장부는 그대로 — 표시용).
--   · KRW = 한국수출입은행 Open API 매매기준율(deal_bas_r)            source='koreaexim'
--   · HNL = 온두라스 중앙은행(BCH) 기준환율(precio de referencia)      source='bch' (Claude 예약 작업이 웹검색)
--   · 수동 입력                                                        source='manual'
--   rate = 1 USD 당 현지통화(acct_inout.rate 와 같은 방향). buy/sell 은 공시에 있으면 함께 보관(선택).
--   수집 = scripts/fx-collect.ts(service role). 하루·통화당 1행(재수집 시 덮어씀).
-- RLS: 부부 2인(is_member) 읽기·쓰기(patch102 회계 테이블과 동일). 선행: patch73(is_member).
-- 멱등. 실행: Supabase 콘솔 SQL Editor.

begin;

create table if not exists public.fx_rates (
  id          uuid primary key default gen_random_uuid(),
  rate_date   date not null,                      -- 공시 기준일(현지 영업일)
  currency    text not null check (currency in ('HNL', 'KRW')),
  rate        numeric not null check (rate > 0),  -- 1 USD 당 현지통화(기준율)
  buy         numeric,                            -- 매입(compra / 송금 받을 때)
  sell        numeric,                            -- 매도(venta / 송금 보낼 때)
  source      text not null default 'manual' check (source in ('koreaexim', 'bch', 'manual')),
  source_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint fx_rates_date_cur_key unique (rate_date, currency)
);

create index if not exists fx_rates_cur_date_idx on public.fx_rates (currency, rate_date desc);

alter table public.fx_rates enable row level security;

drop policy if exists "fx_rates member select" on public.fx_rates;
create policy "fx_rates member select" on public.fx_rates
  for select using (public.is_member(auth.uid()));

drop policy if exists "fx_rates member insert" on public.fx_rates;
create policy "fx_rates member insert" on public.fx_rates
  for insert with check (public.is_member(auth.uid()));

drop policy if exists "fx_rates member update" on public.fx_rates;
create policy "fx_rates member update" on public.fx_rates
  for update using (public.is_member(auth.uid())) with check (public.is_member(auth.uid()));

drop policy if exists "fx_rates member delete" on public.fx_rates;
create policy "fx_rates member delete" on public.fx_rates
  for delete using (public.is_member(auth.uid()));

grant select, insert, update, delete on public.fx_rates to authenticated;

commit;
