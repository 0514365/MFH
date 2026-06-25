# MFH 핸드오프 v2cd (세션 종료)

> 이전: `v2cc`(후원자 관리 모듈 전체 신설 A~D + 노션 export + 우진 전용 게이팅). 이번 세션: **온두라스 동향(news-update) 최신성 개선** — 신뢰 출처 티어·분야별 최신성 차등·발행일(published_at)·안전 레이어·빈칸 처리. 앱 `3.2.0` → **`3.2.1`**(PATCH).

---

## 현재 위치 (한 줄)

**온두라스 동향 최신성 개선 완료**(출처 티어 + 정치·경제·사회 당일 강제 + San Pedro Sula·한인·안전 "새 소식만" + 발행일 배지). 실데이터 검증 완료, `3.2.1` 푸시(`7693ed2`). **다음 = 후원자 실기 1차 점검 → 3.3.0**(v2cc에서 이월, 최우선).

---

## 이번 세션 여정 (연구 → 설계 → 구현 → 검증)

1. **출처 연구**(WebSearch 11회): 온두라스 언론 환경(3대지 OPSA·정치엘리트 소유 편향) · San Pedro Sula(La Prensa 본사, `laprensa.hn/sanpedro`·`elpais.hn` 전용섹션) · **한인 약 280명·한인회 2021부터 휴면**(→ 매일 소식 없는 게 정상) · 영문 안전 출처(OSAC·ReliefWeb·US Embassy = 선교사 직결).
2. **설계 확정**(D1~D5): 티어 화이트리스트 + 분야별 최신성 차등 + 빈칸 허용(안내+안전레이어 대체) + published_at + 영문 안전 레이어.
3. **구현 ⓐ 생성**: `news-pull.ts`(작업지시서 V2 — 티어·차등·발행일·안전), `news-push.ts`(published_at 통과·검증), `news-update.md`(절차 동기화).
4. **구현 ⓑ 표시**: `BriefingView.tsx` V3(발행일 배지 `오늘/어제/N일전` · 빈 highlights 안내 · 안전 tag). **DB 스키마 무변경**(jsonb 수용).
5. **실데이터 검증**: `/news-update` 실행 → 새 동작 4가지 실증(발행일 null/날짜 정규화 · 안전 tag 저장 · 한인 빈칸 · culture 0). 빌드 통과 → 커밋 `7693ed2` 푸시.

---

## 핵심 메커니즘 (다음 세션 필수 이해)

**신뢰 출처 5티어**(WebSearch `allowed_domains` 로 사용): T1 현지 실시간(proceso/laprensa/tiempo/hch/elheraldo/latribuna/elpais) · T2 탐사(contracorriente/criterio) · 영문 교차(elfaro/insightcrime/ticotimes/aljazeera) · 영문 안전(osac/hn.usembassy/travel.state/reliefweb) · 한인(overseas.mofa.go.kr). ※3대지 편향 인지 → 교차확인 우선.

**분야별 최신성 차등(이 개선의 핵심)**: 정치·경제·사회 = 발행일 **72h(불가피 7일) 이내만** — 오래된 기사 금지. 문화 = 7일 내, 없으면 생략. San Pedro Sula 7일 · 한인 14일 · 안전 = 신규/갱신 경보만. **새 소식 없으면 비운다**(억지 채움 금지) — 이게 "지난 기사가 최신처럼 올라오던" 문제의 해결.

**발행일(published_at)**: 각 item 의 `published_at`("YYYY-MM-DD"), `sections`/`highlights` **jsonb 안에** 저장(스키마 무변경). `news-push` 가 `isDate` 검증 → 형식 아니면 `null`. `BriefingView.relDay()` 가 brief 날짜 대비 `오늘/어제/N일전(13일)/M·D` 배지로. 불명(null)이면 배지 없음.

**안전 레이어**: `highlights` 의 `tag="안전"` 으로 통합(별도 컬럼·박스 없음). San Pedro Sula·한인 빈칸의 더 나은 대체물(OSAC·ReliefWeb·US Embassy 신규 경보). 박스 제목 = "주목 · San Pedro Sula · 한인 · 안전".

**빈 highlights 처리**: 셋 다 없으면 — 최신 페이지(`latest`)만 "최근 새 소식 없습니다 · 지난 동향 보기"(점선 안내 + `/honduras/archive` 링크). 지난 동향(`!latest`)은 숨김.

---

## 다음 세션 (예정 — 우선순위)

1. **후원자 실기 1차 점검** → 오류 수정 → **버전 3.3.0** 승격(v2cc 이월, 우진 계정 전용 — 최우선).
2. **news-update 실사용 관찰**: 다음 06:00 자동 루틴/수동 호출에서 발행일 추정 정확도·티어 충분성 모니터(필요 시 도메인·임계값 조정).
3. **노션 회계 구축(우진 장기)** → 후원자/헌금 SoT 이전.
4. (보류) 오프라인 3단계 — v2bv 부터 이월.

---

## 빌드·검증 함정

- **온두라스 페이지는 멤버(부부) 읽기** — 로그인 후 페이지라 preview 캡처 불가. 검증은 `tsc` + `npm run build` + 실데이터(`/news-update`) + 우진 실기.
- **WebSearch `allowed_domains`**: `reuters.com`·`apnews.com` 은 Anthropic 크롤러 차단(400 에러) — 영문 교차는 elfaro/insightcrime/ticotimes/aljazeera 위주로. 한인은 도메인 제한 없이 검색(소식 희소).
- **같은 날 재실행 = 새 행 누적**(patch90 multi, "날짜 (N)" 넘버링). 이번 검증으로 06-24 에 1행 추가됨(실데이터, 앱 최신 반영).
- **DB 스키마 무변경**: published_at·안전 tag 모두 기존 jsonb 안 — 우진 콘솔 SQL 실행 불필요.
- Dropbox dev stale → build 로 검증([[mfh-dropbox-dev-hmr-stale]]).
- push 규칙: 우진이 명시적으로 "푸시" 할 때만.

---

## 백로그
1. 후원자 1차 점검 → 3.3.0 (최우선).
2. news-update 실사용 모니터(발행일 추정·티어 보강).
3. 노션 회계 구축 + 후원자/헌금 연동(장기).
4. 후원자 개별 AI 메시지 초안(후속, 비용).
5. (보류) 오프라인 3단계.

---

## 워킹트리 메모 (앱 라인 무관, 그대로 둠)
- `flyers/dongsan-2026-07/` — 동산교회 전단지(앱 외). `_slim_frame.py` 포함.
- `scripts/measure-usage.ts` — 임시.

*작성: 2026-06-24 세션 종료. 온두라스 동향(news-update) 최신성 개선 — 신뢰 출처 5티어(allowed_domains)·분야별 최신성 차등(정치·경제·사회 72h)·발행일(published_at, jsonb 무변경)·영문 안전 레이어(tag "안전")·빈칸 안내. ⓐ 생성(news-pull/push·스킬) + ⓑ 표시(BriefingView V3). 실데이터 검증(발행일·안전tag·한인빈칸·culture0 실증). 커밋 `7693ed2` main 푸시. 앱 3.2.0 → 3.2.1(PATCH). 직전 `v2cc` → `docs/archive/`. 다음 = 후원자 실기 1차 점검 → 3.3.0(최우선).*
