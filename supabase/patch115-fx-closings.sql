-- MFH patch115: 월 마감 환율(fx_closings) — 그달 수입·지출의 USD 환산 기준
--
-- 배경(2026-10-16 회계 기준 변경): 수입·지출은 원통화 금액만 기록하고(환율 입력 없음), USD 환산은
--       그달 "월말일 공시 환율"로 한다. 월이 끝나면 그 값을 고정해 과거 보고 숫자가 바뀌지 않게 한다.
--       진행 중인 달은 최신 공시 환율(fx_rates)로 잠정 표시. 2026-09 부터 적용(그 이전 기록은 저장된 금액 USD 를 확정값으로 둠).
--   · rate = 1 USD 당 현지통화(기준율 — HNL=BCH 매입 기준율, KRW=수출입은행 매매기준율)
--   · rate_date = 실제 사용한 공시일(월말일이 비영업일이면 직전 영업일)
--   · 고정 = scripts/fx-close-month.ts(다음 달 3일 이후 fx-collect 가 자동 호출, 수동 --force 로만 덮어씀)
-- RLS: 부부 2인(is_member) 읽기·쓰기(patch114 와 동일). 선행: patch73(is_member) · patch114.
-- 멱등. 실행: Supabase 콘솔 SQL Editor (MFH 프로젝트 ocygdrwdpoytwwbsrdmp).

begin;

create table if not exists public.fx_closings (
  ym          text not null check (ym ~ '^\d{4}-\d{2}$'),   -- 'YYYY-MM'
  currency    text not null check (currency in ('HNL', 'KRW')),
  rate        numeric not null check (rate > 0),
  rate_date   date not null,
  source      text not null default 'manual' check (source in ('koreaexim', 'bch', 'manual')),
  source_url  text,
  created_at  timestamptz not null default now(),
  primary key (ym, currency)
);

alter table public.fx_closings enable row level security;

drop policy if exists "fx_closings member select" on public.fx_closings;
create policy "fx_closings member select" on public.fx_closings
  for select using (public.is_member(auth.uid()));

drop policy if exists "fx_closings member insert" on public.fx_closings;
create policy "fx_closings member insert" on public.fx_closings
  for insert with check (public.is_member(auth.uid()));

drop policy if exists "fx_closings member update" on public.fx_closings;
create policy "fx_closings member update" on public.fx_closings
  for update using (public.is_member(auth.uid())) with check (public.is_member(auth.uid()));

drop policy if exists "fx_closings member delete" on public.fx_closings;
create policy "fx_closings member delete" on public.fx_closings
  for delete using (public.is_member(auth.uid()));

grant select, insert, update, delete on public.fx_closings to authenticated;

commit;
