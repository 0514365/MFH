-- MFH patch84 — push_subscriptions 테이블 + RLS (Phase 5b-1 Web Push)
-- 브라우저 PushSubscription(endpoint + keys)을 사용자별로 저장한다.
-- 구독 저장/삭제는 본인만(RLS). 발송(cron)은 service role 로 RLS 우회해 전체 조회.

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions own" on public.push_subscriptions;
create policy "push_subscriptions own" on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
