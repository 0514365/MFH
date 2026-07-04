-- MFH patch101: 후원자·회계 접근을 부부 2인(멤버)으로 확대 — patch100(마스터 전용) 해제.
--
-- 배경: 서진아 계정도 후원자관리·회계관리 메뉴를 쓰기로 결정.
--       앱(UI) 게이트는 canManageFinance(우진+서진아)로 교체 완료(lib/members.ts).
--       DB 차원에서도 supporters 계열 읽기·수정·삭제를 멤버(is_member)로 확대한다.
--       (회계는 노션 SoT + server action 이라 DB 변경 없음. INSERT 정책은
--        '본인 user_id + 멤버' 그대로 유지 — patch97과 동일.)
-- 조치:
--   1) supporters / supporter_donations / supporter_logs 의
--      SELECT → is_member (patch100 의 master read 교체 = 공개 복원 블록과 동일)
--      UPDATE/DELETE → is_member (기존 '본인 or 마스터' → 멤버 전체.
--        후원자 데이터가 전부 우진 소유라, 서진아 수정·삭제 허용에 필요)
--   2) supporter-photos 스토리지 UPDATE/DELETE → 멤버 확대
--      (서진아가 우진이 올린 후원자 사진을 교체·정리할 수 있도록.
--       INSERT 는 '본인 폴더에만 업로드' 규칙 유지)
-- 멱등: drop if exists 후 create. 반복 실행 안전.

begin;

do $$
declare
  tb text;
  tbls text[] := array['supporters', 'supporter_donations', 'supporter_logs'];
  r record;
begin
  foreach tb in array tbls loop
    -- 기존 SELECT/UPDATE/DELETE 정책 전부 제거(이름 변천 무관하게 cmd 기준)
    for r in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = tb
        and cmd in ('SELECT', 'UPDATE', 'DELETE')
    loop
      execute format('drop policy if exists %I on public.%I', r.policyname, tb);
    end loop;

    execute format(
      'create policy %I on public.%I for select using (public.is_member(auth.uid()))',
      tb || ' member read', tb);

    execute format(
      'create policy %I on public.%I for update '
      || 'using (public.is_member(auth.uid())) '
      || 'with check (public.is_member(auth.uid()))',
      tb || ' member update', tb);

    execute format(
      'create policy %I on public.%I for delete using (public.is_member(auth.uid()))',
      tb || ' member delete', tb);
  end loop;
end $$;

-- 스토리지: 후원자 사진 수정·삭제를 멤버로 확대 (읽기는 이미 member, 업로드는 본인 폴더 유지)
drop policy if exists "supporter_photos owner update" on storage.objects;
drop policy if exists "supporter_photos member update" on storage.objects;
drop policy if exists "supporter_photos owner delete" on storage.objects;
drop policy if exists "supporter_photos member delete" on storage.objects;

create policy "supporter_photos member update"
  on storage.objects for update
  using (bucket_id = 'supporter-photos' and public.is_member(auth.uid()))
  with check (bucket_id = 'supporter-photos' and public.is_member(auth.uid()));

create policy "supporter_photos member delete"
  on storage.objects for delete
  using (bucket_id = 'supporter-photos' and public.is_member(auth.uid()));

commit;

-- ─────────────────────────────────────────────
-- 되돌리기 (마스터 전용으로 복귀 시에만 실행)
-- ─────────────────────────────────────────────
-- begin;
-- do $$
-- declare
--   tb text;
--   tbls text[] := array['supporters', 'supporter_donations', 'supporter_logs'];
--   r record;
-- begin
--   foreach tb in array tbls loop
--     for r in
--       select policyname from pg_policies
--       where schemaname = 'public' and tablename = tb
--         and cmd in ('SELECT', 'UPDATE', 'DELETE')
--     loop
--       execute format('drop policy if exists %I on public.%I', r.policyname, tb);
--     end loop;
--     execute format(
--       'create policy %I on public.%I for select using (public.is_master(auth.uid()))',
--       tb || ' master read', tb);
--     execute format(
--       'create policy %I on public.%I for update '
--       || 'using (auth.uid() = user_id or public.is_master(auth.uid())) '
--       || 'with check (auth.uid() = user_id or public.is_master(auth.uid()))',
--       tb || ' owner update', tb);
--     execute format(
--       'create policy %I on public.%I for delete '
--       || 'using (auth.uid() = user_id or public.is_master(auth.uid()))',
--       tb || ' owner delete', tb);
--   end loop;
-- end $$;
-- commit;
