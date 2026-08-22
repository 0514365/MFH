-- MFH patch102: 일지 비공개(is_private)·비밀글(is_secret)
--
-- 기능:
--   · 비공개(is_private): 모든 계정에서 체크 가능. 선교편지·페이스북 추천 수집에서 제외(앱 스크립트 필터).
--     멤버 간 읽기는 그대로 공유 — 앱 화면에는 🔒 비공개 배지만 표시.
--   · 비밀글(is_secret): 마스터(김우진)만 설정 가능. 마스터·작성자 외 다른 계정에서는 SELECT 자체가 차단.
--     편지·페이스북은 물론 공유 AI 산출물(인사이트·QT·캡션) 수집에서도 제외(앱 스크립트 필터).
--
-- ★ 선행조건: patch73(is_member)·patch91(is_master) 적용 완료 상태.
-- ★ 적용 순서: 이 SQL 을 먼저 실행한 뒤 앱을 배포해야 한다(앱이 새 컬럼을 저장·필터에 사용).
-- 멱등: add column if not exists · 정책 drop if exists 후 create. 트랜잭션으로 원자 적용.

begin;

-- ─────────────────────────────────────────────
-- 1) 컬럼 추가 — 기존 행은 모두 false 로 백필
-- ─────────────────────────────────────────────
alter table public.journal_entries
  add column if not exists is_private boolean not null default false;
alter table public.journal_entries
  add column if not exists is_secret boolean not null default false;

-- ─────────────────────────────────────────────
-- 2) SELECT — 멤버 읽기 유지 + 비밀글은 작성자·마스터만
--    (patch73 의 "journal_entries member read" 교체)
-- ─────────────────────────────────────────────
drop policy if exists "journal_entries member read" on public.journal_entries;
drop policy if exists "journal_entries member read (secret gated)" on public.journal_entries;
create policy "journal_entries member read (secret gated)"
  on public.journal_entries for select
  using (
    public.is_member(auth.uid())
    and (not is_secret or auth.uid() = user_id or public.is_master(auth.uid()))
  );

-- ─────────────────────────────────────────────
-- 3) INSERT — 본인+멤버 유지 + 비밀글 설정은 마스터만
--    (patch73 의 "journal_entries owner insert" 교체)
-- ─────────────────────────────────────────────
drop policy if exists "journal_entries owner insert" on public.journal_entries;
create policy "journal_entries owner insert"
  on public.journal_entries for insert
  with check (
    auth.uid() = user_id
    and public.is_member(auth.uid())
    and (not is_secret or public.is_master(auth.uid()))
  );

-- ─────────────────────────────────────────────
-- 4) UPDATE — 본인 또는 마스터(patch91) 유지 + 비밀글 지정은 마스터만
--    (patch91 의 "journal_entries owner or master update" 교체.
--     DELETE 정책은 patch91 그대로 — 건드리지 않음.)
-- ─────────────────────────────────────────────
drop policy if exists "journal_entries owner or master update" on public.journal_entries;
create policy "journal_entries owner or master update"
  on public.journal_entries for update
  using (auth.uid() = user_id or public.is_master(auth.uid()))
  with check (
    (auth.uid() = user_id or public.is_master(auth.uid()))
    and (not is_secret or public.is_master(auth.uid()))
  );

commit;
