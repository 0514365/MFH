-- MFH patch81b: 인사이트 저장구조 재설계 (Phase 3a) (구 patch81 — 번호 중복으로 81b 재명명)
--  · insights 를 (user_id, domain)별 최신 1행만 유지 → Local 루틴이 도메인별 upsert(최신 교체).
--    별점/메모/in_letter 는 루틴이 update 로 보존(덮어쓰지 않음).
--  · insight_scraps : 앱에서 "보관"한 인사이트의 생성 시점 복사본(영구). 최신 교체와 무관하게 유지.
-- 멱등: 반복 실행 안전.

begin;

-- 1) 중복 정리 — (user_id, domain)별 최신(created_at) 1행만 남기고 삭제.
delete from public.insights a
using public.insights b
where a.user_id = b.user_id
  and a.domain = b.domain
  and a.created_at < b.created_at;
-- created_at 동률 대비: id 작은 것 삭제.
delete from public.insights a
using public.insights b
where a.user_id = b.user_id
  and a.domain = b.domain
  and a.created_at = b.created_at
  and a.id < b.id;

-- 2) (user_id, domain) unique — Local 루틴 upsert onConflict 대상.
alter table public.insights drop constraint if exists insights_user_domain_key;
alter table public.insights add constraint insights_user_domain_key unique (user_id, domain);

-- 3) 보관(스크랩) 테이블 — 영구 복사본.
create table if not exists public.insight_scraps (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  source_id     uuid,                          -- 원본 insights id(참고용; 최신 교체로 끊길 수 있어 FK 아님)
  domain        text not null,
  content       text not null,
  period_start  date,
  period_end    date,
  rating        smallint,
  feedback_note text,
  scrapped_at   timestamptz not null default now()
);

alter table public.insight_scraps enable row level security;
drop policy if exists "insight_scraps owner select" on public.insight_scraps;
drop policy if exists "insight_scraps owner insert" on public.insight_scraps;
drop policy if exists "insight_scraps owner delete" on public.insight_scraps;
create policy "insight_scraps owner select" on public.insight_scraps for select using (auth.uid() = user_id);
create policy "insight_scraps owner insert" on public.insight_scraps for insert with check (auth.uid() = user_id);
create policy "insight_scraps owner delete" on public.insight_scraps for delete using (auth.uid() = user_id);

create index if not exists insight_scraps_user_idx on public.insight_scraps(user_id, scrapped_at desc);

commit;
