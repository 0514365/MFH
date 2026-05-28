-- patch62: 선교편지 (PDF 방식) — letters 신규 재정의
-- 멱등: create if not exists + alter add column if not exists (구버전 letters 대비)
-- 디자인 사양: MFH-PORTFOLIO-DESIGN.md v4 §6-4, §6-5

create table if not exists letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  year_month text not null,
  number text,
  title text not null,
  pdf_path text not null,
  cover_path text,
  public_view boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 구버전 letters(3섹션 정의)가 이미 존재할 경우 누락 컬럼 보강 (데이터 0건이라 무해)
alter table letters add column if not exists year_month text;
alter table letters add column if not exists number text;
alter table letters add column if not exists title text;
alter table letters add column if not exists pdf_path text;
alter table letters add column if not exists cover_path text;
alter table letters add column if not exists public_view boolean default false;
alter table letters add column if not exists sort_order int default 0;

-- RLS
alter table letters enable row level security;

drop policy if exists "letters_owner_all" on letters;
create policy "letters_owner_all" on letters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "letters_public_read" on letters;
create policy "letters_public_read" on letters
  for select using (
    public_view = true and exists (
      select 1 from portfolio p
      where p.user_id = letters.user_id and p.is_public = true
    )
  );

-- 인덱스
create index if not exists letters_user_sort_idx
  on letters (user_id, year_month desc, sort_order);

-- Storage 공개 버킷
insert into storage.buckets (id, name, public)
values ('portfolio-letters', 'portfolio-letters', true)
on conflict (id) do nothing;

drop policy if exists "portfolio_letters_owner_write" on storage.objects;
create policy "portfolio_letters_owner_write"
  on storage.objects for insert
  with check (bucket_id = 'portfolio-letters' and auth.uid() = (storage.foldername(name))[1]::uuid);

drop policy if exists "portfolio_letters_owner_update" on storage.objects;
create policy "portfolio_letters_owner_update"
  on storage.objects for update
  using (bucket_id = 'portfolio-letters' and auth.uid() = (storage.foldername(name))[1]::uuid);

drop policy if exists "portfolio_letters_owner_delete" on storage.objects;
create policy "portfolio_letters_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'portfolio-letters' and auth.uid() = (storage.foldername(name))[1]::uuid);

drop policy if exists "portfolio_letters_public_read" on storage.objects;
create policy "portfolio_letters_public_read"
  on storage.objects for select
  using (bucket_id = 'portfolio-letters');
