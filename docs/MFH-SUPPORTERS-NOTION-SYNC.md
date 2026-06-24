# MFH 후원자 ↔ 노션 연동 스펙

> 작성 2026-06-24. 후원자 모듈 ↔ 노션 회계 시스템 연동 설계. 단계적 구축용 참조 문서.

## 1. 방향 (SoT — 데이터 주인)

- **앱 = 후원자 주인**: 정보·관계 히스토리·기도제목·일지 연계·AI 관계관리(supporter_care).
- **노션 = 헌금/회계 주인**: 헌금 입력·예산·대시보드·리포트. (장기 구축 — 현재는 ABC 가계부 템플릿만 다운로드된 상태)
- 앱의 헌금 입력(supporter_donations·DonationPanel·통계)은 **과도기 기록 수단**. 노션 회계 구축이 끝나면 SoT 를 노션으로 이전하고, 앱은 후원자별 헌금 합계를 노션에서 **읽어 표시**하는 쪽으로 전환한다.
- 양방향 실시간 동기화는 충돌·중복·삭제전파 위험으로 채택하지 않는다. **앱 → 노션 단방향(후원자) + 노션 → 앱 읽기(헌금 합계)** 가 기본.

## 2. 매핑 키

- 앱 `supporters.id` (UUID) ↔ 노션 후원자 DB **"앱ID"(text)** — 1:1.
- 동기화는 app_id 로 **upsert**(있으면 갱신, 없으면 생성) → 중복 방지.

## 3. Export 형식 (현재 구현됨)

- 위치: `/supporters` 목록 상단 **"노션 연동용 내보내기"** (`app/supporters/SupportersExport.tsx`).
- **CSV**: 한글 헤더 + UTF-8 BOM → 노션 수동 import 시 컬럼 자동 매칭, 엑셀 한글 안 깨짐.
- **JSON**: 영문 키 → 향후 Notion API 동기화용.
- 직렬화: `lib/supporters.ts` 의 `supportersToCSV` / `supportersToJSON`.

## 4. 노션 후원자 DB 컬럼 (구축 시 이대로 생성)

| 노션 컬럼 | 타입 | 앱 필드 (JSON 키) |
|---|---|---|
| 이름 | title | name |
| 앱ID | text | app_id (= supporters.id) |
| 생년월일 | date | birth_date |
| 첫만남 | date | first_met_date |
| 소속 / 직분 / 지역 | text | affiliation / role / region |
| 전화 / 이메일 / SNS | text(또는 phone·email) | phone / email / sns |
| 소개자 | text | referrer |
| 정기후원 | checkbox | is_recurring |
| 정기통화 | select (KRW / USD) | recurring_currency |
| 정기금액 | number | recurring_amount |
| 기도제목 / 메모 | text | prayer_points / notes |
| 활성 | checkbox | is_active |
| **입출금기록** | relation → 입출금기록 DB | (노션 헌금이 후원자를 참조) |

→ 노션 입출금기록(헌금)에서 후원자를 **relation 으로 선택**하면, 후원자별 헌금 집계가 노션에서 자동 계산된다.

## 5. 연동 절차 (현재 → 장기)

1. **(현재)** 앱에서 후원자 CSV/JSON export → 노션 후원자 DB 에 import.
2. **(장기)** 노션 입출금기록에 후원자 relation 컬럼 추가 → 헌금 입력 시 후원자 선택.
3. **(장기)** 앱 → 노션 자동 동기화: Notion API integration token + 후원자 DB id 를 Vercel 환경변수로. 후원자 신규/변경 시 app_id 로 upsert.
4. **(선택)** 앱이 후원자별 헌금 합계를 노션에서 읽어 후원자 상세에 표시(읽기 전용).

## 6. 주의 / 미해결

- **통화**: 앱은 KRW/USD. 노션 입출금기록 금액은 원(won) 정수. USD 후원금을 노션에 넣을 때 환산 정책(입금 시점 환율)을 노션 구축 시 확정.
- **은행 자동연동은 노션 기능이 아님**. 필요 시 별도 도구(오픈뱅킹 가계부·엑셀). 노션은 수동입력/API.
- 노션 무료 플랜도 integration API 사용 가능(자동 동기화 시).
