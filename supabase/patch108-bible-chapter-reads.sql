-- MFH patch108: 성경통독 — 장별 읽음 기록(bible_chapter_reads)
-- /bible/read 「읽기표 체크 후 다음장」 버튼이 한 장을 읽을 때마다 1행 추가(같은 장을 여러 번 읽으면 여러 행).
--   · chap_seq = 정경 순서 장 번호(1=창1 … 1189=계22, lib/bible/texts.ts chapSeqOf) — 계획·순서와 무관하게 누적.
--   · plan_id / plan_day_id = 어느 계획·일차에서 읽었는지(선택, 계획 삭제 시 null).
--   · 화면: 장마다 "최근 읽은 날 · 총 N회". 하루치 장을 모두 체크하면 앱이 reading_plan_days.done 도 켠다.
-- RLS = 본인 전용(auth.uid() = user_id). 멱등.

create table if not exists public.bible_chapter_reads (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  chap_seq     integer not null check (chap_seq between 1 and 1189),
  plan_id      uuid references public.reading_plans (id) on delete set null,
  plan_day_id  uuid references public.reading_plan_days (id) on delete set null,
  read_at      timestamptz not null default now()
);

create index if not exists bible_chapter_reads_user_chap_idx
  on public.bible_chapter_reads (user_id, chap_seq, read_at desc);

alter table public.bible_chapter_reads enable row level security;

drop policy if exists "bible_chapter_reads owner select" on public.bible_chapter_reads;
create policy "bible_chapter_reads owner select"
  on public.bible_chapter_reads for select
  using (auth.uid() = user_id);

drop policy if exists "bible_chapter_reads owner insert" on public.bible_chapter_reads;
create policy "bible_chapter_reads owner insert"
  on public.bible_chapter_reads for insert
  with check (auth.uid() = user_id);

drop policy if exists "bible_chapter_reads owner delete" on public.bible_chapter_reads;
create policy "bible_chapter_reads owner delete"
  on public.bible_chapter_reads for delete
  using (auth.uid() = user_id);

grant select, insert, delete on public.bible_chapter_reads to authenticated;
