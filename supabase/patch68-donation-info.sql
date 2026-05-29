-- MFH patch68: 후원 안내(우리은행 계좌 등)
-- 공개 포트폴리오 푸터의 "후원방법" 블록에 표시. 줄바꿈 보존(여러 줄 입력 가능).
-- 멱등: 컬럼 없을 때만 추가. RLS 변경 불필요(portfolio 동일 row, 기존 정책 적용).

alter table public.portfolio add column if not exists donation_info text;
