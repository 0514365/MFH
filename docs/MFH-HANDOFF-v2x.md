# MFH 핸드오프 — v2-x (2026-06-01)

> Claude Code 경량 핸드오프(A 방식). 코드·git 으로 확인 가능한 것은 제외. repo 밖 상태(Supabase·드롭박스)·의사결정 맥락·다음 작업·열린 결정 위주.
> 상세 사양 = `MFH-CONTEXT.md` + `MFH-INSIGHTS-REDESIGN.md`. 직전 = `MFH-HANDOFF-v2w.md`.

---

## 0. 한 줄 요약

**1b — 드롭박스 준자동 회수 구현·배포·실기기 검증 완료.** claude.ai 분석 결과를 드롭박스 **순수 텍스트(.txt)** 파일에 덮어쓰면, 인사이트 진입 시 앱이 등록된 공유 링크를 폴링 fetch → **sha256 해시가 바뀐 경우에만** `parseInsightBundle`로 렌즈 분배 저장. 1a(수동 붙여넣기)의 마지막 단계를 자동화. 비용 0(Anthropic 호출 없음). `insight_sources` 테이블(patch77, 본인 전용 RLS) + `/api/insights/source`(GET/PUT/DELETE/POST) + `DropboxSyncPanel` 신설.

---

## 1. repo 밖 상태 (코드로 추적 안 됨 — 꼭 기록)

### Supabase (이번 세션 SQL 실행 완료)
- **patch77** `insight_sources` 테이블 신설(콘솔 실행 성공). 컬럼: `user_id`(PK→auth.users) · `url` · `last_hash` · `last_fetched_at` · `last_imported_at` · `last_count` · `created_at` · `updated_at`. **RLS = 본인 전용**(`auth.uid() = user_id`, 4정책). insights 와 달리 **멤버 공유 없음**(각자 자기 드롭박스 소스). 파일 `supabase/patch77-insight-sources.sql`(멱등).
- insights insert 는 기존대로 `model='manual'`, `user_id` 명시(patch73 RLS), domain CHECK 8종(patch76).

### 드롭박스 (우진 운용)
- 우진이 **순수 텍스트 파일**(`Dropbox/MFH/Insight Data/insight.txt`, UTF-8)에 양식 결과를 저장 → **공유 링크**를 앱에 등록함. 정상 동작 확인.
- ⚠️ 저장 폴더가 repo(`Dropbox/MFH`) **안 하위**라 git untracked(`Insight Data/`). 커밋 안 하면 무방(앱은 공유 링크로만 접근). 신경 쓰이면 repo 밖 이동 가능.
- 서버 fetch 시 드롭박스 링크의 `dl` 파라미터를 강제 `dl=1`로 바꿔 직다운로드. 허용 호스트 = `www.dropbox.com`·`dropbox.com`·`dl.dropboxusercontent.com`.

### 로컬/배포·git (이번 세션 push 완료)
- `3ce9e2e` feat: add Dropbox semi-auto insight source (1b) — 3파일(patch77.sql · source/route.ts · InsightsClient.tsx), 460 insertions.
- 검증 습관: `npx tsc --noEmit` + `npm run build` 통과 후 push. (이번도 통과)
- ※ 이 핸드오프(v2x) 자체는 아직 미커밋.

---

## 2. 이번 세션(v2-x) 한 일

**1b — 드롭박스 준자동 (배포 완료)**
- `supabase/patch77-insight-sources.sql`(신규): `insight_sources` 테이블 + 본인 전용 RLS. 멱등(create if not exists + add column if not exists + 정책 drop→create).
- `app/api/insights/source/route.ts`(신규, `MFH-INSIGHT-SOURCE-API-V1`):
  - **GET** 소스 조회 / **PUT** 등록·수정(드롭박스 호스트만, 저장 시 `last_hash=null` 리셋) / **DELETE** 해제 / **POST** 동기화.
  - POST 흐름: 소스 조회 → `toRawDropboxUrl`(dl=1·호스트검증) → fetch(AbortController 10s 타임아웃, Content-Length·바이트 1MB 제한) → `TextDecoder` → **sha256 해시**. `hash === last_hash` 면 skip(`unchanged`). 본문에 `===MFH-INSIGHT===` 없으면 skip(`noBlocks`). 그 외 `parseInsightBundle('overall' fallback)` → insights insert → `last_hash/last_fetched_at/last_imported_at/last_count` 갱신.
