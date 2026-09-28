# MFH 핸드오프 v2dj (세션 종료)

> 이전: `v2di`(아이패드 탭바 고정 수정 · 3.6.0). 이번 세션(2026-09-27): **새 메뉴 "Bible" — 성경 읽기·단어 검색·번역 비교(`/bible/study`)** 신설(LOGOS 앱 UI 참고). 앱 버전 **3.6.0 유지**(MINOR 후보 `3.7.0`, "버전" 요청 시 검토).

---

## 현재 위치 (한 줄)
**`/bible/study` 2패널 리더 + 찾기 시트(구절·내용·최근·즐겨찾기) 완성·로컬 실측 검증·patch106 실행 완료.** 다음 = 실기기(폰·아이패드 가로세로) 확인 → 피드백 반영.

---

## 이번 세션 변경

| 파일 | 내용 |
|---|---|
| `app/bible/study/page.tsx` **V1** | 서버 껍데기. 로그인 필수, 초기 버전 = 쿠키 `bible_ver`, `?ref=요 3:16` 진입 지원 |
| `app/bible/study/StudyClient.tsx` **V1** | 2패널 본체. 연결(🔗) 토글·1단/2단 토글·찾기 시트. 배치 = `portrait:` 위아래 / `landscape:`·`lg:` 좌우. 상태 localStorage |
| `app/bible/study/Pane.tsx` **V1** | 패널 1개: 버전 select · 책장 버튼(→찾기) · ☆ · ‹ › · 자체 스크롤. 최상단 절 감지 → `onTopVerse`, 부모가 다른 패널 `scrollToVerse`(250ms 순환 잠금) |
| `app/bible/study/FinderSheet.tsx` **V1** | LOGOS 식 시트(모바일 하단 · ≥740px 중앙). 구절(입력 파싱 + 66권 색상 그리드→장→절→실행) · 내용(단어 검색 AND, 100건 페이지, 하이라이트) · 최근 20 · 즐겨찾기 |
| `app/bible/study/chapterCache.ts` · `storage.ts` | 장 캐시(in-flight 공유·앞뒤 prefetch) / localStorage(패널 상태·최근·즐겨찾기) |
| `app/api/bible/chapter/route.ts` **V1** | `?ver=&seq=` 한 장 조회, 미비 시 개역개정 폴백(`served`) |
| `app/api/bible/search/route.ts` **V1** | `?q=&ver=&scope=all\|ot\|nt\|book:N&offset=` ilike AND 검색(최대 5단어, 100건, count exact) |
| `lib/bible/ref.ts` **V1** | seq↔책장, `parseRefInput`(한글 정식·약어·영문 약어), 책 묶음 색(`BOOK_GROUPS`), `parseScope`, `stripHeadings` |
| `components/VerseText.tsx` **V3** | 소제목 19/20px(본문보다 크게, 우진 요청) + `highlight` 옵션(`<mark>`) · `markText` export |
| `components/ModuleIcon.tsx` **V2** · `app/page.tsx` | `bible` 아이콘 · 홈 타일 **Bible**(Facebook 옆). Portfolio 는 lg 전폭, lg 행 템플릿 `1fr_1fr_1fr_auto_auto` |
| `supabase/patch106-bible-search-index.sql` | pg_trgm GIN 인덱스 — **실행 완료(09-27)**. 인덱스 전 검색 약 2.7초 |

## 검증(로컬 dev, 로그인 후 실측)
- 데스크탑 좌우 / 375×812 위아래 / 812×375 좌우 전환 · 연결 스크롤 절 동기 · 찾기(창 3:16) · 검색("사랑 하나님" 115건 → 신 6:5 이동+하이라이트) · 홈 타일 · 소제목 20px.
- `npx tsc --noEmit | grep -v "^docs/bible-qt-kit"` 통과.

## 다음 과제
1. 실기기 확인: 아이패드 가로/세로 전환 시 패널 배치, 연결 스크롤 체감, 찾기 시트 높이. 피드백 반영.
2. 후보 개선: 무한 스크롤(장 경계 넘김) · 패널별 글꼴 크기 · 즐겨찾기 DB 동기화 · QT/통독에서 `/bible/study?ref=` 링크.
3. (v2di 이월) letter 프롬프트 관찰 · 9월호 제작 · 인사 카드 kind 토글 UI · 회계 계좌 후속.

## 유의 사항
- **PWA 서비스워커 캐시**: dev 에서 수정본이 안 보이면 SW 해제 + `caches` 삭제(배포본은 해시 파일명이라 무관).
- **Dropbox 가 `.next/` 를 동기화**해 "충돌된 사본" 파일이 생김 — `.next` 동기화 제외 권장(별도 작업).
- 빌드 잡음: 미커밋 `docs/bible-qt-kit/` 때문에 `npx tsc` 는 grep 필터 필요(v2di 와 동일).
- 미커밋 잔여물(그대로 둠): `flyers/dongsan-2026-07/`, `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts`, `docs/bible-qt-kit/`, `letter-templates/assets/2026추석.heic`.
- 핸드오프 아카이브: `v2di` → `docs/archive/` 이동.
