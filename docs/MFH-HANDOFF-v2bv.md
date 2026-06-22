# MFH 핸드오프 v2bv (세션 종료)

> 이전: `v2bu`(사진 최적화 1단계). 이번 세션: **오프라인 2단계(읽기) 완성** — 단, **1차 구현이 실기기에서 깨져 롤백 후 정적 폴백 방식으로 재구현**했다. 앱 `3.2.0`. 실기기 비행기모드 검증 완료(우진 확인).

---

## 현재 위치 (한 줄)

온두라스 인터넷 대응 3단계 로드맵 중 **2단계(오프라인 읽기) 완료·배포·실기기 검증**. 남은 건 3단계(쓰기+동기화).

---

## 이번 세션 여정 (실패·교훈 포함 — 반드시 읽을 것)

1. **1차 시도**(커밋 `5b6e377` 2a + `c59c1b9` 2b): `/offline` 을 **React 라우트**로 만들고 SW V5 앱셸캐싱 + IndexedDB. 로컬 빌드·dev 검증 통과 → push.
2. **실기기 실패**: 비행기모드 접속 시 `Application error: a client-side exception`. **원인** = `/offline`(React)이 JS 청크에 의존하는데, 사용자가 온라인에서 그 경로를 연 적이 없어 청크가 캐시에 없음 → 오프라인에서 청크를 못 받아 깨짐. **dev 검증 맹점**: 검증 중 내가 `/offline` 을 직접 열어 청크가 우연히 캐시돼 버그가 숨었다.
3. **전체 롤백**(커밋 `39140d8`) → prod 즉시 복구(우진 "잘됨" 확인).
4. **재구현**(커밋 `b07cc6a`): `/offline` 을 **순수 정적 self-contained HTML(`public/offline.html`)** 로 교체. 인라인 CSS/JS, **외부 의존 0**(청크·폰트·이미지 참조 없음). SW 가 이 HTML 하나만 precache → navigate 실패 시 폴백. **정적이라 dev=prod 동일** → 청크 실패 모드 원천 차단. 검증: offline.html 외부의존 0 / SW precache 확인(캐시 HTML 에 `/_next/` 0) / IndexedDB 읽기 렌더 / 콘솔 에러 0 / **실기기 비행기모드 OK**.

---

## 구조 (현재 배포본 = `b07cc6a`)

- **`public/offline.html`**: 정적 폴백. IndexedDB(`mfh-offline`)를 인라인 vanilla JS 로 직접 읽어 최근 일지·할일·썸네일·저장시각 표시. 색은 palette 값 하드코딩(정적이라 CSS 변수 경로 못 탐).
- **`public/sw.js` V5**: install precache `/offline.html`, navigate network-first→`/offline.html` 폴백, 정적 cache-first, api/교차출처 미관여. ★navigate 는 `fetch(req)` 그대로(V3 회귀 방지). 캐시명 `mfh-cache-v5`.
- **`lib/offlineStore.ts`**: IndexedDB 래퍼(`kv`: journals/tasks `{items,savedAt}`, `thumbs`: path→Blob). **스키마를 `offline.html` 의 reader 와 반드시 일치 유지**(둘 중 하나 바꾸면 같이).
- **`components/OfflineSync.tsx`**: 온라인 시 일지/할일 페이지가 데이터 백업(렌더 없음, 마운트 1회).
- **`app/journal/page.tsx`**: 최근 30 일지 + 대표 썸네일 백업. **`app/tasks/page.tsx`**: 미완료 할일 백업.

## 핵심 메모 / 교훈

- **PWA 오프라인 폴백 = 정적 self-contained HTML.** Next/React 라우트는 청크 의존이라 미방문 경로가 오프라인에서 깨진다. (메모리 `pwa-offline-fallback-static-html` 에도 저장)
- **검증 함정**: SW/오프라인은 "해당 경로 **미방문** 상태 + 네트워크 차단"으로 검증해야. 검증 중 그 페이지를 열면 청크가 캐시돼 버그가 숨는다. dev 도구로 진짜 네트워크 차단 시뮬 불가 → **실기기 최종 확인 필수**.
- **오프라인 작동 전제(사용자 안내)**: 온라인에서 ①앱 한 번 열기(SW 설치+`offline.html` precache) ②일지·할일 화면 한 번씩 열기(IndexedDB 적재). 그 후 비행기모드에서 열람됨. ①②를 건너뛰면 오프라인에서 빈 화면(정상).

## 다음 세션 (예정)

택1: **오프라인 3단계(쓰기+동기화)** — 작성 큐 → 복구 시 자동 업로드(가장 복잡). 또는 **실제 6월말 발송호 제작**(v2bs 이월, 단기팀 7/1).

## 백로그
1. 오프라인 3단계(쓰기+동기화).
2. 첨부 이미지(할일·프로젝트) 썸네일 확장(v2bu 이월).
3. (v2bs 이월) 실제 6월말 발송호 · `news-update.md` url 안내 · 인사이트 상세/온두라스 동향/사진/캘린더/중보 화면 리프레시.

*작성: 2026-06-22 세션 종료. 오프라인 2단계 읽기(3.2.0) — 1차 실패(React 라우트 청크 의존)→롤백→정적 `offline.html` 재구현 성공. 실기기 비행기모드 검증 완료. 직전 `v2bu` → `docs/archive/`.*