- `app/insights/InsightsClient.tsx`: `DropboxSyncPanel`(전체 분석 패널 내, ImportPanel 아래) — 마운트 시 GET → 링크 있으면 **자동 동기화 1회(진입 폴링, auto=true)** + 링크 등록/수정/해제 + "지금 동기화"(수동). 새 인사이트는 기존 `addRows`로 즉시 반영. `fmtWhen`(마지막 회수 시각 표시).

### 의사결정 맥락
- 소스 = **1인 1링크**(user_id PK). 폴링 = **진입 자동 1회 + 수동 버튼**. 갱신 판정 = **파일 전체 sha256 해시**(바뀔 때만 회수, "매 회차 교체" 전제). URL = **드롭박스 호스트만**(SSRF 완화). 위치 = 전체 분석 패널 내.
- 자동 회수는 **양식 블록(`===MFH-INSIGHT===`) 필수**(무관 파일 통짜 저장 방지). 수동 붙여넣기(import)는 기존대로 fallback 단일 허용.
- **RTF→평문 자동 변환은 안 함** — `\uNNNN`(한글) 디코딩 등 깨질 위험 → 우진이 `.txt`(일반 텍스트)로 저장하는 방식 채택.

### 교훈 (검증 중 실제로 겪음)
- **macOS TextEdit 기본 저장 = RTF.** `.rtf`로 저장하면 서식 코드(`\pard`·`\uNNNN`)가 통째로 회수돼 인사이트 본문이 깨짐. → **순수 텍스트(.txt, UTF-8) 필수**(TextEdit: 포맷→일반 텍스트로 만들기 ⇧⌘T). 파일명만 .txt 로 바꾸는 건 무효(내용을 평문화해야 함).
- **재등록(PUT)은 `last_hash=null` 리셋** → 같은 파일이라도 다음 동기화에서 1회 재회수됨. 초기 중복(overall 6·prayer 3·fruit 3 = 2:1:1 ×3)은 **테스트 중 RTF→txt 전환 + 반복 재등록** 누적이었음(코드 버그 아님). 한 번 등록 후 파일만 덮어쓰는 실사용에선 중복 없음 — 검증됨.
- **정수배 중복**(같은 비율 ×N)은 "동일 본문 반복 저장" = 해시 비교 미작동 신호. 진단 시 `insight_sources.last_hash` 채워졌는지부터 확인.

---

## 3. 다음 작업 후보

| # | 후보 | 비고 |
|---|---|---|
| A | **Letter v3** | letters 연계, 3단 편지 초안(Phase 5). Prayer+Fruit "편지에 담기" 합류. 인사이트 최종 출구. |
| B | **완전 자동(1c)** | 드롭박스 webhook 또는 Google Apps Script → Supabase 직저장(비용 0, 복잡·보안). **준자동(1b) 검증됐으니 진입 가능.** |
| C | Balance/Fruit 다듬기 | 소스 토글 / AI 권면 · AI 간증 다듬기 · "편지에 담기" 실동작 |
| D | RTF 거부 가드(선택) | source POST 에서 `{\rtf` 감지 시 거부 + "순수 텍스트로 저장" 안내(재발 방지) |
| E | 이월(v2t~) | 영상 5건 / 중보 스팸강화 / 방문자 카운팅 / service_role 키 회수 / import API 에러 상세 노출 제거 등 |

## 4. 열린 결정사항

- [ ] **재등록 시 같은 파일 재회수** — 현재 PUT 이 `last_hash` 리셋(1회 재회수). 유지 vs 내용 같으면 skip(URL 동일+해시 동일 시 보존).
- [ ] **RTF/바이너리 거부 가드** 추가 여부(D).
- [ ] **완전 자동(1c) 트리거** — Dropbox webhook vs Google Apps Script.
- [ ] Balance 소스 **토글** / 3소스 **단위 차이** 보정 / Balance **AI 권면** · Fruit **AI 간증 다듬기** — 집계만(현재) vs 버튼 AI.
- [ ] "편지에 담기" 실제 동작(현재 UI 플래그만) → Letter v3.
- [ ] (이월) import API 에러 상세 노출 제거 / `MFH-INSIGHTS-REDESIGN §5` "domain CHECK 없음"·"본인 기준" 표기 정정.

## 5. 다음 세션 시작 문구(예시)

> "안녕 Claude. MFH 이어서. `docs/MFH-HANDOFF-v2x.md` 기준. **Letter v3** 또는 **완전 자동(1c)** 중에서. (Balance/Fruit AI 다듬기·RTF 가드는 후순위.)"
