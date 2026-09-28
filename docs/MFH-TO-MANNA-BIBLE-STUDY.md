# MFH → MANNA 이관: 「Bible」 성경 읽기·단어 검색·번역 비교(`/bible/study`) + 소제목 확대

> 작성 2026-09-27 (MFH v2dj, 앱 3.6.0, 커밋 `a6b1891`). MFH 에 구현·실측 검증한 **LOGOS 식 2패널 성경 리더**를 Manna 앱에 동일하게 구현하기 위한 인수인계 자료.
> 두 repo 는 같은 Dropbox 폴더(`…/Dropbox/MFH`, `…/Dropbox/Manna`)에 있어 Manna 세션이 `../MFH/...` 를 **직접 읽을 수 있다.** 코드는 복사본을 두지 않고 경로로 가리킨다(이 문서가 정본, 코드는 MFH 파일이 정본).
> 같은 문서를 `Manna/docs/MFH-TO-MANNA-BIBLE-STUDY.md` 에 복사해 둔다(Manna repo 커밋은 Manna 세션에서).
> 역방향 이관 문서 `MANNA-TO-MFH-BIBLE-TEXTS.md`(09-25)의 후속 — `bible_texts`·통독 「본문 읽기」·QT 접이식은 이미 두 앱에 동일하게 있다는 전제.

---

## 0. 한눈에

| 블록 | 무엇 | MFH 정본 | Manna 에서 할 일 |
|---|---|---|---|
| ① 소제목 확대 | `VerseText` 소제목을 본문보다 크게(19px, 태블릿+ 20px) + `highlight`(검색어 `<mark>`) 옵션 + `markText` export | `components/VerseText.tsx` **V3** | `components/VerseText.tsx` **V3** 로(§2). 통독 `/bible/read`·QT 접이식에 자동 반영 |
| ② 공용 유틸 | seq↔책·장, 구절 입력 파싱, 66권 묶음 색, 검색 범위 | `lib/bible/ref.ts` **V1** | 그대로 복사(의존: `lib/bible/data.ts`·`texts.ts` — 두 앱 동일) |
| ③ API | 한 장 조회(폴백) · 단어 검색(AND·100건) | `app/api/bible/chapter/route.ts` · `app/api/bible/search/route.ts` | `app/api/bible/{chapter,search}/route.ts`. 인증만 Manna 식(§3) |
| ④ 화면 | 2패널 리더 + 찾기 시트 + 캐시·저장 | `app/bible/study/{page,StudyClient,Pane,FinderSheet,chapterCache,storage}.tsx\|ts` | `app/(app)/bible/study/` 로. 레이아웃·토큰 치환(§4) |
| ⑤ 메뉴 | 홈 타일 "Bible" | `app/page.tsx` 타일 + `ModuleIcon` `bible` | Manna 는 네비 구조가 달라 **진입점 결정 필요**(§5 결정 테이블) |
| ⑥ SQL | 검색 속도용 pg_trgm GIN 인덱스 | `supabase/patch106-bible-search-index.sql` | `supabase/patch13-bible-search-index.sql`(§6) 콘솔 실행. 없어도 동작(약 2.7초 → 즉시) |

MFH 에서 실측 확인된 동작: 데스크탑 좌우 / 폰 세로 위아래 / 폰 가로 좌우, 연결 스크롤 절 동기, 찾기(창 3:16), 검색("사랑 하나님" 115건 → 이동+하이라이트), `?ref=요 3:16` 진입.

---

## 1. 전제·가드레일 (반드시 유지)

- 본문 노출 범위는 기존과 같다: **로그인 활성 회원 전용**(`bible_texts` RLS `is_active()`), 공개 URL 금지. 새 API 2개도 세션 확인 + RLS 이중 방어.
- 화면 하단 문구 「<버전명> · 내부 열람용」 유지(패널 하단에 있음).
- 검색은 `bible_texts.body` 그대로 `ilike` — 소제목(`<…>`)도 검색에 걸린다. 결과 표시는 `stripHeadings` 로 소제목 제거.
- 최근·즐겨찾기·패널 상태는 **localStorage(기기별)**. DB 저장 없음(추후 필요 시 별도 패치).
- 원자료·시딩은 손대지 않는다(patch10 그대로).

