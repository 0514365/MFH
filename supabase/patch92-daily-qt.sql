-- MFH patch92: 일일 QT 묵상 — daily_qt
-- 매일 새벽 Claude Code 가 성서유니온 매일성경 본문(책·장절·찬송)을 가져와,
-- 최근 일지·사역 기록과 접목한 개인화 QT 가이드(묵상·적용·기도)를 하루 1행으로 저장한다.
--   · 본문 텍스트·성서유니온 묵상은 저작권 → 저장 안 함. 책·장절·찬송 메타 + 원문 링크만.
--   · 핵심 절은 개역개정 정확 인용(짧은 인용). QT 가이드는 자체 생성(개혁주의·구속사·기도3원칙 가드레일).
--   · 분석 주체 = Claude Code(구독·WebFetch) → 종량제 API 미사용 = 비용 0.
--   · 표시 = 앱 /qt 전용 페이지(멤버 읽기) + 홈 카드.
-- RLS = honduras_news(patch88)와 동일: 멤버 읽기 / 본인 쓰기. is_member() 재사용.
-- 멱등: create table if not exists / drop policy if exists 후 create / create index if not exists.

create table if not exists public.daily_qt (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  qt_date       date not null,
  -- passage: { book, book_en, range, hymn, source_url }  본문 메타(성경 텍스트 미포함)
  passage       jsonb not null default '{}'::jsonb,
  -- key_verse: { ref, text, summary }  핵심 절(개역개정 정확 인용, 책·장·절) + 한 줄 요약
  key_verse     jsonb not null default '{}'::jsonb,
  -- meditation: 본문 묵상(하나님의 구속 사역과 연결) 한국어 텍스트
  meditation    text,
  -- application: [{ point, basis }]  우리 사역에의 적용(최근 일지·사역 접목 근거)
  application   jsonb not null default '[]'::jsonb,
  -- prayer_points: ["기도 1","기도 2"]  오늘의 기도(기도 3원칙, 1~2개)
  prayer_points jsonb not null default '[]'::jsonb,
  model         text not null default 'claude-code',
  created_at    timestamptz not null default now()
);

-- 하루 1행 — 같은 (user_id, qt_date) 재실행은 덮어쓰기(upsert onConflict).
create unique index if not exists daily_qt_user_date_idx
  on public.daily_qt (user_id, qt_date);
create index if not exists daily_qt_date_idx
  on public.daily_qt (qt_date desc);

alter table public.daily_qt enable row level security;

-- 읽기: 멤버(부부 둘 다). honduras_news 와 동일 패턴.
drop policy if exists "daily_qt member read" on public.daily_qt;
create policy "daily_qt member read"
  on public.daily_qt for select
  using (public.is_member(auth.uid()));

-- 쓰기: 본인 것만(insert 는 멤버 조건도 함께).
drop policy if exists "daily_qt owner insert" on public.daily_qt;
create policy "daily_qt owner insert"
  on public.daily_qt for insert
  with check (auth.uid() = user_id and public.is_member(auth.uid()));

drop policy if exists "daily_qt owner update" on public.daily_qt;
create policy "daily_qt owner update"
  on public.daily_qt for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "daily_qt owner delete" on public.daily_qt;
create policy "daily_qt owner delete"
  on public.daily_qt for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.daily_qt to authenticated;
