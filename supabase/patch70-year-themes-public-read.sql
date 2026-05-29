-- MFH patch70: year_themes 공개 읽기 (공개 포트폴리오 소유자의 주제만)
-- 목적: 비로그인 방문자가 공유페이지(/p/[slug]) 오프닝에서 주제·목표를 볼 수 있도록.
-- 패턴: 자식(year_themes) 공개 읽기 = 부모(portfolio).is_public EXISTS (CLAUDE.md §5).
-- 멱등: 정책 drop if exists 후 재생성. 기존 소유자 정책(auth.uid()=user_id)은 그대로 유지.

alter table public.year_themes enable row level security;

drop policy if exists "year_themes public read (public portfolio)" on public.year_themes;
create policy "year_themes public read (public portfolio)"
  on public.year_themes
  for select
  using (
    exists (
      select 1
      from public.portfolio pf
      where pf.user_id = year_themes.user_id
        and pf.is_public = true
    )
  );
