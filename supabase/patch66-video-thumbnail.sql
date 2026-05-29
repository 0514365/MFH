-- MFH patch66 — 사역 영상 커스텀 썸네일
-- Supabase SQL Editor 에서 한 번 실행.
-- 재생목록·Facebook 등 YouTube 썸네일이 없는 영상에 별도 썸네일 이미지를 지정한다.
-- 이미지는 기존 portfolio-photos 버킷에 업로드(편집 화면), 그 공개 URL 을 저장.
-- RLS 변경 불필요(동일 row, 기존 portfolio_videos 정책 적용).

alter table public.portfolio_videos
  add column if not exists thumbnail_url text;
