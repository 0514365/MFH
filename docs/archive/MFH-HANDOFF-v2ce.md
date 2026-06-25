# MFH 핸드오프 v2ce (세션 종료)

> 이전: `v2cd`(온두라스 동향 최신성 개선). 이번 세션: **노션 회계 시스템 구축 — 후원금(수입) 라인 SoT 이전 완료**. ABC 가계부 노션 템플릿을 MFH 선교 회계로 개조, 후원자/헌금/계좌를 노션으로 이전. 앱 `3.2.1` 유지(회계 완성 시 3.3.0).

---

## 현재 위치 (한 줄)

**노션 회계 — 후원금 라인 완성**(후원자 8명 + 헌금 8건 $11,413.95 + 우리은행 입금 + USD 잔액). 지출 항목·계좌 구조 준비됨(데이터는 추후). **다음 = 앱 A방향 동기화 + D3 이체·환전(내역 생기면) → 3.3.0**.

---

## 이번 세션 — 노션 회계 구축

ABC 가계부 노션 템플릿("MFH 회계관리 시스템", page `37c15af9-28ad-8030-93e4-e0c3740f1680`)을 MFH 선교 회계로 개조 + 후원자/헌금 SoT 이전. 예시 입출금 데이터는 우진이 노션 UI 에서 비움.

**SoT 방향(확정 — A방향)**: 앱=후원자 주인, **노션=헌금/회계 주인**. 헌금은 이제 **노션에만 입력**, 앱은 추후 노션 합계 읽기(미구현). 양방향 동기화 X(spec `MFH-SUPPORTERS-NOTION-SYNC.md`).

**집계 통화 = USD**(온두라스 활동·달러 송금 기준, 앱 `amount_usd` 와 정합).

### 노션 구축 결과
1. **후원자 DB 신설**(`collection://96cb5d60-2cb3-424c-9296-31e9095338fc`): 17컬럼 + `앱ID`(=supporters.id 매핑키) + `헌금` relation + `헌금합계` rollup(sum). 후원자 8명 이전.
2. **입출금기록 개조**(`collection://37c15af9-28ad-817a-a360-000b137b8b1e`): 이중통화(`통화` KRW/USD/HNL · `원금` · `환율`) + `후원자` relation(DUAL "헌금") + `금액` USD 포맷. 헌금 8건 이전(수입, 후원자·"후원금"항목·입금계좌 연결). 총 **$11,413.95**(김영동 정기 6 + 이우현 일시 + 최남종 교회건축).
3. **자산(계좌)**(`collection://37c15af9-28ad-8110-a402-000b0ce47950`): `통화` 컬럼 추가. 3계좌 — 우리은행(KRW, 1002-349-524757, 후원금수령) · Ficohsa(달러)(USD, 200021214743) · Ficohsa(렘피라)(HNL, 200013388325). `입금합USD`/`출금합USD` rollup + `잔액(USD)` formula(=입금합−출금합). 헌금 8건 입금계좌=우리은행.
4. **항목**(`collection://37c15af9-28ad-8111-89fa-000b146f3190`): 수입 "후원금" 1 + 지출 9(사역비·생활비·주거·차량·통신·의료·자녀교육·수수료·행정/기타).

### 앱 변경
- 헌금 JSON export 추가(`lib/supporters.ts` `donationsToJSON` — supporter_app_id 매핑 + 통화·원금·환율·환산). `SupportersExport.tsx` "헌금 JSON" 버튼, `page.tsx` 헌금 전체 로드. 커밋 `8bb224e` push·배포.

---

## 핵심 메커니즘 (다음 세션 필수)

**자금 흐름**: 후원금 → 우리은행(KRW) → [환전·송금] → Ficohsa(달러)(USD) → [환전] → Ficohsa(렘피라)(HNL) → 현지 지출.

**이중통화 기록**: 입출금기록 `통화`(KRW/USD/HNL) + `원금`(받은 통화) + `환율` + `금액`(USD 환산, 집계 기준). KRW: 금액=원금/환율. USD: 금액=원금.

