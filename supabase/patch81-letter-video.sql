-- patch81-letter-video.sql
-- MFH: 선교편지에 "영상 편지"(PDF 없이 YouTube 영상만) 지원.
-- letters.video_url 추가 + pdf_path NULL 허용(영상 편지는 PDF 없음). 멱등.
-- 공개 페이지 선교편지 목록에 YouTube 썸네일 표지로 노출, 클릭 시 영상으로 이동.

alter table letters add column if not exists video_url text;

-- PDF 또는 영상 중 하나만 있어도 되도록 pdf_path 의 NOT NULL 제약 해제.
-- (이미 nullable 이면 no-op — 멱등)
alter table letters alter column pdf_path drop not null;
