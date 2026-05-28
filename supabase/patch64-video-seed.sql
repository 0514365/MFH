-- MFH patch64 — 사역 영상 데이터 시드 (Notion "Mission for Honduras" 페이지 기준)
-- Supabase SQL Editor 에서 한 번에 실행.
-- ⚠️ SQL Editor 는 service_role 로 실행되어 auth.uid() 가 NULL 이므로,
--    user_id 는 portfolio(slug='mfh') 에서 가져온다.
-- 멱등: 해당 사용자의 기존 영상/카테고리를 모두 지우고 새로 채운다(재실행 안전).
-- 참고: 재생목록(playlist)·Facebook 링크는 썸네일이 placeholder 로 표시되지만
--       클릭 시 원본으로 정상 이동한다. YouTube live/watch/youtu.be 는 썸네일 자동.

do $$
declare
  uid uuid;
begin
  select user_id into uid from public.portfolio where slug = 'mfh' limit 1;
  if uid is null then
    raise exception 'portfolio(slug=mfh) 를 찾을 수 없습니다. slug 확인 필요.';
  end if;

  -- 1) 기존 데이터 비우기 (해당 사용자)
  delete from public.portfolio_videos where user_id = uid;
  delete from public.portfolio_video_categories where user_id = uid;

  -- 2) 카테고리 6개
  insert into public.portfolio_video_categories (user_id, name, sort_order)
  values
    (uid, '프로젝트 선교', 1),
    (uid, '어린이 예배 사역 (Las Brisas, Rio Blanco)', 2),
    (uid, 'OJC 유치원 사역 (2017~2018)', 3),
    (uid, 'Iglesia de Mejor Pacto (Zapotal 교회)', 4),
    (uid, 'Zapotal 방과 후 학교', 5),
    (uid, 'Spanish 찬양 소개', 6);

  -- 3) 영상 14개 (category_id 는 카테고리 name 으로 매핑)
  insert into public.portfolio_videos (user_id, category_id, title, youtube_url, year, sort_order)
  select c.user_id, c.id, v.title, v.youtube_url, v.year, v.sort_order
  from (values
    -- 프로젝트 선교
    ('프로젝트 선교'::text, '2017년 10월 수해-긴급 구호 활동'::text, 'https://youtu.be/eAeQCMAIVk4'::text, 2017::int, 1::int),
    ('프로젝트 선교', '2020년 4월 Covid-긴급구호활동 1차', 'https://youtu.be/4l7jLQnkxVk', 2020, 2),
    ('프로젝트 선교', '2020년 5월 Covid-긴급구호활동 2차', 'https://www.facebook.com/groups/forhonduras/permalink/3155920307794085/', 2020, 3),
    ('프로젝트 선교', '2020년 12월 태풍 ETA·IOTA-긴급구호활동', 'https://youtu.be/-wvzFwYzAow', 2020, 4),
    -- 어린이 예배 사역
    ('어린이 예배 사역 (Las Brisas, Rio Blanco)', '2016년 Las Brisas', 'https://youtu.be/XzYySccFyD8', 2016, 1),
    ('어린이 예배 사역 (Las Brisas, Rio Blanco)', '2017년 Rio Blanco', 'https://youtu.be/2c19FB22gVk', 2017, 2),
    ('어린이 예배 사역 (Las Brisas, Rio Blanco)', '2018년 Rio Blanco', 'https://youtu.be/Lkz0BCLdUQ8', 2018, 3),
    -- OJC 유치원 사역
    ('OJC 유치원 사역 (2017~2018)', '입학식~졸업식 (재생목록)', 'https://youtube.com/playlist?list=PLCCl5m413iydR4LUTqi2NcAfCpSwX7K5a', NULL::int, 1),
    -- Iglesia de Mejor Pacto (Zapotal 교회)
    ('Iglesia de Mejor Pacto (Zapotal 교회)', 'Zapotal Worship Live (주일예배 영상, 재생목록)', 'https://youtube.com/playlist?list=PLCCl5m413iyf_j_JG0YQl0np80V7hVk-g', NULL, 1),
    ('Iglesia de Mejor Pacto (Zapotal 교회)', 'Iglesia de Mejor Pacto (Zapotal 교회) 1주년', 'https://youtu.be/n1N4oWek41c', NULL, 2),
    -- Zapotal 방과 후 학교
    ('Zapotal 방과 후 학교', '2022년 영어학교 발표회', 'https://www.youtube.com/live/msQ9TBrbkaM', 2022, 1),
    ('Zapotal 방과 후 학교', '2023년 개강', 'https://www.facebook.com/permalink.php?story_fbid=pfbid0kex3hAGbMDB9EQeuwgTt3uecfkJFsByaaAp9fVhP83BXGMqf5KCZKzc3paRWGtVLl&id=100001751586931', 2023, 2),
    -- Spanish 찬양 소개
    ('Spanish 찬양 소개', 'Spanish 찬양 (재생목록)', 'https://youtube.com/playlist?list=PLCCl5m413iyc6EQtSfKGqNNudxb_cPWDH', NULL, 1)
  ) as v(cat_name, title, youtube_url, year, sort_order)
  join public.portfolio_video_categories c
    on c.name = v.cat_name and c.user_id = uid;
end $$;
