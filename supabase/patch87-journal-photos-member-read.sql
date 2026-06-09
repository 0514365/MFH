-- MFH patch87: journal-photos Storage 멤버 공유 읽기
--
-- 배경: patch73 으로 journal_entries(DB)는 멤버 공유 읽기(is_member)가 됐지만,
--       journal-photos Storage 버킷은 본인 폴더({userId}/) 기준 정책 그대로였다(patch82 주석 참고).
--       → 다른 멤버가 올린 사진의 signed URL 을 생성하지 못해, 서진아 로그인 시 사진이 안 보였다.
--       (현재 사진 20장이 전부 김우진 폴더에 있어, 서진아 화면엔 사진이 하나도 안 떴다.)
-- 해결: journal-photos 에 "멤버 읽기(SELECT)" 정책 부여 → 멤버는 서로의 사진 signed URL 생성 가능.
--       쓰기/수정/삭제는 본인 폴더({userId}/...)만 유지 → 남의 사진 변조 방지.
--       portfolio-letters(patch62)와 동일한 폴더=userId 패턴.
--
-- 전제: patch73 의 public.is_member(uuid) 함수가 이미 존재해야 한다(운영 중이므로 적용 완료 상태).
-- 실행: Supabase 콘솔 SQL Editor 에 붙여넣고 실행. 멱등 — 재실행해도 안전.

begin;

-- 1) journal-photos 관련 기존 정책 모두 제거(이름 무관 — 동적). 다른 버킷 정책은 건드리지 않는다.
do $$
declare
  r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') like '%journal-photos%'
           or coalesce(with_check, '') like '%journal-photos%')
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

-- 안전벨트: 이 패치가 만드는 이름도 명시적으로 제거(재실행 멱등 보장).
drop policy if exists "journal_photos member read"  on storage.objects;
drop policy if exists "journal_photos owner insert"  on storage.objects;
drop policy if exists "journal_photos owner update"  on storage.objects;
drop policy if exists "journal_photos owner delete"  on storage.objects;

-- 2) 멤버는 journal-photos 의 모든 사진을 읽기(=signed URL 생성) 가능. 비멤버/익명은 차단.
create policy "journal_photos member read"
  on storage.objects for select
  using (
    bucket_id = 'journal-photos'
    and public.is_member(auth.uid())
  );

-- 3) 업로드/수정/삭제는 본인 폴더({userId}/...)만.
create policy "journal_photos owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'journal-photos'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "journal_photos owner update"
  on storage.objects for update
  using (
    bucket_id = 'journal-photos'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  )
  with check (
    bucket_id = 'journal-photos'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "journal_photos owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'journal-photos'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );

commit;
