-- patch80-video-category-order.sql
-- MFH: 공개 페이지 "사역 영상" 카테고리(사역) 배너 표시 순서 재설정 (우진 요청).
-- 공개 페이지는 portfolio_video_categories.sort_order 오름차순으로 그룹을 노출한다.
-- 이름의 괄호·띄어쓰기 차이를 흡수하려 부분일치(ILIKE)로 매칭. 멱등(여러 번 실행해도 동일).
-- 소유자(김우진) user_id 한정.
-- [적용 이력] 2026-06-02 DB 직접 PATCH(id 기준)로 적용 완료. 이 파일은 이름 기반 재현·기록용.

-- (실행 전/후 확인용) 현재 순서 보기:
-- select name, sort_order from portfolio_video_categories
--   where user_id = '6920f3d8-d132-4859-a73f-12b6ce2210c8'
--   order by sort_order;

update portfolio_video_categories set sort_order = 10
  where user_id = '6920f3d8-d132-4859-a73f-12b6ce2210c8' and name ilike '%사역소개%';

update portfolio_video_categories set sort_order = 20
  where user_id = '6920f3d8-d132-4859-a73f-12b6ce2210c8' and name ilike '%Worship Live%';

update portfolio_video_categories set sort_order = 30
  where user_id = '6920f3d8-d132-4859-a73f-12b6ce2210c8' and name ilike '%어린이%';

update portfolio_video_categories set sort_order = 40
  where user_id = '6920f3d8-d132-4859-a73f-12b6ce2210c8' and name ilike '%유치원%';

update portfolio_video_categories set sort_order = 50
  where user_id = '6920f3d8-d132-4859-a73f-12b6ce2210c8' and name ilike '%Mejor Pacto%';

update portfolio_video_categories set sort_order = 60
  where user_id = '6920f3d8-d132-4859-a73f-12b6ce2210c8' and name ilike '%방과%';

update portfolio_video_categories set sort_order = 70
  where user_id = '6920f3d8-d132-4859-a73f-12b6ce2210c8' and name ilike '%긴급구호%';

update portfolio_video_categories set sort_order = 80
  where user_id = '6920f3d8-d132-4859-a73f-12b6ce2210c8' and name ilike '%Spanish%';

-- 적용 후 다시 위 select 로 순서 확인. 공개 페이지 새로고침하면 반영됨.
