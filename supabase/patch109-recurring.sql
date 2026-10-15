-- MFH patch109: 반복 기록(매월 N일 자동 이체·납부) — acct_recurring(규칙) / acct_recurring_due(승인대기)
--
-- 흐름: Claude 예약 작업(매일) → scripts/recurring-due.ts 가 규칙별로 "이번 달 해당일이 지났고 아직 없는" 승인대기(due) 행을 만든다
--       → 우진이 /accounting/inbox 에서 실제 이체·납부를 확인한 뒤 승인(장부 저장) 또는 건너뜀. 자동 저장은 하지 않는다.
-- 시드: ① 개인→청약 이체 20,000원 매월 10일 ② 국민연금 96,000원 매월 10일(생활비/국민연금) — 2026-11 부터(8~10월은 수동 입력됨).
-- RLS: patch103 패턴(멤버 부부). 멱등. 실행: Supabase 콘솔 SQL Editor. 선행: patch102·104·107.

begin;

create table if not exists public.acct_recurring (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,                                  -- 규칙 이름 = 생성될 거래의 내용
  gubun         text not null check (gubun in ('수입', '지출', '이체')),
  item_id       uuid references public.acct_items (id) on delete set null,      -- 수입·지출
  account_id    uuid not null references public.acct_accounts (id) on delete cascade, -- 입금(수입)/지불(지출)/출금(이체)
  to_account_id uuid references public.acct_accounts (id) on delete set null,   -- 이체 입금계좌
  currency      text not null check (currency in ('KRW', 'USD', 'HNL')),
  principal     numeric not null,
  rate          numeric,                                        -- null = 생성 시점 장부의 최근 환율
  day_of_month  integer not null check (day_of_month between 1 and 31),
  start_ym      text not null,                                  -- 'YYYY-MM' 부터
  end_ym        text,                                           -- 'YYYY-MM' 까지(null = 계속)
  vendor        text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint acct_recurring_fields_check check (
    (gubun in ('수입', '지출') and item_id is not null and to_account_id is null)
    or (gubun = '이체' and item_id is null and to_account_id is not null and account_id <> to_account_id)
  )
);

create table if not exists public.acct_recurring_due (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  recurring_id  uuid not null references public.acct_recurring (id) on delete cascade,
  ym            text not null,                                  -- 'YYYY-MM'
  due_date      date not null,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'skipped')),
  inout_id      uuid references public.acct_inout (id) on delete set null,
  decided_at    timestamptz,
  created_at    timestamptz not null default now(),
  unique (recurring_id, ym)
);
create index if not exists acct_recurring_due_status_idx on public.acct_recurring_due (status, due_date);

-- RLS
do $$
declare
  tb text;
  r  record;
  tbls text[] := array['acct_recurring', 'acct_recurring_due'];
begin
  foreach tb in array tbls loop
    execute format('alter table public.%I enable row level security', tb);
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = tb loop
      execute format('drop policy if exists %I on public.%I', r.policyname, tb);
    end loop;
    execute format('create policy %I on public.%I for select using (public.is_member(auth.uid()))', tb || ' member read', tb);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id and public.is_member(auth.uid()))', tb || ' owner insert', tb);
    execute format('create policy %I on public.%I for update using (public.is_member(auth.uid())) with check (public.is_member(auth.uid()))', tb || ' member update', tb);
    execute format('create policy %I on public.%I for delete using (public.is_member(auth.uid()))', tb || ' member delete', tb);
  end loop;
end $$;

-- 시드 2건(없을 때만)
insert into public.acct_recurring (user_id, name, gubun, item_id, account_id, to_account_id, currency, principal, day_of_month, start_ym)
select a.user_id, '청약저축 자동이체', '이체', null, a.id, b.id, 'KRW', 20000, 10, '2026-11'
from public.acct_accounts a, public.acct_accounts b
where a.name = '우리은행(개인)_6154' and b.name = '우리은행(청약)_6537'
  and not exists (select 1 from public.acct_recurring r where r.name = '청약저축 자동이체');

insert into public.acct_recurring (user_id, name, gubun, item_id, account_id, to_account_id, currency, principal, day_of_month, start_ym)
select a.user_id, '국민연금', '지출', i.id, a.id, null, 'KRW', 96000, 10, '2026-11'
from public.acct_accounts a, public.acct_items i
where a.name = '우리은행(개인)_6154' and i.gubun = '지출' and i.name = '국민연금'
  and not exists (select 1 from public.acct_recurring r where r.name = '국민연금');

commit;
