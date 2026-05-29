-- MFH patch65 — 사역 영상: 카테고리 이름변경 + 순서 재배치 + Spanish 찬양 19곡 시드
-- Supabase SQL Editor 에서 한 번 실행. (patch64 실행 이후 적용)
-- ⚠️ SQL Editor 는 service_role 로 실행되어 auth.uid() 가 NULL 이므로,
--    user_id 는 portfolio(slug='mfh') 에서 가져온다.
-- 멱등: 재실행해도 안전(이름변경 no-op, 순서 동일, Spanish 곡은 교체).
--
-- 변경 내용
--   1) '프로젝트 선교' → '긴급구호 사역' 이름변경
--   2) 배너/목록 순서 재배치:
--      어린이1 · OJC2 · Zapotal방과후3 · Iglesia4 · 긴급구호5 · Spanish6
--   3) Spanish 찬양 소개 그룹: 기존 영상 비우고 19곡 시드 (MFH-music-playlist.md 기준)

do $$
declare
  uid uuid;
  spanish_id uuid;
begin
  select user_id into uid from public.portfolio where slug = 'mfh' limit 1;
  if uid is null then
    raise exception 'portfolio(slug=mfh) 를 찾을 수 없습니다. slug 확인 필요.';
  end if;

  -- 1) 이름변경: 프로젝트 선교 → 긴급구호 사역
  update public.portfolio_video_categories
     set name = '긴급구호 사역'
   where user_id = uid and name = '프로젝트 선교';

  -- 2) 순서 재배치 (현재 이름 기준)
  update public.portfolio_video_categories set sort_order = 1
   where user_id = uid and name = '어린이 예배 사역 (Las Brisas, Rio Blanco)';
  update public.portfolio_video_categories set sort_order = 2
   where user_id = uid and name = 'OJC 유치원 사역 (2017~2018)';
  update public.portfolio_video_categories set sort_order = 3
   where user_id = uid and name = 'Zapotal 방과 후 학교';
  update public.portfolio_video_categories set sort_order = 4
   where user_id = uid and name = 'Iglesia de Mejor Pacto (Zapotal 교회)';
  update public.portfolio_video_categories set sort_order = 5
   where user_id = uid and name = '긴급구호 사역';
  update public.portfolio_video_categories set sort_order = 6
   where user_id = uid and name = 'Spanish 찬양 소개';

  -- 3) Spanish 찬양 19곡 시드 (기존 영상 교체)
  select id into spanish_id
    from public.portfolio_video_categories
   where user_id = uid and name = 'Spanish 찬양 소개'
   limit 1;

  if spanish_id is not null then
    delete from public.portfolio_videos
     where user_id = uid and category_id = spanish_id;

    insert into public.portfolio_videos (user_id, category_id, title, youtube_url, year, sort_order)
    values
      (uid, spanish_id, 'Hay Momento', 'https://www.youtube.com/watch?v=cRVjVue4xjo', NULL, 1),
      (uid, spanish_id, 'A cada instante de mi vida', 'https://www.youtube.com/watch?v=fPzo51qCrFY', NULL, 2),
      (uid, spanish_id, 'Padre Celestial', 'https://www.youtube.com/watch?v=PHjzX5hkHDg', NULL, 3),
      (uid, spanish_id, 'Padre Celestial / Hay Momentos', 'https://www.youtube.com/watch?v=vzFr6ubLkUA', NULL, 4),
      (uid, spanish_id, 'Ven Espiritu Ven (WJ & JINA)', 'https://www.youtube.com/watch?v=VD2xIYsccsY', NULL, 5),
      (uid, spanish_id, 'Dios está aquí', 'https://www.youtube.com/watch?v=ARuhUvGAFz0', NULL, 6),
      (uid, spanish_id, 'Eres todo Poderoso', 'https://www.youtube.com/watch?v=s8QR2hmZHSo', NULL, 7),
      (uid, spanish_id, 'Yo Quiero Mas de Tí', 'https://www.youtube.com/watch?v=BvMx6jTKAN8', NULL, 8),
      (uid, spanish_id, 'Ven Espíritu Ven (Juan & Dunia)', 'https://www.youtube.com/watch?v=57YRdGa57oA', NULL, 9),
      (uid, spanish_id, 'Quiero levantar mis manos', 'https://www.youtube.com/watch?v=R-rDXa3VfJ0', NULL, 10),
      (uid, spanish_id, 'A Dios sea la gloria', 'https://www.youtube.com/watch?v=TwPOXoqHTvM', NULL, 11),
      (uid, spanish_id, 'Abre Mis Ojos', 'https://www.youtube.com/watch?v=RwxvroWaIZE', NULL, 12),
      (uid, spanish_id, 'Dame de beber', 'https://www.youtube.com/watch?v=uikjItF70pI', NULL, 13),
      (uid, spanish_id, 'Renuevame', 'https://www.youtube.com/watch?v=gTQZnTrX0so', NULL, 14),
      (uid, spanish_id, 'Algo esta Cayendo Aqui', 'https://www.youtube.com/watch?v=W1wbJtV7nts', NULL, 15),
      (uid, spanish_id, 'En Ti', 'https://www.youtube.com/watch?v=QAozT8RxRnA', NULL, 16),
      (uid, spanish_id, 'El me levantara', 'https://www.youtube.com/watch?v=zuAvWnAKM2o', NULL, 17),
      (uid, spanish_id, 'Algo esta cayendo aqui', 'https://www.youtube.com/watch?v=M1jjpfduHeM', NULL, 18),
      (uid, spanish_id, 'Altísimo Milagroso Salvador', 'https://www.youtube.com/watch?v=tYUhhWrvXaE', NULL, 19);
  end if;
end $$;
