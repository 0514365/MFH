# MFH 핸드오프 v2bn (세션 종료)

> 이전: `v2bm`(동산교회 단기선교 의료봉사 전단). 이번 세션: **할 일·프로젝트 첨부 이미지(PDF 제외)를 사진모음·AI캡션·편지·인사이트 전 구간에 통합**(Step A/B/C). 앱 코드 + 스크립트 변경, **DB 마이그레이션 없음**(jsonb 요소에 캡션 필드만 추가).

---

## 현재 위치 (한 줄)

할 일·프로젝트에 첨부한 **이미지**(PDF 제외)가 사진모음 표시·라이트박스 캡션 편집·`/caption-update` AI캡션·선교편지 재료·인사이트 분석에 모두 연계됨(검증·배포 완료). 다음은 (이월) 선교편지 실제 발송 호.

---

## 이번 세션 작업 — 첨부 이미지 통합 (Step A/B/C)

배경: 첨부는 `tasks/projects.attachments` jsonb(`{path,name,mime,size}`) + 비공개 `attachments` 버킷(patch94). 일지 사진(`journal_entries.photos` + `journal-photos` 버킷)과 **별개**였고 사진모음·캡션·편지에 안 들어왔다. 이번에 이미지만(PDF 제외) 통합.

### Step A — 사진모음 표시 + 캡션 편집 (앱) · 커밋 `d7dabd6`
| 파일 | 변경 |
|---|---|
| `lib/types.ts` | `Attachment` 에 `caption?`·`ai_caption?` (jsonb 요소 — **마이그레이션 불필요**) |
| `lib/attachments.ts` (신규) | `isImageAttachment`(PDF·기타 제외)·`taskAttachmentDate`·`projectAttachmentDate` 공통 헬퍼 |
| `app/photos/page.tsx` | tasks·projects 첨부 이미지 조회 → `attachments` 버킷 signed URL → 사진모음 합류. `PhotoItem` 에 `source`/`rowId`/`sourceTitle` |
| `app/photos/PhotoGalleryClient.tsx` | 썸네일 출처 배지(`할 일`/`프로젝트`), 캡션 저장 출처별 분기(`SOURCE_CFG`: journal=photos / task·project=attachments) |

- **월 귀속**(첨부엔 촬영일 없음): task=`마감→완료→생성` / project=`마감→시작→생성`.
- **권한**: `canEditEntry`(본인+마스터). tasks/projects update RLS 도 본인+`is_master`(patch91)라 일치.

### Step B — AI 캡션 루틴 확장 · 커밋 `4c42bae`
| 파일 | 변경 |
|---|---|
| `scripts/caption-pull.ts` (V3) | 일지+할일+프로젝트 **출처별** 수집(첨부는 `isImageAttachment` 만). manifest 에 `source`/`row_id`/`bucket` |
| `scripts/caption-push.ts` (V2) | `SRC` 맵으로 출처별 테이블·컬럼에 `ai_caption` 병합(journal→photos / task·project→attachments) |
| `.claude/commands/caption-update.md` | 대상·저장처에 할일·프로젝트 반영 |

`/caption-update` 한 번으로 일지+할일+프로젝트 사진 캡션을 함께 생성. 수동 `caption` 항상 보호, PDF 제외.

### Step C — 편지·인사이트 활용 · 커밋 `ebc8081`
| 파일 | 변경 |
|---|---|
| `scripts/fetch-letter-materials.mjs` (V6) | 첨부 이미지(+캡션)를 "할 일·프로젝트 첨부 사진" 섹션으로 수집. **`.mjs` 라 헬퍼 인라인 복제** |
| `scripts/insight-pull.ts` (V2) | "사진 기록(캡션)" 섹션(일지+첨부 캡션) — 텍스트 인사이트에 시각 맥락 보탬 |

## 핵심 메모 (다음 세션)
- **DB 변경 없음** — patch94 의 `attachments` 버킷·`tasks/projects.attachments` 컬럼 그대로. 캡션은 jsonb 요소의 `caption`(수동)/`ai_caption`(AI)에 저장.
- **PDF 전 구간 제외** — `isImageAttachment`(mime≠pdf + 이미지 확장자). `lib/attachments.ts` 가 기준, `fetch-letter-materials.mjs` 만 동일 로직 인라인 복제(ts import 불가).
- **월 귀속 기준**도 `lib/attachments.ts` 가 단일 출처(mjs는 인라인). 사진이 "안 보이면" 그 항목 날짜가 다른 달일 수 있음.
- 검증: 타입체크·빌드 통과 / `caption-pull` 할일 첨부 집계·manifest 출처 정확 / `fetch-letter` 첨부 3장·섹션 / `insight-pull` 캡션 섹션. 실기기·자연 검증 완료(우진).

## 백로그 (v2bm 이월)
1. **`news-update.md` 19행 `url` 안내** — 에이전트 커맨드 설정 자동 차단으로 미적용(기능 무관 — `news-pull.ts`엔 반영). 우진 직접 수정 또는 권한 허용 필요.
2. **선교편지 실제 발송 호** 제작 · 인사이트 상세 리프레시(`LensDetail`·`InsightCard`) · 온두라스 동향·사진·캘린더·중보기도 화면 리프레시 · (보류) 포트폴리오 공개 페이지(`/p/[slug]`) · 첨부/와이드 레이아웃 타 모듈 확장.

*작성: 2026-06-15 세션 종료. 커밋 d7dabd6(A)·4c42bae(B)·ebc8081(C). 신규 `lib/attachments.ts`. 직전 v2bm → `docs/archive/`.*
