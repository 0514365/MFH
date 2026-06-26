# MFH 핸드오프 v2ch (세션 종료)

> 이전: `v2cg`(회계 입력 Phase 1 + ABC→MFH + 동향 48h). 이번 세션: **회계 목록강화(a·b) + Phase 2 요약 + Phase 3 리포트 + 후원자 노션 자동동기화 + 내보내기 제거**. 앱 `3.2.1 → 3.4.0`(회계관리·후원자관리 모듈 추가 MINOR — 실사용하며 마이너 개선 예정).

---

## 현재 위치 (한 줄)

**회계 모듈 = 입력(Phase 1)·목록강화(a·b)·요약(Phase 2)·리포트(Phase 3) 완성**, **후원자 = 앱→노션 자동동기화**. 모두 main push·배포. **다음 = 우진 실사용 점검 후 마이너 개선 / 회계 Phase 4(모바일 폼)·5(이체)**.

---

## 이번 세션 작업 (모두 main push·배포)

### 회계 목록 강화 a — 읽기 (`f4c9c21`)
- 최근 거래를 `TransactionList.tsx`(V2)로 분리. **월별 그룹화·접기(▾/▸)**, **월 합계**(수입/지출 USD, 그룹 하단), **필터**(구분·항목·계좌·이름검색), **정렬**(날짜·환산 헤더 클릭, 모바일 select). `getRecentInout` limit 미지정 시 **전체 로드**(클라이언트 집계).

### 회계 목록 강화 b — 일괄 (`7d8bedb`)
- 행 체크박스·전체선택, **다중 삭제**(archived), **통합 수정**(항목·계좌만, 금액·이름 등 보존). 수입·지출 혼합 선택 시 계좌만, 이체 제외.
- `bulkDeleteInout`·`bulkPatchInout`(순차, rate limit 회피)·`patchInoutFields`(부분 PATCH, 계좌는 구분별 필드).

### 회계 Phase 2 — 메인 요약 (`640c846`)
- `AccountingSummary.tsx`: **이번달 수입/지출/순액**(브라우저 로컬월) + **계좌별 잔액·총자산**. 헤더 아래·폼 위.
- `getAccountBalances()` — 자산 DB **`잔액(USD)` formula** read(입금합−출금합+조정·초기보유 최종값). 우리은행 $11,499.69 검증.

### 회계 Phase 3 — 리포트 (`86c00d8`)
- `/accounting/report`(`ReportView.tsx`): **연도 선택** + 항목별 수입/지출(가로막대·비중) + 후원자별 헌금 순위(무명·단체 묶음) + 계좌 잔액. 회계 헤더에 `리포트` 버튼. 집계는 `recent`+`options`+`balances` 클라이언트.

### 후원자 노션 자동동기화 (`215c85a`)
- 앱 후원자 등록/수정 → 노션 후원자 DB **upsert**(앱ID 매핑, 17필드), 삭제 → **archived**. `app/supporters/actions.ts`(`syncSupporter`·`unsyncSupporter`) + `lib/notion`(`upsertSupporterToNotion`·`archiveSupporterInNotion`). SupporterForm 저장후·DeleteButton 삭제후 호출.
- **노션 실패해도 앱 저장 유지**(경고만). 기존 **내보내기**(SupportersExport + supportersToCSV/JSON·donationsToJSON) **제거**.

### 버전 `3.2.1 → 3.4.0`

---

## 핵심 메커니즘 (다음 세션 필수)

**SoT 구조 (혼동 금지)**:
- **회계(입출금기록) = 노션 단일 SoT, 앱은 UI**. **양방향 자동** — 앱 입력/수정/삭제는 노션에 즉시 write, 노션에서 직접 수정해도 앱이 `force-dynamic`+`no-store`로 매번 새로 읽어 반영. 동기화 단계·충돌 없음. 노션·앱 입력 병행 가능.
- **후원자 = 앱(Supabase) SoT, 노션 후원자 DB는 미러**. **단방향 앱→노션**. ⚠️ 노션에서 후원자 수정해도 앱 미반영 + 이후 앱에서 저장하면 앱 값이 노션을 덮어씀(노션 수정분 손실). **후원자 편집은 반드시 앱에서**.

