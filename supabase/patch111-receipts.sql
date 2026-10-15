-- MFH patch111: 영수증 Storage — receipts 버킷(비공개) + 멤버(부부) 읽기·쓰기·삭제
--
-- 배경: 회계 거래 1건에 영수증 사진 1장. 경로 = 'YYYY/MM/<uuid>.<ext>'(거래일 기준) → acct_inout.receipt_path(patch102 에 이미 있음).
--       브라우저가 긴 변 1600px 로 줄여 직접 업로드하고, 보기는 서명 URL(1시간).
--       부부 누구나 상대가 올린 영수증도 교체·삭제할 수 있도록 폴더 소유가 아닌 is_member 로 허용한다.
--       선행: patch73(is_member) · patch102.
-- 멱등. 실행: Supabase 콘솔 SQL Editor.

begin;

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "receipts member read"   on storage.objects;
drop policy if exists "receipts member insert" on storage.objects;
drop policy if exists "receipts member update" on storage.objects;
drop policy if exists "receipts member delete" on storage.objects;

create policy "receipts member read"
  on storage.objects for select
  using (bucket_id = 'receipts' and public.is_member(auth.uid()));

create policy "receipts member insert"
  on storage.objects for insert
  with check (bucket_id = 'receipts' and public.is_member(auth.uid()));

create policy "receipts member update"
  on storage.objects for update
  using (bucket_id = 'receipts' and public.is_member(auth.uid()))
  with check (bucket_id = 'receipts' and public.is_member(auth.uid()));

create policy "receipts member delete"
  on storage.objects for delete
  using (bucket_id = 'receipts' and public.is_member(auth.uid()));

commit;
