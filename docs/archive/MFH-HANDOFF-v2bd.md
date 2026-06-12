# MFH 핸드오프 v2bd (세션 종료)

> 이전: `v2bc`(인사이트 본문 마크다운 표시 포매터). 이번 세션: **멤버 권한·필터 2종** — ① 김우진 마스터 편집 권한 ② 작성자 필터(일지·프로젝트·할일). **6 commit 모두 push 완료, patch91 콘솔 실행 완료(우진).**

---

## 현재 위치 (한 줄)

**마스터 편집 권한 + 작성자 필터 완성·배포.** 두 기능 모두 실기기 확인 완료. 다음 세션은 잔여 백로그(인사이트 미세조정 등) 자유 선택.

---

## 이번 세션 작업 (6 commit)

### ① 김우진 마스터 편집 권한 (`fee3613`)
서진아가 작성한 일지·프로젝트·할일을 김우진이 **수정·삭제** 가능하게. (D1-B: 삭제 포함, D2: RLS 5테이블)

| 레이어 | 변경 |
|--------|------|
| 앱 | `lib/members.ts`에 `isMaster()`·`canEditEntry(ownerId, viewerId)` 추가. 편집·삭제 게이트 6곳(`journal`·`projects`·`tasks` 각 List+상세)을 `user_id === currentUserId` → `canEditEntry(...)` 로 교체. 상세의 삭제 버튼도 같은 게이트라 수정+삭제 동시에 열림 |
| DB | `supabase/patch91-master-edit.sql` 신규 — `app_members.is_master` 컬럼 + `is_master()` SECURITY DEFINER 함수(김우진=true). 5테이블(`journal_entries`·`projects`·`tasks`·`insights`·`year_themes`) **UPDATE/DELETE** 정책을 `본인 OR 마스터`로 교체. SELECT/INSERT(patch73)는 보존. **우진 콘솔 실행 완료.** |

### ② 작성자 필터 — 일지·프로젝트·할일 (`bf6ac35`·`6da8d2b`·`d5ce57b`)
멤버 공유 목록을 작성자별로 거르는 칩 필터(기존 "분류" 칩과 동일한 다중선택 토글, 라벨 "작성자").

| 단계 | commit | 내용 |
|------|--------|------|
| 일지 | `bf6ac35` | `lib/journalFilter.ts`에 `fAuthor` 축(`author=` 쿼리). `JournalList`에 "작성자" 칩 그룹(분류 위). `journal/[id]` nav select에 `user_id` 추가 |
| 프로젝트·할일 | `6da8d2b` | `projectFilter`·`taskFilter`에 `fAuthor`. 두 List에 칩 그룹. 두 상세 nav select에 `user_id`. 할일은 세션영속(`currentFilter`)에도 함께 저장 |
| 수정 | `d5ce57b` | **칩 안 보임 버그 수정** — `authorOpts`를 데이터기반→**membersMap(멤버 전원) 기반**으로 3모듈 통일. 프로젝트·할일에 서진아 글이 없어 작성자 1명→칩 숨김 되던 문제 해결. 이제 고정 멤버 2명 항상 노출 |

## 핵심 설계 메모 (다음 세션 참고)

- **마스터 식별 = `PORTFOLIO_OWNER_ID`(김우진) 재사용.** 앱은 상수(`isMaster`), DB는 `app_members.is_master` 컬럼+`is_master()` 함수. 이중(앱 UI=편의, RLS=강제). 클라이언트는 DB 함수 못 부르니 상수로 판단할 수밖에 없음 — 정상 이중화.
- **`canEditEntry(ownerId, viewerId)` = 본인 또는 마스터.** UI 게이트(버튼 노출) ↔ RLS(실제 권한) 이중 방어. UI만 풀고 patch91 미실행 시 저장 단계에서 RLS 위반.
- **작성자 필터 `fAuthor`**: `author=` CSV 쿼리, `apply*Filter`에서 `user_id` 매칭(옵셔널 가드). `authorOpts`=`Object.entries(membersMap)` 정렬(마스터 먼저) — 고정 멤버라 데이터 무관 항상 표시(분류 칩은 데이터기반과 다른 성격).
- **nav select `user_id` 필수**: 상세 prev/next는 목록과 동일 필터(`applyXFilter`/`orderTaskIds`)를 재적용 → 작성자 필터가 nav에서도 정확하려면 nav 조회에 `user_id` 포함(3 상세 page 반영 완료).
- 검증: 각 단계 타입체크·프로덕션 빌드 통과. 실기기 확인(우진) 완료.

## 다음 세션 백로그 (v2bc 이월 + 신규)

1. **(v2bc 이월, 옵션)** 인사이트 카드 칩 색·간격·소제목 강조 등 실기기 시각 미세조정.
2. **(v2ba 이월)** 스케줄 `honduras-news-0600` 첫 "Run now" 확인(우진, 사이드바 Scheduled).
3. (보류 합의) **C3 baseline SQL** — 실DB 스키마 덤프 1개(우진 콘솔 협조, 별도 세션). 현재 patch61~91 순차 실행 의존.
4. (보류 합의) **C4 postcss moderate 2건** — 빌드타임 devDep, 실위험 낮음.
5. Next 16 (보류) / (옵션) archive 페이지네이션·뉴스 출처 링크화.

## 중단 결정 (재제안 금지 — 메모리 `no-crud-abstraction`)

- DeleteButton·List·BulkPanel 3종 공통화 중단(우진 확정, v2bb 실측 근거).

*작성: 2026-06-11 세션 종료. 6 commit(fee3613·bf6ac35·6da8d2b·d5ce57b 외 권한 게이트) push 완료. patch91 우진 콘솔 실행 완료. 타입체크·빌드·실기기 확인 전부 통과.*