**후원자 동기화 매핑**: 앱ID(=supporter.id, rich_text)로 노션 query → upsert. 17필드(이름·생년월일·소속·직분·지역·전화·이메일·SNS·소개자·첫만남·정기후원·정기통화·정기금액·기도제목·메모·활성). 헌금·헌금합계는 노션이 입출금기록 relation으로 자동.

**권한 = 마스터 전용**(2중): 홈 타일 `isMaster` 조건(`app/page.tsx` 417·429) + 6개 page.tsx 서버 가드 `if(!isMaster)redirect('/')`(supporters·supporters/new·[id]·[id]/edit·accounting·accounting/report) + server action `isMaster` 확인.

**노션 ID**: 입출금 database `37c15af9-28ad-817b-94da-c05e3f2e7e3a`. 후원자 DB `fe45d45f-c7c0-40ce-a329-525e46a83ef3`. 자산 `37c15af9-28ad-81eb-a392-ce9226dcdbc7`. 항목 `37c15af9-28ad-811c-b32f-c7878db9b51f`. (REST=database id)

**파일 지도(이번 세션)**: `app/accounting/TransactionList.tsx`(목록 V2)·`AccountingSummary.tsx`(요약)·`report/{page,ReportView}.tsx`(리포트). `app/supporters/actions.ts`(동기화). `lib/notion.ts`(getAccountBalances·patchInoutFields·bulk*·upsert/archiveSupporter). 회계 설계 `docs/MFH-ACCOUNTING-DESIGN.md`.

---

## 빌드·검증 함정

- worktree에 node_modules 없음 → 메인 심링크(`ln -sfn "메인/node_modules" node_modules`) 후 `npx tsc --noEmit`·`npm run build`.
- 회계·후원자 마스터 가드 → preview 캡처 불가. **tsc + build + 배포 후 우진 실기**.
- **노션 write 런타임 검증은 auto classifier가 라이브 SoT 쓰기로 차단** → 코드리뷰(기존 검증된 패턴과 동일) + 배포 후 실기로 갈음. read-only(getAccountBalances·스키마 조회)는 통과.
- 머지 흐름: worktree 커밋 → 메인 ff(`git -C 메인 merge --ff-only claude/condescending-jackson-9b0c89`) → `push origin main`. 메인 워킹트리 flyers untracked 무관.

---

## 다음 세션 (우선순위)

1. **실사용 점검 후 마이너 개선** — 우진이 회계·후원자를 실제 사용하며 피드백 → 패치(3.4.x).
2. **회계 Phase 4** — 모바일 입력 폼 다듬기(통화+금액·환율+환산 짝짓기).
3. **회계 Phase 5** — 이체·환전(계좌 간 이동·환전 기록).
4. (옵션) 후원자 목록 통계(올해/이번 달)가 아직 Supabase `supporter_donations` read(`app/supporters/page.tsx`) — 헌금 SoT가 노션으로 옮겨졌으니 노션 집계로 일원화 검토.

---

## 백로그
1. ⚠️ **손경희 후원액 점검** — 원금 100,000원인데 금액 14.29(김영동 값 복사 추정). 실제라면 $71.43/월. 노션에서 `금액` 수정 → 앱 합계 자동 정정.
2. 노션 **빈 거래 2건**(금액·후원자 없음) 정리(노션에서).
3. 후원자 목록 통계 노션 일원화(다음세션 4).
4. 동향 루틴 모니터.
5. 후원자 개별 AI 메시지(비용).

---

## 워킹트리 메모 (앱 라인 무관)
- `flyers/dongsan-2026-07/` · `scripts/measure-usage.ts` — 임시.

*작성: 2026-06-25 세션. 회계 목록강화 a(월별그룹·합계·필터·정렬)·b(다중선택·일괄삭제·통합수정). Phase 2 요약(이번달·계좌잔액). Phase 3 리포트(항목별·후원자별). 후원자 앱→노션 자동동기화(upsert/archive)·내보내기 제거. 버전 3.2.1→3.4.0. 커밋 f4c9c21·7d8bedb·640c846·86c00d8·215c85a + 버전/핸드오프. 직전 v2cg → archive.*
