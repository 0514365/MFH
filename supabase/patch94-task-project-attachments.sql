-- MFH patch94: 할 일·프로젝트 첨부파일 (이미지·PDF)
--
-- tasks·projects 에 attachments jsonb 배열 추가. 각 요소: { path, name, mime, size }.
-- Storage: 비공개 'attachments' 버킷 + journal-photos(patch87) 와 동일 RLS
--   · 멤버 읽기(=signed URL 생성) : public.is_member(auth.uid())  ← patch73 의존
--   · 쓰기/수정/삭제는 본인 폴더({userId}/...)만               ← 남의 첨부 변조 방지
-- 멱등: add column if not exists · 버킷 on conflict do nothing · 정책 drop if exists 후 create.
-- 실행: Supabase 콘솔 SQL Editor 에 붙여넣고 실행. 재실행해도 안전.

begin;

-- 1) 컬럼
alter table public.tasks    add column if not exists attachments jsonb;
alter table public.projects add column if not exists attachments jsonb;

-- 2) 비공개 버킷
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- 3) Storage 정책 (journal-photos 패턴 복제)
drop policy if exists "attachments member read"  on storage.objects;
drop policy if exists "attachments owner insert"  on storage.objects;
drop policy if exists "attachments owner update"  on storage.objects;
drop policy if exists "attachments owner delete"  on storage.objects;

-- 멤버는 모든 첨부를 읽기(signed URL 생성) 가능. 비멤버/익명은 차단.
create policy "attachments member read"
  on storage.objects for select
  using (
    bucket_id = 'attachments'
    and public.is_member(auth.uid())
  );

-- 업로드/수정/삭제는 본인 폴더({userId}/...)만.
create policy "attachments owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "attachments owner update"
  on storage.objects for update
  using (
    bucket_id = 'attachments'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  )
  with check (
    bucket_id = 'attachments'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "attachments owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );

commit;
