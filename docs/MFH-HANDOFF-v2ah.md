# MFH 핸드오프 v2ah

> 이전 상태: `MFH-HANDOFF-v2ag.md`(Phase 3b — 인사이트 Local 루틴) 참조.
> **이번 세션 주제: Phase 3c — 사진 캡션 증분 생성(비전).**

---

## 현재 위치 (한 줄)

인사이트 개편의 **Phase 3b(인사이트 자동생성)·3c(사진 캡션) 모두 완료·E2E 검증**. 남은 대기 단계는 **Phase 4(비서)·5(뱃지).**

---

## 이번 세션 완료 (Phase 3c)

### 코어 (3c-1)
- **`scripts/caption-pull.ts`** (`MFH-CAPTION-PULL-V1`) — `ai_caption` 없는 일지 사진(부부 공동)을 Storage `journal-photos`에서 내려받아 `insights-archive/_captions/`(이미지+`manifest.json`)에 저장하고, 비전 분석 **작업지시서(stdout)** 출력. 가드레일 내장(실명·아동·식별정보 금지, 장소·활동 중심). `--all` 재생성 옵션.
- **`scripts/caption-push.ts`** (`MFH-CAPTION-PUSH-V1`) — `result.json([{path,caption}])` + `manifest.json`(path→entry_id)으로 `journal_entries.photos` jsonb의 해당 사진에 **`ai_caption` 병합 update**. entry별 최신 photos 재조회 후 매칭 요소만 갱신 → **타 사진·필드 보존**. `id` 기준이라 `MFH_USER_ID` 불필요.

### 가동 (3c-2)
- **`.claude/commands/caption-update.md`** — `/caption-update [--all]` 슬래시 커맨드. pull → (Claude Code 비전: 각 이미지 Read→캡션) → `result.json` Write → push. 스킬 자동등록 확인.
- **E2E 1회 성공**: 캡션 대상 **7장**(jpeg·png) → 비전 캡션 작성 → **6일지·7사진 저장**.

### E2E 검증 (보존·병합 실증)
| 일지 | 사진 | 결과 |
|---|---|---|
| 5/24 | 1장 | ✅ `ai_caption` + place_name(아리랑식당)·taken_at 보존 |
| 6/4 | 2장 | ✅ 한 일지 다중 사진 **각각** 캡션, 빈 필드도 원형 보존 |
- 표시는 Phase 2에서 이미 연결됨(`photos/page.tsx` → `PhotoItem.caption`).

---

## 확정 결정 (재논의 불필요)

| # | 결정 | 값 |
|---|---|---|
| 3c-A | 대상 | `ai_caption` 없는 사진만(증분) + `--all` 재생성 ✅ |
| 3c-B | 이미지 전달 | Storage→로컬 다운로드 + manifest, Claude가 Read(비전) ✅ |
| 3c-C | 저장 | photos jsonb 부분 병합(entry_id 기준, 타 필드 보존) ✅ |
| 3c-D | 트리거 | `/caption-update` 슬래시 + 수동(증분 1회라 매일 루틴 불필요) ✅ |
| 3c-E | 캡션 톤 | 1~2문장 한국어, 장소·활동 중심, 인물·아동 실명/식별 금지 ✅ |

---

## 인사이트 개편 전체 현황

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | 수동/종량제 제거 | ✅ 배포 |
| 2 | 사진 모아보기(/photos) | ✅ 배포 |
| 3a | 저장구조 + 보관함 | ✅ 배포 |
| 3b | 인사이트 Local 루틴(pull/push + insight-update) | ✅ |
| **3c** | **사진 캡션 증분 생성(caption-pull/push + caption-update)** | **✅ 이번** |
| 4 | 비서(project/task 능동 제안) | 대기 |
| 5 | 할 일 뱃지(앱 아이콘) | 대기(분리) |

---

## 우진 액션

- ⏳ 앱 `mfh-snowy.vercel.app/photos`에서 2026-05·2026-06 월의 사진 캡션 표시 확인.
- (선택) 새 사진이 쌓이면 `/caption-update` 수동 실행, 또는 인사이트 Local 루틴과 별도로 가끔.

---

## 스크립트 운영 메모 (3b+3c 공통)

- 모두 **repo 루트에서 실행**(`process.cwd()` 기준 `.env.local`·`insights-archive`).
- `tsx`로 lib(`@/`) 직접 재사용, CJS/ESM 회피 위해 `async main()` 패턴.
- `insights-archive/`는 gitignore — 인사이트 아카이브(jsonl) + 캡션 작업물(_captions: 이미지·manifest·result) 모두 비추적(개인 사역내용·사진).
- 생성은 **구독(Claude Code)만** — 종량제 API 미사용(비용 민감 부합).
- 슬래시 커맨드 2종: `/insight-update`(인사이트, Local 루틴 06·14·21시) · `/caption-update`(캡션, 수동).

---

## 관련 커밋

- `2889964` Phase 3b(insight pull/push + insight-update, 핸드오프 v2ag)
- 이 핸드오프 `v2ah` — Phase 3c(caption pull/push + caption-update) commit 대기

*작성: 2026-06-05 세션 (인사이트 개편 Phase 3c).*
