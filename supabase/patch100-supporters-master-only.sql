-- MFH patch100: 후원자 메뉴 비공개 — supporters 계열 읽기를 마스터(우진)만.
--
-- 배경: 후원자 모듈을 공개 전까지 우진 계정에서만 보이게 한다. 앱(UI)에서도 막지만,
--       데이터 차원에서도 멤버(서진아) 읽기를 차단한다(헌금·연락처 등 민감정보).
-- 조치: supporters / supporter_donations / supporter_logs 의 SELECT 정책을
--       'member read'(is_member) → 'master read'(is_master)로 교체.
--       INSERT/UPDATE/DELETE(본인·마스터)는 그대로 둔다(어차피 우진만 입력).
-- 멱등: drop if exists 후 create. 반복 실행 안전.
--
-- ★ 공개(전체 멤버 열람) 전환 시: 이 파일 맨 아래 "공개 복원" 블록을 실행한다.

begin;

do $$
declare
  tb text;
  tbls text[] := array['supporters', 'supporter_donations', 'supporter_logs'];
begin
  foreach tb in array tbls loop
    execute format('drop policy if exists %I on public.%I', tb || ' member read', tb);
    execute format('drop policy if exists %I on public.%I', tb || ' master read', tb);
    execute format(
      'create policy %I on public.%I for select using (public.is_master(auth.uid()))',
      tb || ' master read', tb);
  end loop;
end $$;

commit;

-- ─────────────────────────────────────────────
-- 공개 복원 (추후 전체 멤버 공개 시에만 실행)
-- ─────────────────────────────────────────────
-- begin;
-- do $$
-- declare
--   tb text;
--   tbls text[] := array['supporters', 'supporter_donations', 'supporter_logs'];
-- begin
--   foreach tb in array tbls loop
--     execute format('drop policy if exists %I on public.%I', tb || ' master read', tb);
--     execute format('drop policy if exists %I on public.%I', tb || ' member read', tb);
--     execute format(
--       'create policy %I on public.%I for select using (public.is_member(auth.uid()))',
--       tb || ' member read', tb);
--   end loop;
-- end $$;
-- commit;
