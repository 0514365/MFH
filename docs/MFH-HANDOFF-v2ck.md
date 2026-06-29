# MFH 핸드오프 v2ck (세션 종료)

> 이전: `v2cj`(회계 브랜치 재설계 구현 완료). 이번 세션: **후원자관리를 회계와 동일 패턴으로 전용 layout + 4탭 브랜치(현황·명단·등록·분석)로 분리 구현·배포.** 앱 버전 **3.4.0 유지** — 분리 완료했으니 다음에 **회계+후원자 묶어 MINOR(3.5.0)** 제안 가능(우진 결정).

---

## 현재 위치 (한 줄)
**후원자 = 전용 layout + 4탭 브랜치(현황·명단·등록·분석) 분리 완료·배포(push 4f306ad).** 다음 = **실기 확인** → 피드백 반영 → 회계+후원자 묶어 **버전 3.5.0(MINOR)** 통합.

---

## 이번 세션 작업 (main push·배포, 커밋 944f2c7·4f306ad)

### 후원자 브랜치 분리 — 회계 패턴 복제
- **a 골격**(`944f2c7`): `app/supporters/layout.tsx`(마스터 가드 + 공통 헤더 + 4탭 `SupportersNav`). `SupportersTitle`(경로→섹션명), `SupportersBack`(경로 맥락 뒤로). 전역 `BottomNav` `HIDDEN_PREFIXES` 에 `/supporters` 추가.
- **b 현황·명단**(`944f2c7`): `/supporters` = 현황(통계 4카드 + 이번달 생일 + 통합발송). `/supporters/list` = 명단(`SupportersList` 목록 + 사진 썸네일).
- **c 등록·분석**(`4f306ad`): `SupporterForm` 자체 main/헤더 제거(layout 셸로 통합, `new`·`[id]/edit` 공용). `/supporters/insights` = AI 분석(`DomainInsightPanel domain="supporter_care"`).
- **d 상세 정리**(`4f306ad`): `/supporters/[id]` 이중 main/sticky 헤더 제거, layout 패딩 상쇄(`-mx-4 md:-mx-6` + 내부 `max-w-md`)로 풀폭 섹션 유지.

### 추가 개선
- **경로 맥락 뒤로가기**(`SupportersBack`): 수정→상세, 상세→명단, 주요 탭(현황·명단·등록·분석)→홈. 회계엔 없던 상세 화면 대응(회계는 "/" 고정이었음).

---

## 핵심 메커니즘 (다음 세션 필수)

**후원자 브랜치 구조**: `app/supporters/layout.tsx` 가 가드+헤더+`SupportersNav`(4탭) 셸. 하위 페이지(`page.tsx`=현황·`list/`·`new/`·`insights/`·`[id]/`·`[id]/edit/`)는 콘텐츠만. 타이틀은 `SupportersTitle`(pathname→섹션명; 상세=후원자·수정=수정), 절대 중앙. 헤더 우측 링크 = 메인홈·**회계관리**(회계는 메인홈·후원자관리 — 상호 대칭).

**폼·상세의 셸 통합**: `SupporterForm` 은 이제 `<div className="mx-auto max-w-md sm:max-w-2xl">` 콘텐츠만(자체 main/헤더 없음) — `new`·`[id]/edit` 둘 다 layout 셸 안. 상세 `[id]/page.tsx` 는 풀폭 섹션 디자인이라 layout px 를 `-mx-4 md:-mx-6` 로 상쇄하고 내부 `max-w-md` 로 중앙정렬.

**전역 BottomNav 숨김**: `components/BottomNav.tsx` `HIDDEN_PREFIXES = ['/login', '/p', '/accounting', '/supporters']`. 회계·후원자 각자 전용 4탭.

**파일 지도(후원자)**: `layout.tsx`·`SupportersNav.tsx`·`SupportersTitle.tsx`·`SupportersBack.tsx` / `page.tsx`(현황)+`BulkMailButton.tsx` / `list/page.tsx`+`SupportersList.tsx` / `new/page.tsx`+`SupporterForm.tsx` / `insights/page.tsx`(→`app/insights/DomainInsightPanel`) / `[id]/page.tsx`(+`DonationPanel`·`LogPanel`·`JournalLinkPanel`·`MessageActions`·`DeleteButton`)·`[id]/edit/page.tsx`. `actions.ts`(syncSupporter).

**SoT·노션 ID**: v2cj 와 동일(회계=노션 단방향 자동, 후원자=앱 SoT 노션 미러). 노션 DB id: 입출금 `37c15af9-28ad-817b-94da-c05e3f2e7e3a` · 항목 `37c15af9-28ad-811c-b32f-c7878db9b51f` · 자산 `37c15af9-28ad-81eb-a392-ce9226dcdbc7` · 후원자 `fe45d45f-c7c0-40ce-a329-525e46a83ef3`.

---

## 다음 작업
1. **실기 확인**(배포 4f306ad): 4탭 전환·활성강조 / 헤더 타이틀·링크·뒤로 / 현황 통계·생일·발송 / 명단 검색→상세 / 등록 폼 단독표시 / 상세 풀폭·수정·삭제.
2. 피드백 반영(있으면).
3. **버전 3.5.0(MINOR)**: 회계+후원자 분리 묶어 통합 제안(우진이 "버전" 꺼낼 때).
4. 데스크탑(`md:max-w-5xl`)에서 등록 폼·상세가 과하게 넓은지 점검 — 필요 시 내부 max-w 조정.

---

## 빌드·검증 함정 (변동 없음)
- worktree node_modules 없음 → 메인 심링크(`ln -sfn 메인/node_modules node_modules`) 후 tsc·build.
- ⚠️ **prettier 금지**(.prettierrc 없음 → 전체 오염). no-semi·single-quote.
- 회계·후원자 **마스터 가드 → preview 캡처 불가**(로그인 화면만). tsc+build+배포 후 실기로 갈음.
- 노션 write 는 curl + 메인 `.env.local` NOTION_TOKEN.
- 머지: worktree 커밋 → 메인 `merge --ff-only <branch>` → `push origin main`. (메인 작업트리에 우진의 비-앱 변경(flyers·scripts)이 상주 — 건드리지 말 것. ff 머지는 충돌 없음 확인됨.)
- **push 는 명시적 "push" 승인 필요**(자동 분류기도 차단). "추천대로"는 커밋·머지까지만.

---

## 백로그
1. **버전 3.5.0**: 회계+후원자 분리 묶어 MINOR.
2. ⚠️ 손경희 후원액 `14.29`(김영동 복사 추정) — 노션 `금액` 수정 시 앱 자동 정정.
3. 후원자 개별 AI 메시지(비용).
4. 동향 루틴 모니터.
5. 분석(회계 리포트) 추가 그래프(대분류 도넛·후원자 순위 바 등) 필요 시 강화.
6. 후원자 분석 탭(`supporter_care`) 초점 개선(insightPrompt.ts).

---

*작성: 2026-06-29 세션. 후원자 브랜치 분리(회계 패턴 복제) a~d 구현 완료 + 경로 맥락 뒤로가기. tsc 0·build 통과·push 4f306ad. 직전 v2cj→archive. 버전 3.4.0 유지(회계+후원자 묶어 3.5.0 예정).*
