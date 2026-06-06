# MFH 핸드오프 v2af

> 이전 상태: `MFH-HANDOFF-v2ae.md`(할일·프로젝트·일지 연계 UX — 별개 트랙), `v2ad`(선교편지 팀) 참조.
> **이번 세션 주제: 인사이트 시스템 대개편 — 수동/종량제 제거 → 데스크톱 Claude Code 자동 생성.**

---

## 현재 위치 (한 줄)

인사이트를 **"데스크톱 Claude Code가 하루 3회 자동 생성"**하는 구조로 전환 중. **Phase 1·2·3a 완료·배포**. 다음은 **Phase 3b(Local 루틴 — 이 개편의 심장부).**

---

## 큰 그림 (왜 이 개편인가)

- **기존 문제**: 앱에서 수동 내보내기 → claude.ai 분석 → 드롭박스 회수, 또는 AI 전체생성(종량제). 인사이트가 흩어지고 생성 때마다 중복 누적.
- **핵심 통찰**: 드롭박스 왕복은 claude.ai 웹챗이 DB에 직접 못 닿아 만든 우회로. **Claude Code/Cowork는 Supabase(service role)에 직접 읽고 쓴다**(이미 `scripts/fetch-letter-materials.mjs`가 그렇게 함). → 우회로 폐기.
- **결정**: 인사이트 생성을 **Claude Code(구독, 종량제 0)**가 Supabase 데이터를 직접 분석해 저장. **데스크톱 기반**(Mac 켜진 동안만). 모바일 단독 불가는 수용.
- **트리거**: Local 루틴 **하루 3회(06·14·21시)** + 수동 명령("○○ 인사이트 업데이트").
- **표시**: 앱은 도메인별 **최신 1개만**. 전체는 **repo 파일 아카이브**(코드 참고용). 별점/메모 → 다음 분석에 반영(피드백 루프).

---

## 전체 Phase 로드맵

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | 인사이트 수동/종량제 기능 제거 | ✅ 배포 |
| 2 | 사진 모아보기(/photos) | ✅ 배포 |
| 3a | 저장구조(도메인별 1행) + 보관함 | ✅ 배포 |
| **3b** | **Local 루틴: pull/push + 분석 + 등록** | **다음·핵심** |
| 3c | 사진 캡션 증분 생성(비전) | 대기 |
| 4 | 비서(project/task 능동 제안) | 대기 |
| 5 | 할 일 뱃지(앱 아이콘) | 대기(분리) |

---

## 이번 세션 완료 (상세)

### Phase 1 — 제거 (commit 3ea5324)
- 라우트 삭제: `api/insights/{export,import,source,manual,route.ts}` (※ `[id]`는 유지 — 별점·메모·삭제).
- `InsightsClient.tsx` 전체 분석 섹션(ImportPanel·DropboxSyncPanel·AI생성) 제거 → **읽기 전용 렌즈 화면**(V3).
- `ANTHROPIC_API_KEY` **완전 폐기**(코드·Vercel·.env.local 3곳). 새 루틴은 구독이라 불필요.
- `patch80`: `insight_sources` 테이블 drop(드롭박스 폐기).

### Phase 2 — 사진 모아보기 (commit 60eab7c)
- `letter-materials` 페이지 삭제(편지재료 텍스트 폐기) → **`/photos`** 신규(rename). ※ 선교편지 팀 스크립트 `fetch-letter-materials.mjs`는 유지.
- `/photos`: 월 선택 + **사역(분류)별 그리드** + **다중선택 → ZIP 내보내기**(클라 JSZip) + 캡션 표시 자리.
- 진입: 인사이트 상단 "사진 모아보기" 링크 + 홈 **Photos** 카드(`ModuleIcon` photos 추가).
- `JournalPhoto.ai_caption` 필드 추가(생성은 3c). `ResolvedPhoto`에도 반영.
- `.gitignore`: `tsconfig.tsbuildinfo`·`2026 Brand Kit/`·`Insight Data/` 추가. `jszip` 의존성 추가.

### Phase 3a — 저장구조 + 보관함 (commit 6498be6)
- `patch81`: ① insights 중복 정리(도메인별 최신 1행) ② `(user_id,domain)` **unique**(upsert 대상) ③ `insight_scraps` 테이블(영구 복사본 + RLS).
- `api/insights/scraps`(POST 보관·GET 목록) + `[id]`(DELETE).
- 인사이트 카드 **보관** 버튼(`isScrapped`→"보관됨"), **보관함** 페이지(`/insights/saved`) + 링크.

---

## 확정 결정 (재논의 불필요)

| # | 결정 | 값 |
|---|---|---|
| D1 | 인사이트 저장 | 하이브리드: DB(최신·별점/메모) + repo 파일 아카이브 |
| D2 | 사진 내보내기 | 다중선택 ZIP(클라 JSZip) ✅구현 |
| D3 | 사진 메뉴명 | "사진 모아보기"(/photos) ✅ |
| D4 | 새 메뉴 위치 | 인사이트 하위 링크 + 홈 카드 ✅ |
| D5 | 뱃지 | 이번 범위 분리(Phase 5) |
| B-a | 비서 분석 입력 | 일지 맥락 포함 |
| B-b | 비서 제안 수 | 카드당 3~5 |
| B-c | 비서 톤 | 간결 실무형 |
| P-a | 캡션 생성 | 새 사진만 증분 1회 |
| P-b | 캡션 저장 | photos jsonb `ai_caption` ✅필드 |
| P-c | 편지 연계 | letter 팀(collector/designer)이 캡션 활용 |
| P-d | 캡션 시점 | 표시=3a✅ / 생성=3c |
| 3-1 | DB 최신 유지 | `(user_id,domain)` unique→upsert ✅ |
| 3-2 | 별점/메모 | upsert는 content·기간만, rating·메모·in_letter 보존 |
| 3-3 | 아카이브 | repo `insights-archive/`(gitignore), 도메인별 JSONL 누적 |
| 3-4 | 스크랩 | 별도 테이블 복사본 ✅ |
| 3-5 | 루틴 분석/lib | pull/push 스크립트 + Claude Code(구독), lib는 tsx로 재사용 |
| 3-6 | 보관함 위치 | 인사이트 하위 ✅ |

