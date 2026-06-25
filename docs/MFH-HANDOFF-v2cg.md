# MFH 핸드오프 v2cg (세션 종료)

> 이전: `v2cf`(A방향 동기화 + 후원자 UI 1단계). 이번 세션: **동향 루틴 개선 + 노션 ABC→MFH 단순화 + 헌금이력 2단계(연도별) + 회계 입력 모듈(A안) Phase 1**. 앱 `3.2.1` 유지(회계 모듈은 MINOR/MAJOR급 추가지만 안정화 후 버전 확정 — 우진 지시로 보류).

---

## 현재 위치 (한 줄)

**회계 입력 모듈(A안) Phase 1 완료** — 앱에서 노션 입출금기록에 직접 입력·수정·삭제(데스크탑 스프레드시트 / 모바일 세로), 영수증 files 컬럼. 노션=SoT, 앱=입력 UI(write)+집계(read). **다음 = Phase 2 메인 요약(이번달 수입·지출·계좌별 잔액)**.

---

## 이번 세션 작업 (모두 main push·배포)

### 1. 온두라스 동향 루틴 개선 (`16fa338`)
- 72h→**48h**, **문화 당일필수 승격**(4분야=정치·경제·사회·문화), 빈 분야 **"특이사항 없음"** 표시(숨기지 않음), **안전② 규칙**(공식경보·한인 모두 없으면 그날 치안 핵심 1건을 `안전` 태그 승격).
- `scripts/news-pull.ts`(작업지시서)·`app/honduras/BriefingView.tsx`·`.claude/commands/news-update.md`·`docs/MFH-HONDURAS-NEWS-SOURCES.md`.

### 2. 노션 ABC→MFH 단순화
- ABC 가계부(formula 50+)를 MFH 단순 회계로. **통계 DB(formula 30+) 휴지통**, 항목 DB formula 19개·항목성격·월예산 제거, 입출금 ABC 잔재 7컬럼 제거, **ABC 예시 항목 42개 삭제 → MFH 15항목**(후원금·기타수입·중고판매·노션템플릿판매 / 사역비·생활비·주거·차량·통신·의료·자녀교육·수수료·행정기타·미용의류·특별비).
- 구분 옵션 = 수입/지출/이체. ABC 안내 페이지 2개·미납2·빈1 거래 삭제.
- **앱 연동 컬럼(앱ID·헌금합계·금액·후원자·날짜·구분) 무변경.**

### 3. 헌금이력 2단계 — 연도별 집계 (`69bec9c`)
- `lib/notion.getDonationsByAppId()` — 후원자 DB(pageId→앱ID) + 입출금 수입거래 → `Map<앱ID,{total,years[]}>`.
- `DonationPanel` 연도별 표시, Supabase 개별목록 제거. 검증 $11,499.69.

### 4. 회계 입력 모듈 (A안) — 1단계 + Phase 1 (`aebb6c3`·`6b735c0`·`a930a24`·`cec0ec6`)
- `app/accounting/`: `page.tsx` + `AccountingForm.tsx`(V2) + `actions.ts`. 홈 `Accounting` 타일(마스터).
- `lib/notion`: `getAcctOptions`·`getRecentInout`·`createInoutRecord`·`updateInoutRecord`·`deleteInoutRecord`.
- 데스크탑 가로 스프레드시트 / 모바일 세로. 조건부 콤보(구분별 항목·계좌), 후원자 자동연결, 환산 자동, **금액 천단위 쉼표**, 컨트롤 `h-9` 통일.
- **거래 수정(행→폼 편집모드)·삭제(archived 복구가능)**, **영수증 files 컬럼**(노션).

---

## 핵심 메커니즘 (다음 세션 필수)

**회계 A안**: 노션=회계 SoT. 앱=입력 UI(write)·집계(read). 앱은 저장소 없음 → 노션에 직접 read/write → 단일 SoT, 동기화 충돌 0. 노션 직접 입력과 앱 폼 병행 가능.

**입출금기록 매핑** (폼→노션): 구분→`구분`, 날짜→`날짜`, 항목→`항목`(relation), 이름→`이름`(title), 통화→`통화`, **금액(현지)→`원금`**, 환율→`환율`, **환산(USD)→`금액`**(★헌금합계 rollup 타겟), 계좌→`입금계좌`/`지불계좌`(수입/지출별 relation), 후원자→`후원자`(relation).
**환산 규칙**: `금액(USD) = 원금(현지) ÷ 환율`(환율=1USD당 현지통화).