---

## 2. ① 소제목 확대 — `components/VerseText.tsx` V3

MFH `components/VerseText.tsx` 를 기준으로 Manna 파일에 세 가지를 반영한다(Manna V2 대비 diff).

| 항목 | Manna V2(현재) | 적용할 값 |
|---|---|---|
| 소제목 `HEADING_CLS` | `mb-1 mt-2 text-[14.5px] … text-primary first:mt-0` | `mb-1.5 mt-4 text-[19px] font-bold leading-snug text-primary first:mt-0 md:text-[20px]` |
| 본문 기본 | `text-[17.5px] leading-[1.85] text-ink md:text-[18px]` | 그대로(소제목 > 본문이면 됨) |
| 새 export | 없음 | `markText(text, highlight?)` — 검색어 배열을 `<mark class="rounded-sm bg-[#FFE58F] px-0.5 text-inherit">` 로 감쌈(대소문자 무시, 정규식 이스케이프) |
| 새 prop | 없음 | `highlight?: string[]` → 본문 조각 `<span>` 안에서 `markText(text, highlight)` |

- MFH 는 `min-[740px]:` 브레이크포인트를 쓰지만 Manna 는 `md:` 규칙이므로 위처럼 치환.
- 마커: `// MANNA-VERSE-TEXT-V3 — 소제목을 본문보다 크게(19/20px) + highlight 옵션(/bible/study 검색용)`.
- 통독 `/bible/read`·QT `PassageAccordion` 은 VerseText 를 공유하므로 **추가 수정 없이** 소제목이 커진다. 우진 확인 사항: "소제목 폰트를 성경 본문보다 크게"(09-27, MFH 에서 승인·검증됨).

---

## 3. ②③ 유틸·API

### `lib/bible/ref.ts` (그대로 복사)
- `bookOfSeq(seq)` · `MAX_SEQ` · `locLabel` · `chapterLabel` · `findBook`(한글 정식·약어, 영문 약어 일부) · `parseRefInput("요 3:16" | "요한복음 3" | "요3:16" | "1 John 3:16")` · `BOOK_GROUPS`(율법·역사·시가·대선지·소선지·복음·행전·서신·공동서신·계시 + 배경/글자색) · `groupOf` · `SearchScope`/`parseScope` · `stripHeadings`.
- 의존: `./data`(BIBLE_BOOKS)·`./texts`(chapSeqOf) — 두 앱 동일. 마커만 `MANNA-BIBLE-REF-V1` 로.

### `app/api/bible/chapter/route.ts`
- `GET ?ver=esv&seq=1000` → `{ served, seq, verses[] }`. 요청 버전에 그 장이 없으면 `nkrv` 폴백(`served` 로 표시). `Cache-Control: private, max-age=3600`.
- **Manna 치환**: 인증을 MFH 의 `supabase.auth.getUser()` 대신 Manna `passage/route.ts` V1 과 같은 `getSessionProfile()` + `profile.status === 'active'` 로.

### `app/api/bible/search/route.ts`
- `GET ?q=사랑 하나님&ver=nkrv&scope=all|ot|nt|book:43&offset=0` → `{ total, offset, limit:100, rows[] }`.
- 단어 최대 5개, 각 단어 `ilike '%w%'` 체인(AND), `%`·`_`·`\` 이스케이프, 2자 미만 400. 정렬 `chap_seq, verse`, `count: 'exact'`.
- 인증 치환은 chapter 와 동일.

---

## 4. ④ 화면 — `app/(app)/bible/study/`

MFH 6개 파일을 옮기되 아래 치환표만 적용하면 된다. 각 파일 첫 줄 마커에 이관 근거를 적는다(예: `// MANNA-BIBLE-STUDY-PANE-V1 — MFH Pane V1 이식(docs/MFH-TO-MANNA-BIBLE-STUDY.md)`).

