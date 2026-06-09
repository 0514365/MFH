-- MFH patch88: 온두라스 동향 — honduras_news
-- 매일 아침 Claude Code 가 WebSearch 로 온두라스 뉴스를 검색·정리해
-- 정치/경제/사회/문화 4섹션 + San Pedro Sula·한인 하이라이트 + 선교 인사이트를 하루 1행으로 저장한다.
--   · 분석 주체 = Claude Code(구독·WebSearch) → 종량제 API·web_search server tool 미사용 = 비용 0.
--   · 표시 = 앱 /honduras 전용 페이지(멤버 읽기). 홈 최상단 카드.
--   · 이 페이지는 내부 동향 파악용 → 정당·인물 실명 그대로 기재(편지·FB 등 외부 발신물의 정치중립 규칙과 별개).
-- RLS = weekly_fb 와 동일(patch86): 멤버 읽기 / 본인 쓰기. is_member() 재사용.
-- 멱등: create table if not exists / drop policy if exists 후 create / create index if not exists.

create table if not exists public.honduras_news (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  news_date   date not null,
  -- sections: { politics:[{title,body,source}], economy:[…], society:[…], culture:[…] }
  sections    jsonb not null default '{}'::jsonb,
  -- highlights: [{ tag:'San Pedro Sula'|'한인', title, body, source }]  강조 항목
  highlights  jsonb not null default '[]'::jsonb,
  -- insight: 선교·사역·기도 함의(한국어 텍스트)
  insight     text,
  model       text not null default 'claude-code',
  created_at  timestamptz not null default now()
);

-- 같은 날(user_id,news_date) 재실행은 덮어쓰기(upsert) → 하루 1행 유지.
create unique index if not exists honduras_news_user_date_idx
  on public.honduras_news (user_id, news_date);
create index if not exists honduras_news_date_idx
  on public.honduras_news (news_date desc);

alter table public.honduras_news enable row level security;

-- 읽기: 멤버(부부 둘 다). weekly_fb 와 동일 패턴.
drop policy if exists "honduras_news member read" on public.honduras_news;
create policy "honduras_news member read"
  on public.honduras_news for select
  using (public.is_member(auth.uid()));

-- 쓰기: 본인 것만(insert 는 멤버 조건도 함께).
drop policy if exists "honduras_news owner insert" on public.honduras_news;
create policy "honduras_news owner insert"
  on public.honduras_news for insert
  with check (auth.uid() = user_id and public.is_member(auth.uid()));

drop policy if exists "honduras_news owner update" on public.honduras_news;
create policy "honduras_news owner update"
  on public.honduras_news for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "honduras_news owner delete" on public.honduras_news;
create policy "honduras_news owner delete"
  on public.honduras_news for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.honduras_news to authenticated;
