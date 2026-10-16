-- MFH patch116: 회계 환율 기준 변경 — 원통화 기록 + 월 마감 환율(트리거) · 통화가 다른 이체의 입금 금액(to_principal)
--
-- 배경(2026-10-16 결정): 수입·지출·조정은 원통화 금액만 기록하고 환율은 입력하지 않는다.
--   USD 환산(rate·amount_usd)은 DB 가 정한다 — 그달 마감 환율(fx_closings) → 없으면 최신 공시(fx_rates, 잠정).
--   통화가 다른 이체(환전·카드 상환)는 양쪽 실제 금액을 기록(principal = 출금 계좌 통화 금액, to_principal = 입금 계좌 통화 금액).
--   모든 입력 경로(앱 폼·카드 문자 승인·자동 승인·반복 기록·CSV·스크립트)를 한 곳에서 처리하려고 BEFORE 트리거로 둔다.
--   2026-09-01 이전 거래는 손대지 않는다(저장된 금액 USD 가 확정값).
--   월 마감 후 그달 재계산 = acct_restate_month('YYYY-MM') (트리거 재실행).
-- 선행: patch102·104·108 · patch114(fx_rates) · patch115(fx_closings).
-- 멱등. 실행: Supabase 콘솔 SQL Editor (MFH 프로젝트 ocygdrwdpoytwwbsrdmp).

begin;

-- 1) 통화가 다른 이체의 입금 측 금액(입금 계좌 통화). 같은 통화 이체·수입·지출·조정은 null.
alter table public.acct_inout add column if not exists to_principal numeric;

-- 2) 환율 조회 — 그달 마감 → 없으면 최신 공시. 둘 다 없으면 null(입력값 유지).
create or replace function public.acct_fx_rate(p_cur text, p_date date)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (select c.rate from public.fx_closings c where c.ym = to_char(p_date, 'YYYY-MM') and c.currency = p_cur),
    (select r.rate from public.fx_rates r where r.currency = p_cur order by r.rate_date desc limit 1)
  )
$$;

-- 3) 트리거 — rate·amount_usd 결정
create or replace function public.acct_inout_apply_fx()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  r        numeric;
  from_cur text;
  to_cur   text;
begin
  if new.date is null or new.date < date '2026-09-01' then
    return new;
  end if;

  if new.gubun in ('수입', '지출', '조정') then
    new.to_principal := null;
    if new.currency = 'USD' then
      new.rate := 1;
      new.amount_usd := new.principal;
    else
      r := public.acct_fx_rate(new.currency, new.date);
      if r is not null then
        new.rate := r;
        new.amount_usd := round(new.principal / r, 2);
      end if;
    end if;
    return new;
  end if;

  if new.gubun = '이체' then
    select a.currency into from_cur from public.acct_accounts a where a.id = new.account_id;
    select a.currency into to_cur from public.acct_accounts a where a.id = new.to_account_id;

    if new.to_principal is not null and from_cur is distinct from to_cur then
      -- 통화가 다른 이체: 양쪽 실제 금액. USD 쪽 금액이 곧 금액(USD), 환율은 실제 교환 비율.
      if new.currency = 'USD' then
        new.rate := 1;
        new.amount_usd := new.principal;
      elsif to_cur = 'USD' then
        new.amount_usd := new.to_principal;
        new.rate := round(new.principal / nullif(new.to_principal, 0), 6);
      else
        r := public.acct_fx_rate(new.currency, new.date);
        if r is not null then
          new.rate := r;
          new.amount_usd := round(new.principal / r, 2);
        end if;
      end if;
    elsif new.to_principal is null and new.currency <> 'USD' and from_cur = new.currency and to_cur = new.currency then
      -- 같은 통화(비 USD) 이체: 마감·공시 환율.
      r := public.acct_fx_rate(new.currency, new.date);
      if r is not null then
        new.rate := r;
        new.amount_usd := round(new.principal / r, 2);
      end if;
    end if;
    -- 그 외(입금 금액 없이 기록된 예전 방식의 통화 간 이체)는 입력값 유지.
  end if;
  return new;
end;
$$;

drop trigger if exists acct_inout_apply_fx on public.acct_inout;
create trigger acct_inout_apply_fx
  before insert or update on public.acct_inout
  for each row execute function public.acct_inout_apply_fx();

-- 4) 월 재계산 — 마감 환율 고정 후 그달 거래에 다시 적용(트리거 재실행). 변경 행 수 반환.
create or replace function public.acct_restate_month(p_ym text)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  n integer;
begin
  if p_ym !~ '^\d{4}-\d{2}$' or p_ym < '2026-09' then
    raise exception 'invalid month %', p_ym;
  end if;
  update public.acct_inout
     set rate = rate
   where to_char(date, 'YYYY-MM') = p_ym
     and currency <> 'USD';
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.acct_fx_rate(text, date) to authenticated;
grant execute on function public.acct_restate_month(text) to authenticated;

commit;
