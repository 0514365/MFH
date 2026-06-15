# MFH 핸드오프 v2bk (세션 종료)

> 이전: `v2bj`(맥 잠자기 알림 타이밍 수정). 이번 세션: **UI·기능 4건** — 하단 탭바 5버튼 재설계 · 헤더 정리 · 할 일·프로젝트 첨부파일 · 입력 폼 와이드 레이아웃. 4커밋 모두 main push 완료. patch94 SQL 은 우진이 콘솔 실행 완료.

---

## 현재 위치 (한 줄)

**네비게이션·입력 UX 개선 + 첨부파일 기능 추가 완료.** 4개 커밋 배포(`f8e0016`→`f3f039d`). 첨부는 patch94(컬럼+버킷+RLS) 실행 완료로 동작 상태. 실기기 확인 대기.

## 이번 세션 작업 (커밋 순)

### 1. 하단 탭바 5버튼 재설계 — `BottomNav` V2 (`f8e0016`)
- 구성: `[Insights] [Log] [🏠 홈(중앙·돌출 FAB)] [Projects] [To-Do]`. Portfolio 는 탭바 제외(홈 타일·헤더로 접근).
- 중앙 홈 = 마룬 원형(`bg-primary`)이 탭바 위로 돌출(`-translate-y-5`) + 흰 집 아이콘, 라벨 없음. 현재 홈이면 `ring-primary-soft` 강조.
- Insights 정상 활성 탭 편입(옛 "5탭+미개발 흐림" 주석 제거).

### 2. 상단 헤더 정리 — `PageHeader` V3 (`0266b0a`)
- 헤더 우측의 **Insights·Photos 바로가기 삭제**(하단 탭바·홈 타일로 이동). Calendar 아이콘·action·로그아웃만 유지.
- `current` 타입의 `'insights'|'photos'` 는 호출부(`/insights`,`/photos` page) 식별용으로 보존(무해, 렌더만 제거).

### 3. 할 일·프로젝트 첨부파일 (이미지·PDF) (`b6a76e7`)
- 저장: `tasks`·`projects` 에 `attachments` jsonb 배열(요소 `{path,name,mime,size}`). journal `photos` 패턴 복제(`lib/types.ts` 에 `Attachment` 타입·`MAX_ATTACHMENTS=10`).
- Storage: 비공개 `attachments` 버킷 + journal-photos(patch87) 와 동일 RLS — 멤버 읽기(signed URL)=`is_member`, 본인 폴더(`{userId}/`) 만 쓰기·삭제. **`supabase/patch94-task-project-attachments.sql` 콘솔 실행 완료.**
- 업로드: `components/AttachmentUpload.tsx`(client, 다중·최대 10개·파일당 20MB, 이미지+PDF). `ProjectForm`·`TaskForm` 카드1 에 "첨부파일(Files)" 필드. userId 는 마운트 시 `auth.getUser()` 로 채움(본인 폴더 정책). **반복 할 일은 모든 회차에 동일 첨부**(buildBase 공통).
- 미리보기: `components/AttachmentList.tsx`(서버). 이미지=썸네일 그리드(탭→원본 새 탭), PDF=인라인 `<iframe>` + "새 탭 ↗", 기타=파일 링크. `tasks/[id]`·`projects/[id]` 에서 `createSignedUrls(paths, 3600)` 후 섹션 렌더.

### 4. 입력 폼 와이드 레이아웃 (`f3f039d`)
- `ProjectForm`·`TaskForm`: `≥md`(아이패드·데스크탑)에서 컨테이너 `max-w-5xl` + 두 카드(내용 / 속성·일정) 좌우 2컬럼(`md:grid md:grid-cols-2 md:items-start md:gap-6`, 카드1 `md:mb-0`). 헤더·저장 버튼·작성자는 전체폭 유지. **모바일 무영향.**

## 남은 확인 (우진 · 실기기)
1. **첨부**: 새/편집 폼에서 이미지·PDF 첨부 → 저장 → 상세에서 썸네일·PDF 미리보기. iOS 사파리는 PDF 인라인이 비면 "새 탭 ↗" fallback. 다른 멤버(서진아) 로그인 시 첨부 보이는지(멤버 읽기 정책).
2. **탭바**: 중앙 홈 돌출이 safe-area 하단에서 잘리지 않는지, 각 모듈에서 해당 탭 활성색(마룬).
3. **와이드 레이아웃**: 아이패드·데스크탑에서 두 폼 2컬럼 펼침.
4. (v2bj 이월) **06/15 06:00 QT 알림** 수동 기상 없이 정상 수신(맥 새벽 caffeinate 07:10 연장 적용분), Vercel → Crons 등록 확인, 부부 폰 푸시 구독(push_subscriptions).

## 백로그
1. 선교편지 실제 발송 호 제작.
2. 인사이트 상세 디자인 리프레시(`LensDetail`·`InsightCard`).
3. 온두라스 동향·사진·캘린더·중보기도 화면 리프레시.
4. (보류) 포트폴리오 공개 페이지(`/p/[slug]`).
5. (신규 여지) 첨부 기능을 일지·인사이트 등 타 모듈로 확장 / 입력 폼 와이드 레이아웃을 `JournalForm` 에도 적용.

## 미커밋 (이번 세션 무관 · 우진 판단 대기)
- `.gitignore` 에 `.env*` 추가 — 합리적 보안 변경이나 세션 무관이라 스테이징 안 함.
- `flyers/` (untracked) — 내용 미확인이라 손대지 않음.

*작성: 2026-06-14 세션 종료. repo 변경: 이 핸드오프 추가 + v2bj → `docs/archive/`. 코드 4커밋(`f8e0016`·`0266b0a`·`b6a76e7`·`f3f039d`) 모두 main push 완료. patch94 SQL 콘솔 실행 완료. 직전 v2bj → archive.*
