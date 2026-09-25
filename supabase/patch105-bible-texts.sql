-- MFH patch105 — 인앱 성경 본문(bible_texts). 멱등.
-- 본문은 repo·공개 URL 에 두지 않는다(부부 멤버 내부 열람 한정). 시딩은 scripts/bible-seed.ts(service role)만.
-- 읽기 = 멤버 전용(is_member, patch73). insert/update/delete 정책 없음(service role 전용).
-- 원자료 = ../Manna/Bible (BIBLE_DIR 환경변수) — Manna patch10 과 동일 테이블, RLS 만 is_member 로.

create table if not exists public.bible_texts (
  version    text    not null check (version in ('nkrv', 'nkt', 'esv')), -- 개역개정·새한글·ESV
  chap_seq   integer not null check (chap_seq between 1 and 1189),       -- 정경 순서 장 번호(창1=1 … 계22=1189)
  book_order integer not null check (book_order between 1 and 66),
  chapter    integer not null check (chapter >= 1),
  verse      integer not null check (verse >= 1),
  verse_end  integer,                                                    -- 합절(예: 신6:18-19)의 끝 절, 단절은 null
  body       text    not null,                                           -- <소제목> 인라인 보존, \n 줄바꿈
  primary key (version, chap_seq, verse)
);

create index if not exists bible_texts_lookup_idx on public.bible_texts (version, chap_seq);

alter table public.bible_texts enable row level security;

drop policy if exists "bible_texts member read" on public.bible_texts;
create policy "bible_texts member read" on public.bible_texts
  for select using (public.is_member(auth.uid()));