---

## Phase 3b 설계 출발점 (다음 세션 시작점)

**흐름**: `pull(데이터 추출)` → **Claude Code 분석(구독·가드레일)** → `push(DB upsert + 파일 아카이브)`

**결정할 것**:
1. **tsx 도입 여부** — lib(TS) 재사용 위해 `tsx` 설치 vs `.mjs` 복제(fetch-letter-materials 선례). 추천: tsx(동기화 이점).
2. **스크립트 구조** — `scripts/insight-pull.ts`(데이터 markdown 출력) / `scripts/insight-push.ts`(양식 파싱→DB upsert + 아카이브). 분석은 Claude Code 세션이 수행.
3. **분석 주체/지침** — 루틴 instruction 또는 `.claude/agents/insight-generator.md` 에이전트 정의(가드레일 포함). 선교편지 팀 패턴 참고.
4. **Local 루틴 등록** — Claude Code Desktop → Routines → **Local**(Mac 켜진 동안만 실행, 꺼지면 가장 최근 1회만 catch-up). 하루 3회 06·14·21시. ⚠️ "Remote(클라우드)" 아님 — `.env.local`(service role) 접근 위해 반드시 Local.

**재사용 자산(lib)**:
- `insightExport.ts`: `buildDataMarkdown(ExportData)`, `domainNeeds`, `INSIGHT_PERIODS`, `DOMAIN_LABEL`, `isValidDomain`, `InsightDomain`.
- `insightPrompt.ts`: `buildSystemPrompt(domain, fewShot)` ← **가드레일(기도제목 3원칙·정치중립·톤) 내장**, `buildFewShot`(rating≥4 DB), `LENS_FOCUS/OUTPUT`.
- `insightImport.ts`: `parseInsightBundle(text, fallback)`, `IMPORT_FORMAT_GUIDE`(===MFH-INSIGHT=== 양식). push가 재사용 가능.

**생성 대상 도메인(감성 인사이트)**: `overall, journal, project, task, prayer, fruit`. ※ `balance`=무료 집계(생성 X), `letter`=선교편지 팀, **project/task의 "비서(능동 제안)"는 Phase 4**(감성 인사이트와 별개 트랙).

**DB upsert 주의(3-2)**: `(user_id,domain)` onConflict. content·period만 갱신하고 **rating·feedback_note·in_letter는 보존**(기존 행 읽어 유지하거나 upsert에서 해당 컬럼 제외).

**아카이브(3-3)**: `insights-archive/<domain>.jsonl` 누적. ⚠️ **`.gitignore`에 `insights-archive/` 추가 아직 안 됨 → 3b에서 추가**(개인 사역내용).

---

## Phase 4 비서 설계 (예약)

- **To-Do + 프로젝트 둘 다.** 2층: **L1 규칙(무료·실시간)** = 마감/중요도/정체 신호 탐지 + **L2 능동 제안(Local 루틴·구독)** = 오늘 집중 Top3·우선순위 재배치·정체 프로젝트 재점화·묶음 처리.
- 각 메뉴(project/task) 상단 "비서" 카드(최신만). tasks 필드: due_date·status·done·importance·category 활용.

## Phase 5 뱃지 (예약)

- 앱 아이콘 뱃지 = 오늘/다가오는 할 일 수. **현재 service worker 없음**(manifest만) → 백그라운드 자동 갱신엔 **Web Push + SW 신규 구축** 필요(iOS 16.4+ 설치형 PWA). 비용·복잡도로 **분리 진행**. 포그라운드(`setAppBadge`)부터 가볍게 시작 가능.

---

## 우진 환경 액션 (완료)

- `ANTHROPIC_API_KEY` 폐기 ✅ (코드·Vercel·.env.local)
- `patch80`(insight_sources drop) ✅ 실행
- `patch81`(중복정리+unique+insight_scraps) ✅ 실행

---

## 주의사항

- 인사이트/캡션 생성은 **구독(Claude Code)만** — 종량제 API 안 씀(키 폐기됨). 비용 민감(memory) 부합.
- 도메인 가드레일: 정치 정당·인물 거명 금지(중립), 기도제목 3원칙, **사진 캡션/인사이트에 인물·아동 실명/식별정보 금지**(프라이버시).
- 디자인: 파스텔·차분(memory). 이모지 절제.
- `insights-archive/` gitignore 추가 미완 → 3b 착수 시 1순위.
- `package-lock.json`은 미추적 관행 유지(Vercel은 package.json으로 설치).
- v2ae(할일·프로젝트·일지 UX)는 **별개 트랙** — 같은 repo 공존, 인사이트 작업과 파일 충돌 없음.

---

## 관련 커밋

- `3ea5324` Phase 1 (제거)
- `60eab7c` Phase 2 (사진 모아보기)
- `6498be6` Phase 3a (보관함·저장구조)
- 이 핸드오프 `v2af` — commit 대기

*작성: 2026-06-05 세션 (인사이트 개편 1~3a).*