| 파일 | 역할 | Manna 치환 |
|---|---|---|
| `page.tsx` | 서버 껍데기. 로그인·쿠키 `bible_ver`·`?ref=` 파싱 → `StudyClient` | `redirect('/login')` 대신 `requireActive()`. `import '../../p/portfolio-theme.css'` 줄 **삭제**(MFH 전용 테마) |
| `StudyClient.tsx` | 2패널 본체·연결·1단/2단·찾기 시트·저장 | ① `PageHeader` → Manna `PageHeader`(`title="성경"`, `right={…}` 슬롯에 🔍·연결·1단 버튼). ② 높이: MFH 는 `calc(100dvh - 76px - env(safe-area-inset-bottom))`(하단 탭 76px). Manna 는 AppShell 3레이아웃이라 **모바일(<md)만 하단 탭 높이를 빼고 md+ 는 `100dvh - 상단 여백`** 으로(AppShell 실제 높이 확인 후 결정). ③ 컨테이너 폭 클래스는 Manna `Page`(`wide`) 규칙으로 |
| `Pane.tsx` | 패널 1개(버전 select·책장 버튼·☆·‹ ›·연결 스크롤) | 토큰만 확인(§4-1). 로직 변경 없음 |
| `FinderSheet.tsx` | 찾기 시트 4탭 | `min-[740px]:` → `md:`. 토큰 확인 |
| `chapterCache.ts` · `storage.ts` | 장 캐시 / localStorage | 그대로. localStorage 키는 `manna.bible.study.*` 로 바꿔 두 앱 혼동 방지 |

### 4-1. Tailwind 토큰 대응 (MFH → Manna)
두 앱 `tailwind.config.ts` 의 `colors` 는 대부분 같다. 사용된 클래스 점검 결과:

| MFH 클래스 | Manna | 비고 |
|---|---|---|
| `bg-primary` `text-on-primary` `border-primary` `text-primary` | 동일 | |
| `bg-accent-soft` `text-accent` `border-accent` | 동일 | 폴백 안내 배지·즐겨찾기 ☆ |
| `bg-surface` `bg-surface-subtle` `border-line` `divide-line` `bg-paper` | 동일 | |
| `text-ink` `text-muted` `text-faint` | 동일 | |
| `text-danger` | 동일 | 검색 오류 문구 |
| `shadow-soft` `shadow-2xl` | 동일(Manna `boxShadow.soft` 확인됨) | 탭 활성·시트 |
| `font-display` | 동일(Montserrat) | 절 번호·결과 라벨 |
| `portrait:` `landscape:` `lg:` | Tailwind 3.4 내장 변형 — 동일 | 패널 배치 |
| `bg-[#EEEBD0] …`(책 묶음 10색) | 임의값 — 그대로 | Manna 밀·꿀 톤과 어울리는지 실기기 확인, 필요 시 `BOOK_GROUPS.cls` 만 조정 |
| `bg-[#FFE58F]`(mark) | 임의값 | |

### 4-2. 동작 요약(디버그 참고)
- **연결 스크롤**: 각 패널 스크롤 컨테이너(`relative overflow-y-auto`)에서 rAF 스로틀로 최상단 절(`[data-verse]` 중 bottom > scrollTop+8 인 첫 요소)을 찾아 `onTopVerse` → 부모가 다른 패널 `scrollToVerse(verse)`(imperative handle). 프로그램 스크롤 직후 250ms 는 자기 보고 무시(`ignoreUntil`)로 순환 방지. 합절(`data-end`)은 범위 매칭.
- **점프**: 부모 `jumps[i] = { verse, n }` — `n` 증가 시 Pane 이 로드 후 `verse` 로 스크롤. 장 이동은 `verse:1`, 버전 변경은 현재 최상단 절 유지.
- **폴백**: 새한글·ESV 에 없는 장은 `served:'nkrv'` + 패널 상단 안내 1줄.
- **저장**: 패널 버전·장, 연결·단일 토글, 최근 20건(장 단위 dedupe), 즐겨찾기(장+절).

---

## 5. ⑤ 진입점 — Manna 세션에서 결정

