# MFH 핸드오프 v2ag

> 이전 상태: `MFH-HANDOFF-v2af.md`(인사이트 개편 Phase 1·2·3a) 참조.
> **이번 세션 주제: Phase 3b — Local 루틴(인사이트 자동 생성) 코어·가동 + E2E 검증.**

---

## 현재 위치 (한 줄)

인사이트 **"데스크톱 Claude Code 자동 생성"** 구조의 심장부 **Phase 3b 완료**(pull/push 스크립트 + 슬래시 커맨드 + E2E 1회 성공·보존 실증). 남은 것은 **우진의 Local 루틴 등록**(앱 밖 1회 작업)과 다음 단계 **3c(사진 캡션)/Phase 4(비서).**

---

## 이번 세션 완료 (상세)

### Phase 3b-1 — 인프라·코어
- **`tsx` devDependency 설치** — lib(TS)를 `.mjs` 복제 없이 직접 import(중복 0). `tsconfig` `"@/*": ["./*"]` 를 tsx가 그대로 해석.
- **`scripts/insight-pull.ts`** (`MFH-INSIGHT-PULL-V1`) — Supabase(service role)에서 **부부 공동 데이터**(user_id 필터 없음) 조회 → `buildBundleInstruction`+`buildDataMarkdown`+`buildFewShot`+`IMPORT_FORMAT_GUIDE`(전부 lib 재사용)로 **작업지시서(stdout)** 생성. 가드레일(기도 3원칙·목양 톤) 내장. 인자 `--days 7|30|90`(기본 90).
- **`scripts/insight-push.ts`** (`MFH-INSIGHT-PUSH-V1`) — `===MFH-INSIGHT===` 텍스트를 `parseInsightBundle`로 파싱 → insights **upsert**(`onConflict: user_id,domain`) + `insights-archive/<domain>.jsonl` 누적. **content·period·created_at·model만 갱신, rating·feedback_note·in_letter 보존**(payload 미포함 컬럼은 PostgREST가 유지).
- CJS/ESM 충돌은 **`async main()` + `process.cwd()` 경로**로 회피(top-level await·import.meta 제거). ⚠ **repo 루트에서 실행** 전제.
- `.gitignore`에 **`insights-archive/` 추가**(개인 사역내용 — 결과·작업파일 모두 비추적).

### Phase 3b-2 — 오케스트레이션·가동
- **`.claude/commands/insight-update.md`** — `/insight-update [--days N]` 슬래시 커맨드. pull → (Claude Code 분석·가드레일 준수) → `insights-archive/_result.md` Write → push → 보고. 수동·루틴 공용. (스킬로 자동 등록 확인됨.)
- **`.env.local`에 `MFH_USER_ID` 추가** — 저장 귀속 user_id(우진). 분석 입력은 부부 공동이나 저장은 1명 귀속.
- **E2E 1회 성공**(30일): pull(일지 8·프로젝트 6·할일 31) → 6도메인 작성 → push **6/6 저장** → 아카이브 6 jsonl.

### E2E 검증 결과 (보존 로직 실증)
| 도메인 | rating | model | 의미 |
|---|---|---|---|
| journal | **5** | claude-code | ✅ 기존 별점 5 **보존**(content 새로, rating 유지) |
| overall·project·task·prayer·fruit | - | claude-code | ✅ upsert 신규 |
| letter | - | **manual** | ✅ 루틴이 **건드리지 않음**(선교편지 팀 영역) |
- `(user_id,domain)` unique로 도메인당 1행, `created_at` 갱신(최신 표시), period `2026-05-07~2026-06-06` 정확.

---

## 우진 환경 액션

- ✅ `.env.local` `MFH_USER_ID=6920f3d8-…` 추가(완료).
- ⏳ **Local 루틴 등록(대기)** — Claude Code **Desktop 앱**에서:
  1. 사이드바 **Routines → New routine → Local** (※ Remote는 `.env.local` 접근 불가라 반드시 **Local**).
  2. **Instructions**: `/insight-update` (또는 "인사이트 업데이트해줘").
  3. **Schedule**: **Daily** — 06:00 / 14:00 / 21:00 **3개** 등록(Daily는 시간 1개씩).
  4. **Working folder**: `/Users/wbook_m1/Dropbox (개인용)/MFH`.
  5. **Permission Mode**: **Allow**(자동권한 핵심 — Bash·Write 무프롬프트).
  - Mac 꺼져 있으면 스킵 → wake 후 가장 최근 1회만 catch-up.
- ⏳ 앱(`mfh-snowy.vercel.app/insights`)에서 6개 도메인 인사이트 표시 + journal 별점 5 유지 확인.

---

## 확정 결정 (재논의 불필요)

| # | 결정 | 값 |
|---|---|---|
| 3b-A | lib 재사용 | tsx 설치(직접 import, 중복 0) ✅ |
| 3b-B | 저장 user_id | `.env.local` `MFH_USER_ID` 명시(부부 2인이라 자동추론 안 함) ✅ |
| 3b-C | 오케스트레이션 | `/insight-update` 슬래시 커맨드(루틴·수동 공용) ✅ |
| 3b-D | 분석 입력 범위 | 부부 공동(service role, user_id 필터 없음). 저장만 우진 귀속 ✅ |
| 3b-E | 생성 도메인 | overall·journal·project·task·prayer·fruit. letter·balance 제외 ✅ |
| 3b-F | 기본 기간 | 90일(pull `--days` 로 조정) ✅ |

---

## 다음 단계 (대기)

| Phase | 내용 | 상태 |
|---|---|---|
| 3c | 사진 캡션 증분 생성(비전) — 새 사진만 1회, `ai_caption` 저장 | 대기 |
| 4 | 비서(project/task 능동 제안) — L1 규칙(무료)+L2 능동 제안(Local 루틴) | 대기 |
| 5 | 할 일 뱃지(앱 아이콘) — SW+Web Push 신규 | 대기(분리) |

---

## 주의사항

- 인사이트 생성은 **구독(Claude Code)만** — 종량제 API 안 씀(키 폐기됨). 비용 민감(memory) 부합.
- 가드레일: 정치 정당·인물 거명 금지(중립), 기도제목 3원칙, 인물·아동 실명/식별정보 자제(프라이버시). E2E에선 동역자 실명 최소화·부부 본인만 거명.
- 스크립트는 **repo 루트에서 실행**(process.cwd 기준 .env.local·insights-archive).
- `insights-archive/`(결과 jsonl + `_result.md` 작업파일)는 gitignore — 커밋되지 않음.
- `package-lock.json`은 미추적 관행 유지(Vercel은 package.json으로 설치, tsx는 로컬 devDep).
- 보존 메커니즘: upsert payload에 rating/feedback_note/in_letter 미포함 → 기존값 유지. 앱 별점·"편지에 담기"가 루틴에 덮이지 않음.

---

## 관련 커밋

- `3ea5324` Phase 1 · `60eab7c` Phase 2 · `6498be6` Phase 3a · `1e6ce64` 핸드오프 v2af
- 이 핸드오프 `v2ag` — Phase 3b(pull/push + insight-update) commit 대기

*작성: 2026-06-05 세션 (인사이트 개편 Phase 3b).*