**매핑 키**: 헌금/후원자 모두 app_id(supporters.id)로 노션 연결. 앱 export(후원자 JSON / 헌금 JSON, `/supporters` 상단) → 내가 노션 등록(create-pages, app_id 로 upsert).

**relation 입력 형식(노션 MCP)**: create-pages/update-page `properties` 에서 relation = page URL 의 JSON array string `["https://app.notion.com/p/..."]`. 날짜 = `date:컬럼명:start`. checkbox = `__YES__`/`__NO__`. select = 옵션명 문자열.

---

## 다음 세션 (우선순위)

1. **앱 A방향 동기화** — ①앱 헌금입력 비활성/안내(노션이 SoT) ②앱이 Notion API 로 후원자별 헌금합계 읽어 표시(읽기 전용). Vercel 환경변수에 Notion 통합 토큰 + 후원자/입출금기록 DB id.
2. **D3 이체·환전** — 우리은행→Ficohsa 송금·환전(통화 변환). ABC "이체" 구분 활용. **현재 환전 내역 없음** → 내역 생기면 설계.
3. **D5 잔액 표시 마무리** — `잔액(USD)` formula 추가됨. 노션 UI 에서 컬럼 숫자형식 '달러'로(또는 ABC 기존 `잔액`/`잔액_표시` ₩ formula 정리 — 코드는 노션 UI 에서만 확인 가능).
4. **ABC 예시 정리** — 항목·자산의 ABC 기본 예시(식비·월급·예시계좌 등) 노션 UI 에서 삭제(우리은행/Ficohsa·MFH 항목만 남김).
5. 회계 완성 시 **3.3.0** 승격(우진: "노션 회계 구축까지 완료되면 3.3").

---

## 빌드·검증 함정

- **노션 데이터 조회 API = Business plan+ 필요**(`query_data_sources` 400). row 일괄 조회/삭제는 **노션 UI**. fetch 는 스키마+개별 페이지만, formula/rollup 값은 `<omitted/>`(노션 UI 에서 확인).
- **노션 formula 2.0**(`prop().map().sum()`)은 update-data-source 에서 `Type error`. relation 합산은 **rollup 먼저 생성 → 별도 statements 로 formula 참조**(같은 호출 내 새 컬럼 참조 불가).
- **select 옵션 추가**(`ALTER COLUMN "통화" SET SELECT(...)`): 기존 옵션 url id 보존됨(이름 매칭) → 기존 row 값 안 깨짐(KRW/USD 검증 완료, HNL 추가).
- 앱 `/supporters` 는 마스터 전용 로그인 → preview 캡처 불가, `tsc`+`npm run build` 로 검증.
- push 규칙: 우진 명시 "push" 시만(이번 `8bb224e` 푸시 완료).

---

## 백로그
1. 앱 A방향 동기화(헌금입력 비활성 + 노션 합계 읽기) — Notion API.
2. D3 이체·환전(다통화 자금이동).
3. 지출 데이터 입력(노션 SoT, 우진 직접).
4. ABC 예시 정리 + 잔액 표시 포맷.
5. news-update 실사용 모니터(v2cd 이월).
6. 후원자 개별 AI 메시지(후속, 비용).
7. (보류) 오프라인 3단계.

---

## 워킹트리 메모 (앱 라인 무관, 그대로 둠)
- `flyers/dongsan-2026-07/` — 동산교회 전단지(앱 외). `_slim_frame.py` 포함.
- `scripts/measure-usage.ts` — 임시.

*작성: 2026-06-24 세션. 노션 회계 구축 — ABC 가계부 노션 템플릿을 MFH 선교 회계로 개조. 후원금(수입) 라인 SoT 이전 완료: 후원자 8명·헌금 8건($11,413.95)·우리은행 입금·USD 잔액. 자산 3계좌(KRW/USD/HNL)·지출 항목 9 골격. 앱 헌금 export 추가(`8bb224e` push). SoT=노션(A방향), 집계 USD. 다음=앱 A방향 동기화 + D3 이체 → 3.3.0. 직전 `v2cd` → `docs/archive/`.*
