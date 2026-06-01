-- MFH patch77: insight_sources — 드롭박스 준자동 회수 소스(1b).
--
-- 배경: claude.ai 분석 결과를 드롭박스 텍스트 파일에 덮어쓰면, 앱이 진입 시
--       등록된 링크를 폴링 fetch → 내용 해시가 바뀐 경우에만 parseInsightBundle 로
--       렌즈 분배 저장(/api/insights/source POST). 복붙 불필요.
-- 모델: 사용자당 1행(user_id PK). 각자 본인 소스만 — 멤버 공유 없음(insights 와 달리).
-- 멱등: create table if not exists + add column if not exists + 정책 drop→create. 반복 실행 안전.

begin;

create table if not exists public.insight_sources (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  url              text not null,
  last_hash        text,
  last_fetched_at  timestamptz,
  last_imported_at timestamptz,
  last_count       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 재실행 시 컬럼 보강(테이블이 이미 있던 경우 대비).
alter table public.insight_sources add column if not exists last_hash        text;
alter table public.insight_sources add column if not exists last_fetched_at  timestamptz;
alter table public.insight_sources add column if not exists last_imported_at timestamptz;
alter table public.insight_sources add column if not exists last_count       integer not null default 0;
alter table public.insight_sources add column if not exists updated_at       timestamptz not null default now();

alter table public.insight_sources enable row level security;

-- 본인 전용(읽기/쓰기 모두 auth.uid() = user_id). 멤버 공유 안 함.
drop policy if exists "insight_sources owner select" on public.insight_sources;
drop policy if exists "insight_sources owner insert" on public.insight_sources;
drop policy if exists "insight_sources owner update" on public.insight_sources;
drop policy if exists "insight_sources owner delete" on public.insight_sources;

create policy "insight_sources owner select" on public.insight_sources for select using (auth.uid() = user_id);
create policy "insight_sources owner insert" on public.insight_sources for insert with check (auth.uid() = user_id);
create policy "insight_sources owner update" on public.insight_sources for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "insight_sources owner delete" on public.insight_sources for delete using (auth.uid() = user_id);

commit;
