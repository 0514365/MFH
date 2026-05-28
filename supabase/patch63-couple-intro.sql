-- MFH patch63: 부부사진 + 부부 소개 개요
-- 선교사 소개 접이식(MissionaryAccordion)의 "접힘 상태" 표시에 사용.
-- couple_photo_url: 부부 함께 찍은 사진 1장 (portfolio-photos 버킷)
-- couple_intro: 접힘 상태에 노출할 짧은 부부 소개 개요
-- 멱등: 이미 컬럼이 있으면 통과. RLS 변경 불필요(동일 row, 기존 정책 적용).
alter table portfolio add column if not exists couple_photo_url text;
alter table portfolio add column if not exists couple_intro text;
