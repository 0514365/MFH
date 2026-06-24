-- MFH patch97: 후원자 관리 — supporters / supporter_donations / supporter_logs
--
-- 정체성: 후원자는 "앱 사용자"가 아니라 "멤버(부부)가 관리하는 대상 데이터"다.
--   → 공개 포트폴리오 라인에 절대 노출하지 않는다(민감정보: 생년월일·연락처·헌금액).
--   → RLS = 멤버 전용. patch73(멤버 읽기 / 본인 쓰기) + patch91(마스터 수정·삭제) 패턴 그대로.
--
-- 구조:
--   supporters           후원자 마스터(기본정보·사진·정기후원·주요기도제목·특이사항)
--   supporter_donations  헌금이력(1:N) — 통화 KRW/USD 선택, USD 환산액(amount_usd) 고정 저장
--   supporter_logs       관계 히스토리(1:N) — 첫만남/선교발송/방문/연락/기도요청, journal 연계(Phase B)
--
-- 환율: KRW 입력 시 amount_usd = round(amount / exchange_rate, 2). USD 입력 시 그대로.
--       합계·통계는 모두 amount_usd 기준(앱에서 집계).
-- 코드값(currency / donation_type / log_type)은 영문 키로 저장, UI 라벨은 lib/supporters.ts 매핑.
--
-- ★ 선행조건: patch73(is_member) + patch91(is_master) 적용 완료(운영 중).
-- 멱등: create table if not exists · 정책 drop if exists 후 create · 버킷 on conflict do nothing.
-- 전체를 트랜잭션으로 감싸 원자 적용(중간 실패 시 전부 롤백).
-- 실행: Supabase 콘솔 SQL Editor 에 붙여넣고 실행.

begin;

-- ─────────────────────────────────────────────
-- 1) supporters — 후원자 마스터
-- ─────────────────────────────────────────────
create table if not exists public.supporters (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  name               text not null,
  birth_date         date,                              -- 생년월일(나이는 앱에서 계산)
  affiliation        text,                              -- 소속
  role               text,                              -- 직분
  region             text,                              -- 거주지역
  phone              text,
  email              text,
  sns                text,                              -- 기타 연락처(SNS)
  photo_path         text,                              -- supporter-photos 버킷 경로
  thumb_path         text,                              -- 썸네일 경로(목록용)
  referrer           text,                              -- 소개자
  first_met_date     date,                              -- 첫 만남 날짜
  is_recurring       boolean not null default false,    -- 정기후원 여부
  recurring_amount   numeric,                           -- 정기후원 금액
  recurring_currency text    not null default 'USD',    -- 정기후원 통화: KRW | USD
  recurring_note     text,                              -- 정기후원 주기/메모
  prayer_points      text,                              -- 주요 기도제목
  notes              text,                              -- 특이사항 메모
  is_active          boolean not null default true,     -- 활성(보관 처리용)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists supporters_user_idx   on public.supporters (user_id);
create index if not exists supporters_active_idx  on public.supporters (is_active);
create index if not exists supporters_name_idx    on public.supporters (name);

-- ─────────────────────────────────────────────
-- 2) supporter_donations — 헌금이력(1:N)
-- ─────────────────────────────────────────────
create table if not exists public.supporter_donations (
  id            uuid primary key default gen_random_uuid(),
  supporter_id  uuid not null references public.supporters (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  donation_date date    not null,
  amount        numeric not null,                       -- 입력 원금
  currency      text    not null default 'USD',         -- KRW | USD
  exchange_rate numeric,                                -- 1 USD = N KRW (KRW 입력 시)
  amount_usd    numeric not null,                       -- USD 환산액(고정 저장, 합계용)
  donation_type text,                                   -- regular | purpose | onetime
  purpose       text,                                   -- 목적헌금 메모
  method        text,                                   -- transfer | cash | other …
  note          text,
  created_at    timestamptz not null default now()
);

create index if not exists supporter_donations_supporter_idx on public.supporter_donations (supporter_id, donation_date desc);
create index if not exists supporter_donations_date_idx       on public.supporter_donations (donation_date desc);

-- ─────────────────────────────────────────────
-- 3) supporter_logs — 관계 히스토리(1:N)
-- ─────────────────────────────────────────────
create table if not exists public.supporter_logs (
  id           uuid primary key default gen_random_uuid(),
  supporter_id uuid not null references public.supporters (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  log_date     date not null,
  log_type     text,                                    -- first_meet | letter_sent | visit | contact | prayer | other
  title        text,
  body         text,
  journal_id   uuid references public.journal_entries (id) on delete set null,  -- Phase B: 일지 연계
  created_at   timestamptz not null default now()
);

create index if not exists supporter_logs_supporter_idx on public.supporter_logs (supporter_id, log_date desc);

-- ─────────────────────────────────────────────
-- 4) RLS — 멤버 읽기 / 본인 쓰기 / 본인·마스터 수정·삭제 (3개 테이블 동일)
-- ─────────────────────────────────────────────
do $$
declare
  tb text;
  r  record;
  tbls text[] := array['supporters', 'supporter_donations', 'supporter_logs'];