**노션 ID**: 입출금기록 database `37c15af9-28ad-817b-94da-c05e3f2e7e3a` / collection `37c15af9-28ad-817a-a360-000b137b8b1e`. 후원자 DB `fe45d45f-c7c0-40ce-a329-525e46a83ef3`. 항목 `37c15af9-28ad-811c-b32f-c7878db9b51f`. 자산 `37c15af9-28ad-81eb-a392-ce9226dcdbc7`. (REST=database id, MCP=collection id — 혼동 시 404)

**노션 read/write**: REST API(`databases/{id}/query`, `pages` POST/PATCH, `archived:true`=휴지통). MCP `query_data_sources`는 Business plan 필요(무료 400). 토큰 `NOTION_TOKEN`(서버 전용).

**동향 루틴**: 4분야 48h 당일필수, 빈 분야 "특이사항 없음", 안전②. 자동 06:00 `honduras-news-0600`. 상세 `docs/MFH-HONDURAS-NEWS-SOURCES.md`.

**회계 설계 상세**: `docs/MFH-ACCOUNTING-DESIGN.md`(작업순서 §8 포함).

---

## 빌드·검증 함정

- worktree에 node_modules 없음 → 메인 심링크(`ln -sfn "메인/node_modules" node_modules`) 후 `npx tsc --noEmit`.
- `/accounting`·`/supporters` 마스터 로그인 → preview 캡처 불가. tsc + 노션 런타임 검증 + 배포 후 우진 실기.
- 노션 write 검증: `NOTION_TOKEN=... npx tsx -e "import('./lib/notion')..."`(create/update/delete 테스트 → 삭제로 정리).
- 노션 데이터 변경 직후 query 일시 불일치(eventual consistency) — 재호출하면 정상(2단계 첫 검증 때 발생).
- 머지 흐름: worktree 커밋 → 메인 fast-forward(`git -C 메인 merge --ff-only claude/busy-mclean-539b82`) → `push origin main`. 메인 워킹트리 untracked(flyers 등) 무관.
- 노션 스키마 변경(DROP COLUMN·DB trash)은 auto classifier 승인 필요 — 정확한 목록 제시 후 진행. ADD COLUMN(비파괴)은 통과.

---

## 다음 세션 (우선순위)

1. **Phase 2 메인 요약(앱)** — 회계 페이지 상단 이번달 수입·지출 합 + 계좌별 잔액(자산 `입금합USD`−`출금합USD` rollup read). `docs/MFH-ACCOUNTING-DESIGN.md` §8.
2. Phase 3 리포트(항목별·후원자별·계좌 잔액 — Phase 2 로직 재사용).
3. Phase 4 모바일 폼 다듬기(통화+금액·환율+환산 짝짓기).
4. Phase 5 이체·환전.

**노션에서 즉시(앱 개발 불필요)**: 항목추가(항목 DB 행)·입력수정(셀)·CSV(DB ⋯ 메뉴)·영수증(files 첨부).

---

## 백로그
1. ⚠️ **손경희 후원액 점검** — 원금 100,000원인데 금액 14.29(=20,000÷1400, 김영동 값 복사 추정). 실제라면 $71.43/월(×6=$428.57). 노션에서 `금액` 수정 → 앱 합계 자동 정정.
2. 노션 **빈 거래 2건**(금액·후원자 없음) 정리(노션에서).
3. 동향 루틴 모니터(이월).
4. 후원자 개별 AI 메시지(비용).

---

## 워킹트리 메모 (앱 라인 무관)
- `flyers/dongsan-2026-07/` · `scripts/measure-usage.ts` — 임시.

*작성: 2026-06-25 세션. 동향 루틴 48h·4분야·안전②. 노션 ABC→MFH(formula 50+ 제거, 15항목). 헌금이력 2단계 연도별. 회계 입력 모듈 A안 Phase 1(입력·수정·삭제·영수증, 데스크탑/모바일). 커밋 다수 push. docs: MFH-ACCOUNTING-DESIGN.md 신규·MFH-HONDURAS-NEWS-SOURCES.md 갱신. 직전 v2cf → archive.*