MFH 는 홈 벤토에 "Bible" 타일을 추가했지만 Manna 는 하단 탭(모바일)·아이콘 레일(md)·사이드바(lg) 공용 `NAV` 목록이라 구조가 다르다. `NavIcon` 에 `bible`(통독) 아이콘이 이미 있다.

| 안 | 내용 | 장단 |
|---|---|---|
| A(추천) | 통독 `/bible` 페이지 헤더 `right` 에 「성경 읽기」 버튼 + 홈 통독 카드에 링크. 네비 항목 추가 없음 | 네비 안 흔듦. 통독과 같은 묶음이라 자연스러움 |
| B | `NAV` 에 `성경`(`/bible/study`, 아이콘 신규) 추가 | 발견성 높음. 하단 탭 개수·FAB 배치 재조정 필요 |
| C | QT 접이식·통독 본문의 소제목/절 탭 → `/bible/study?ref=…` 딥링크 | A/B 와 병행 가능한 후속 |

`?ref=요 3:16` 진입은 이미 page.tsx 가 지원하므로 C 는 링크만 달면 된다.

---

## 6. ⑥ SQL — `supabase/patch13-bible-search-index.sql` (멱등)

```sql
-- MANNA patch13 — 성경 본문 단어 검색(/bible/study 「내용」 탭) 속도용 트라이그램 인덱스. 멱등.
-- 선행: patch10(bible_texts). 검색은 body ilike '%단어%' — 인덱스 없이도 동작(약 9만 행 순차 스캔, MFH 실측 2.7초), 있으면 즉시.
create extension if not exists pg_trgm;
create index if not exists bible_texts_body_trgm_idx
  on public.bible_texts using gin (body gin_trgm_ops);
```

MFH 는 patch106 으로 09-27 실행 완료. Manna 는 콘솔 실행 후 핸드오프에 기록.

---

## 7. 오프라인(SW) 메모 — 선택

Manna `public/sw.js` 는 `/bible`·`/bible/read` 를 프리캐시하고 통독 본문을 `PrefetchDays` 로 미리 받는다. `/bible/study` 는 클라이언트가 `/api/bible/chapter` 를 호출하므로:
- 최소: 아무것도 안 해도 온라인에서는 동작. 오프라인은 방문했던 장만(브라우저 HTTP 캐시 1시간).
- 확장(후속): `sw.js` 의 API 캐시 규칙에 `/api/bible/chapter` 를 stale-while-revalidate 로 추가하면 읽은 장은 오프라인 재열람 가능.

MFH 개발 중 겪은 함정: PWA SW 가 `_next/static` 을 cache-first 로 잡아 **dev 에서 수정본이 안 보였다**. 배포본은 해시 파일명이라 무관. dev 검증 시 SW 해제 + `caches` 삭제 후 새로고침.

---

## 8. 작업 순서 제안 (Manna 세션)

1. ① `VerseText` V3 → `npx tsc --noEmit` → 통독·QT 화면에서 소제목 크기 확인(가장 작은 변경, 먼저 배포 가능).
2. ②③ `lib/bible/ref.ts` + API 2개(인증 치환) → `curl` 로 401/200 확인.
3. ④ `app/(app)/bible/study/` 6파일(치환표 적용) → `tsc` → 로컬 실측(가로/세로·연결 스크롤·찾기·검색).
4. ⑤ 진입점 결정(§5) → 반영.
5. ⑥ patch13 실행 → 검색 속도 확인.
6. 핸드오프 기록·커밋(단계별 승인). 버전은 우진이 꺼낼 때 MINOR 제안(새 화면).

## 9. 참조 파일 경로(MFH 정본, Manna 세션에서 `../MFH/` 로 읽기)

```
components/VerseText.tsx
lib/bible/ref.ts
app/api/bible/chapter/route.ts
app/api/bible/search/route.ts
app/bible/study/page.tsx
app/bible/study/StudyClient.tsx
app/bible/study/Pane.tsx
app/bible/study/FinderSheet.tsx
app/bible/study/chapterCache.ts
app/bible/study/storage.ts
supabase/patch106-bible-search-index.sql
docs/MFH-HANDOFF-v2dj.md
```