begin
  foreach tb in array tbls loop
    execute format('alter table public.%I enable row level security', tb);

    -- 기존 정책 동적 제거(재실행 멱등)
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = tb loop
      execute format('drop policy if exists %I on public.%I', r.policyname, tb);
    end loop;

    -- 멤버 읽기
    execute format(
      'create policy %I on public.%I for select using (public.is_member(auth.uid()))',
      tb || ' member read', tb);

    -- 본인 + 멤버만 작성
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id and public.is_member(auth.uid()))',
      tb || ' owner insert', tb);

    -- 본인 또는 마스터 수정(WITH CHECK 에도 마스터 우회 — patch91 동일 이유)
    execute format(
      'create policy %I on public.%I for update '
      || 'using (auth.uid() = user_id or public.is_master(auth.uid())) '
      || 'with check (auth.uid() = user_id or public.is_master(auth.uid()))',
      tb || ' owner or master update', tb);

    -- 본인 또는 마스터 삭제
    execute format(
      'create policy %I on public.%I for delete '
      || 'using (auth.uid() = user_id or public.is_master(auth.uid()))',
      tb || ' owner or master delete', tb);
  end loop;
end $$;

-- ─────────────────────────────────────────────
-- 5) Storage — supporter-photos 버킷(비공개) + 멤버 읽기 / 본인 폴더 쓰기 (patch87 패턴)
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('supporter-photos', 'supporter-photos', false)
on conflict (id) do nothing;

-- 기존 supporter-photos 정책 동적 제거(멱등)
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') like '%supporter-photos%'
           or coalesce(with_check, '') like '%supporter-photos%')
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

drop policy if exists "supporter_photos member read"  on storage.objects;
drop policy if exists "supporter_photos owner insert"  on storage.objects;
drop policy if exists "supporter_photos owner update"  on storage.objects;
drop policy if exists "supporter_photos owner delete"  on storage.objects;

create policy "supporter_photos member read"
  on storage.objects for select
  using (bucket_id = 'supporter-photos' and public.is_member(auth.uid()));

create policy "supporter_photos owner insert"
  on storage.objects for insert
  with check (bucket_id = 'supporter-photos' and auth.uid() = (storage.foldername(name))[1]::uuid);

create policy "supporter_photos owner update"
  on storage.objects for update
  using (bucket_id = 'supporter-photos' and auth.uid() = (storage.foldername(name))[1]::uuid)
  with check (bucket_id = 'supporter-photos' and auth.uid() = (storage.foldername(name))[1]::uuid);

create policy "supporter_photos owner delete"
  on storage.objects for delete
  using (bucket_id = 'supporter-photos' and auth.uid() = (storage.foldername(name))[1]::uuid);

commit;
