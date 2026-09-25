# MANNA → MFH 이관: 인앱 성경 본문(bible_texts) · 통독 「본문 읽기」 · QT 「본문 읽기」

> 작성 2026-09-25 (Manna v2-h, 앱 0.4.3). Manna 에 구현·검증된 **인앱 성경 본문** 기능을 MFH 앱에 동일하게 구현하기 위한 인수인계 자료.
> 두 repo 는 같은 Dropbox 폴더(`…/Dropbox/Manna`, `…/Dropbox/MFH`)에 있어 MFH 세션이 `../Manna/...` 를 **직접 읽을 수 있다.** 코드는 복사본을 두지 않고 경로로 가리킨다(이 문서가 정본, 코드는 Manna 파일이 정본).
> 같은 문서를 `MFH/docs/MANNA-TO-MFH-BIBLE-TEXTS.md` 에 복사해 둔다(MFH repo 커밋은 MFH 세션에서).

---

## 0. 한눈에

| 블록 | 무엇 | Manna 정본 | MFH 에서 할 일 |
|---|---|---|---|
| ① 저장 | `bible_texts` 테이블(3버전 × 절) + 멤버 전용 RLS | `supabase/patch10-bible-texts.sql` | `supabase/patch105-bible-texts.sql`(§3 초안) 콘솔 실행 |
| ② 시딩 | 원자료(`Bible/`) → DB. 개역개정·새한글·ESV 파서 + 결함 보정 + 검증 리포트 | `scripts/bible-seed.ts` V3 | 그대로 가져오되 `BIBLE_DIR` 환경변수로 `../Manna/Bible` 을 가리킴 |
| ③ 조회 | 버전 상수·쿠키·chap_seq 계산·장/절 범위 조회 | `lib/bible/texts.ts` V2 | 그대로 |
| ④ 화면 | 통독 하루치 「본문 읽기」 페이지 + 버전 3단 + 개역개정 폴백 | `app/(app)/bible/read/{page,VersionSelect}.tsx` · `components/VerseText.tsx` | `app/bible/read/` 로(라우트 그룹 없음). 공용 컴포넌트 대체(§4) |
| ⑤ QT | QT 「본문 읽기」 접이식을 성서유니온 프록시 → `bible_texts` 로 교체 | `app/api/bible/passage/route.ts` · `app/(app)/qt/PassageAccordion.tsx` V2 | `app/api/bible/passage/` 신설 · `app/qt/PassageAccordion.tsx` V3. 기존 `/api/qt/passage`(SU 프록시)는 제거 |

전제 데이터: MFH 통독(`reading_plans`·`reading_plan_days`, patch103)과 QT(`daily_qt`, patch92)는 Manna 와 **같은 키트**(`docs/bible-qt-kit/`)에서 나왔고, `lib/bible/data.ts`·`plan.ts` 는 두 앱이 동일 원본이다(`diff` 로 확인: 마커 줄만 다름). `daily_qt.passage` jsonb 의 `{ book, range }` 형태도 동일.

---

## 1. 전제·가드레일 (반드시 유지)

- **본문은 개인·소그룹(MFH 는 부부 2인 멤버) 내부 열람 한정.** 일반 배포·공개 페이지(`/p/…`) 노출 금지. 성경 본문은 **repo·공개 URL 에 절대 올리지 않는다** — 원자료 `Bible/` 는 `.gitignore`, DB 는 멤버 전용 RLS.
- 성서유니온 **해설은 저장하지 않는다**(메타 + 핵심절 1절 + 자체 작성만 — 기존 QT 원칙 그대로). 이번 이관은 「본문」만 자체 DB 로 옮기는 것이고, 해설·이미지 프록시는 손대지 않는다.
- 화면 하단 고정 문구: 「<버전명> · 내부 열람용」.
- 시딩은 **service role 스크립트만**(insert/update/delete 정책 없음). 앱은 읽기만.

---

## 2. 데이터 파일(원자료) — `../Manna/Bible/` (repo 밖, .gitignore)

| 버전 | 경로 | 인코딩·형식 | 파서 | 현재 DB 행 |
|---|---|---|---|---|
| 개역개정 `nkrv` | `개역개정-text/1-01창세기.txt … 2-27요한계시록.txt`(66 파일) | CP949(euc-kr), 1줄 1절 `창1:1 본문`, 합절 `신6:18-19` | `parseNkrv` | 31,088 |
| 새한글 `nkt` | `새한글성경(NKT)_구약/새한글성경(NKT)_구약.txt` + `새한글성경(NKT)_신약/새한글성경(NKT)_신약.txt` | UTF-8 합본 2개. `책명 N장` / `[소제목]` / `N  본문` / 들여쓴 이어지는 줄 | `parseNkt` | 31,103 (1,189/1,189장 전권) |
| ESV `esv` | `영어성경 ESV Bible.rtf` + `esv-fill.txt` | RTF → `textutil`(macOS 전용) 변환. `Gen 1:1 body`. fill 은 RTF 소실 1,063절 보충 | `parseEsv` | 31,077 |

같은 폴더의 개별 `.doc`/부분 `.txt`(구약 01~39, 신약 01~09-27)는 **합본의 재료**일 뿐 시딩에 쓰지 않는다. `02-출애굽기_새한글성경.doc` 는 창세기 파일 복사본(내용 동일).

### 2-1. 새한글 원자료의 알려진 결함과 파서 보정 규칙(`bible-seed.ts` 머리 주석과 동일)

| 결함 | 보정 |
|---|---|
| 시 행이 소제목과 같은 `[ ]` 로 감싸짐(원본 HTML 도 `<h2>`) | `isNktPoetry`: 부호로 끝나거나 인용부호로 시작 / 다음 줄도 `[ ]` / 이어지는 줄이면 「~다」 끝만 소제목(「~마다」 제외) → 시 행은 직전 절에 붙임(구약+신약 1,309줄) |
| 본문 숫자가 절 번호 줄로 잘림(「5대손」「30일」「32명」) | 앞 줄이 부호 없이 끝나고 이번 줄이 단위 낱말(`NKT_UNIT`)로 시작하면 앞 절에 되붙임(20곳) |
| 절 번호만 있는 줄 + 다음 줄이 같은 번호로 다시 시작(「1 / 2  년이 지났다 / 2 그런데…」) | 같은 번호가 두 번이면 뒤가 진짜 절 — 앞 행 본문을 그 앞 절로 넘김. 문장 중간이면 공백, 문장 끝이면 줄바꿈으로 잇는다 |
| 절 중간 소제목(창2:4 후반) | 그 자리에 `<소제목>` 인라인 보존(VerseText 가 블록으로 분리) |
| 애가 `[예레미야애가 N]`, 요한1·2·3서 `[요한1서 N]` 장 표지 | 장 표제로 인정. 책명 별칭 `NKT_BOOK_ALIAS`(요한1서→요한일서 …) |
| 같은 장 중복(삼하 1장) | 두 번째 블록 건너뜀 |
| 절 번호가 1..N 이 아니거나 **본문이 빈 절**이 있는 장 | **결함 장으로 자동 제외** → 화면은 개역개정 폴백. `--dry` 리포트에 목록 |
| NA28 생략 절(마17:21 · 막7:16 · 요5:4 · 행8:37 등 17곳) | 새한글이 `(없음)` 으로 표기 → 그대로 저장(번호 연속성 유지) |
| 새한글 절 구분 차이 | 왕상22(54/53) · 행19(40 이 41 합침) · 계12(18 절 존재) — 정상 |

**2026-09-25 현재 결함 장 0** — 첫 시딩에서 제외됐던 5장(행16 17~24 소실 · 행24 7 「(없음)」 누락 · 고전16 19~20 빈 절 · 요일3 1~3 누락 · 계20 소제목 깨짐)은 원자료를 보충해 해결했다. 앞으로 원자료가 바뀌면 Manna 에서 고치고 MFH 는 같은 파일을 읽으므로 **재시딩만** 하면 된다.

### 2-2. 시딩 실행(Manna 기준, MFH 도 동일)

```bash
npx tsx scripts/bible-seed.ts nkt --dry
```

`--dry` = 파싱·검증만(DB 안 씀). 출력에서 볼 것: `장 N/1189` · `결함으로 제외한 장` · `원자료에 없는 장` · `개역개정과 장별 마지막 절 차이`. 기준값(2026-09-25): 새한글 1,189/1,189 · 결함 0 · 없는 장 0 · 마지막 절 차이 3(왕상22 · 행19 · 계12) · 시 행 되돌림 1,309 · 잘린 숫자 되붙임 20.

```bash
npx tsx scripts/bible-seed.ts all
```

실시딩은 **버전 단위 delete 후 insert**(재시딩 안전, 부분 시딩 없음). `all` = 3버전 전부(약 93,000행, 수 분). 전제: `.env.local` 에 `SUPABASE_SERVICE_ROLE_KEY`(`scripts/_shared.ts` `loadEnv`·`createServiceClient` — MFH 에 같은 함수 있음), macOS(`textutil`).

---

## 3. 스키마 — `supabase/patch105-bible-texts.sql` 초안(멱등)

Manna patch10 과 동일 테이블. 다른 점은 **RLS 만**: Manna `is_active()` → MFH `is_member(auth.uid())`(patch73, security definer).

```sql
-- MFH patch105 — 인앱 성경 본문(bible_texts). 멱등.
-- 본문은 repo·공개 URL 에 두지 않는다(부부 멤버 내부 열람 한정). 시딩은 scripts/bible-seed.ts(service role)만.
-- 읽기 = 멤버 전용(is_member). insert/update/delete 정책 없음(service role 전용).

create table if not exists public.bible_texts (
  version    text    not null check (version in ('nkrv', 'nkt', 'esv')), -- 개역개정·새한글·ESV
  chap_seq   integer not null check (chap_seq between 1 and 1189),       -- 정경 순서 장 번호(창1=1 … 계22=1189)
  book_order integer not null check (book_order between 1 and 66),
  chapter    integer not null check (chapter >= 1),
  verse      integer not null check (verse >= 1),
  verse_end  integer,                                                    -- 합절(예: 신6:18-19)의 끝 절, 단절은 null
  body       text    not null,                                           -- <소제목> 인라인 보존, \n 줄바꿈
  primary key (version, chap_seq, verse)
);

create index if not exists bible_texts_lookup_idx on public.bible_texts (version, chap_seq);

alter table public.bible_texts enable row level security;

drop policy if exists "bible_texts member read" on public.bible_texts;
create policy "bible_texts member read" on public.bible_texts
  for select using (public.is_member(auth.uid()));
```

`chap_seq` 는 **정경 순서**(창1=1 … 계22=1189)이고, 통독 계획의 `start_seq`/`end_seq` 는 **읽기 순서**(`orderedChapters(read_order)` 인덱스)라 서로 다르다. 변환은 `lib/bible/texts.ts` `chapSeqOf(bookOrder, chapter)` 한 곳.

---

## 4. 이식 파일 표 (Manna 경로 → MFH 경로)

마커 주석은 `MANNA-*` → `MFH-*` 로 바꾸고 V1 부터 시작한다.

| Manna 정본 | MFH 경로 | 변경점 |
|---|---|---|
| `scripts/bible-seed.ts` (V3) | `scripts/bible-seed.ts` | `const BIBLE_DIR = process.env.BIBLE_DIR ?? join(process.cwd(), 'Bible')` 로 바꾸고 `.env.local` 에 `BIBLE_DIR=../Manna/Bible`(원자료 중복 보관 없음). `.gitignore` 에 `/Bible/` 추가(로컬 복사 대비). import 경로(`../lib/bible/data`, `../lib/bible/texts`, `./_shared`)는 MFH 에도 동일 |
| `lib/bible/texts.ts` (V2) | `lib/bible/texts.ts` | 그대로. `BIBLE_VERSIONS`·`BIBLE_VERSION_LABEL`·쿠키 `bible_ver`·`chapSeqOf`·`bookOrderOf`·`parsePassageRange`·`getPassageVerses`·`getChapterTexts` |
| `components/VerseText.tsx` (V1) | `components/VerseText.tsx` | 그대로(서버·클라이언트 공용, 훅 없음). 토큰 `text-ink`·`text-primary`·`text-accent`·`font-display` 는 MFH tailwind 에 있음 |
| `app/api/bible/passage/route.ts` (V1) | `app/api/bible/passage/route.ts` | 인증: Manna `getSessionProfile()`+`status==='active'` → MFH `supabase.auth.getUser()` 없으면 401(열람 범위는 RLS `is_member` 가 막는다). 나머지(폴백 규칙 · `Cache-Control: private, max-age=3600`) 동일 |
| `app/(app)/bible/read/page.tsx` (V2) | `app/bible/read/page.tsx` | 활성 계획+일정 조회는 MFH `app/bible/page.tsx` 의 `reading_plans`/`reading_plan_days` 조회를 재사용(Manna `getActivePlanWithDays` 대신). 인증은 `getUser()` → `/login` redirect. `Page`·`PageHeader`·`Card` 는 MFH 의 `PageHeader` + 기존 카드 클래스(`rounded-[24px] border border-line bg-surface shadow-soft`)로. `cookies()` 는 Next 15 라 `await` |
| `app/(app)/bible/read/VersionSelect.tsx` (V1) | `app/bible/read/VersionSelect.tsx` | `SegmentedTabs` 가 MFH 에 없음 → 버튼 3개 세그먼트를 인라인으로(선택 = `bg-primary text-on-primary`). 쿠키 저장 후 `router.refresh()` 동일 |
| `app/(app)/bible/DayCard.tsx` 의 「본문 읽기 →」 링크 1줄 | `app/bible/DayCard.tsx` | `<Link href={`/bible/read?day=${day.day_no}`}>본문 읽기 →</Link>` 를 카드 하단 행에 추가 |
| `app/(app)/qt/PassageAccordion.tsx` (V2) | `app/qt/PassageAccordion.tsx` → **V3** | props `date` → `{ book, range, label }`(호출부 `QtView.tsx` L130: `row.passage.book`·`row.passage.range`·`refShort`). fetch 대상 `/api/qt/passage?date=` → `/api/bible/passage?book&range&ver`. 접이식 껍데기(원형 caret · 절 번호 컬럼)는 MFH 시안 유지, 안쪽만 `VerseText` + 버전 세그먼트 + 폴백 안내. Manna 의 `Accordion` 컴포넌트는 가져오지 않는다 |
| `app/api/qt/passage/route.ts`(MFH 기존 SU 프록시) | 삭제 | 본문 소스가 DB 로 바뀌므로 미사용. `scripts/qt-pull.ts` 가 SU 본문을 핵심절 대조에 쓰면 그 함수는 남긴다(Manna 는 `fetchQtVerses` 유지) |

Manna 전용이라 **가져오지 않는 것**: `lib/bible/queries.ts`(그룹 계획), `lib/ui.ts` 버튼 클래스(`btnGhost` 등 → MFH 클래스로), `rounded-list`·`bg-accent-soft`·`text-on-accent-soft`(폴백 안내 배너 — MFH 토큰으로 대체), 다크 모드 토큰.

화면 규칙(두 앱 공통): 선택 버전에 **하루치 중 한 장이라도 없으면 하루치 전체를 개역개정으로** 폴백 + 안내 1줄(「새한글은 이 범위가 아직 준비 중이라 개역개정으로 표시합니다.」). `<소제목>` 은 절 위 별도 블록, 절 번호는 `sup` 1회, 합절은 「18-19」.

---

## 5. MFH 세션 작업 순서(단계 분리 · 각 단계 `npx tsc --noEmit` → `npm run build`)

1. **patch105** 작성 → 우진이 콘솔 실행(핸드오프에 실행 여부 기록).
2. **시딩**: `.env.local` `BIBLE_DIR` · `.gitignore` → `scripts/bible-seed.ts` 이식 → `--dry` 3버전 리포트가 §2-2 기준값과 같은지 확인 → `all` 실시딩 → DB 행 수 확인(§6).
3. **lib·컴포넌트**: `lib/bible/texts.ts` · `components/VerseText.tsx`.
4. **통독 읽기 화면**: `app/bible/read/` + DayCard 링크 → 실기기: 3버전 전환 · 폴백 안내(확인하려면 임시로 한 장을 지우거나 ESV 미시딩 상태에서) · 이전/다음 일차.
5. **QT 교체**: `app/api/bible/passage/` → `PassageAccordion` V3 → `/api/qt/passage` 삭제(`.next` 잔재로 tsc 가 실패하면 `rm -rf .next`).
6. 버전 bump(MFH `package.json`, MINOR) · `docs/MFH-CONTEXT` 결정 기록 · 핸드오프.

---

## 6. 검증 체크리스트

- [ ] `select version, count(*) from bible_texts group by 1` → nkrv 31,088 · nkt 31,103 · esv 31,077(Manna 2026-09-25 값과 동일해야 함)
- [ ] `select max(chap_seq) from bible_texts where version='nkt'` = 1189
- [ ] 표본: 창41:1 「2년이 지났다…」(잘린 숫자 복원) · 막14:1 「2일 뒤면…」 · 행4:4 「…수가 5,000명쯤」 · 요일1:1 · 요삼1:1 · 계22:21 · 마17:21 「(없음)」 · 행16:17 · 요일3:1 · 계20:1 「<1,000년 동안 다스림> 또 나는…」
- [ ] 비멤버 세션으로 `/api/bible/passage?book=창세기&range=1:1-3&ver=nkrv` → 401 또는 빈 verses(RLS)
- [ ] `/bible/read?day=1` 3버전 전환 · 새한글 미비 일차 폴백 안내 · 하단 「내부 열람용」 문구
- [ ] QT 오늘 화면 접이식 「본문 읽기」 → DB 본문 · 버전 전환이 통독 화면과 쿠키 공유
- [ ] `git status` 에 `Bible/` 이 안 뜬다

---

## 7. MFH 다음 세션 첫 프롬프트 (복사)

```
MFH 앱 세션이다. 이번 주제 = Manna 의 인앱 성경 본문(bible_texts) 기능을 MFH 에 동일 구현.

먼저 읽어라:
1. CLAUDE.md
2. docs/MANNA-TO-MFH-BIBLE-TEXTS.md (이 세션의 사양 — §4 이식 파일 표 · §5 작업 순서)
3. docs/MFH-HANDOFF-*.md 최신본 ①④⑤
4. Manna 정본 코드(읽기 전용): ../Manna/scripts/bible-seed.ts · ../Manna/lib/bible/texts.ts · ../Manna/components/VerseText.tsx · ../Manna/app/api/bible/passage/route.ts · "../Manna/app/(app)/bible/read/page.tsx" · "../Manna/app/(app)/qt/PassageAccordion.tsx"

현재 위치: MFH 3.5.0 · 통독(patch103·104)·QT(patch92·93) 운영 중 · 본문은 성서유니온 프록시(저장 없음).
목표: patch105 → 시딩(BIBLE_DIR=../Manna/Bible) → lib/컴포넌트 → /bible/read → QT 접이식 교체. 단계마다 tsc/build.

시작하면 현재 위치 한 줄 + 아래 결정 테이블을 보여 줘라:
- 원자료 경로: BIBLE_DIR=../Manna/Bible(추천, 중복 없음) vs MFH/Bible 복사
- RLS 범위: is_member(auth.uid())(추천) vs 마스터만
- QT 접이식: SU 프록시 제거하고 DB 로 완전 교체(추천) vs 병행
- 버전: MINOR bump 시점(전 단계 완료 후 1회, 추천)
플랜 모드로 계획 → 승인 → 실행. git push 는 내가 "push" 라고 할 때만.
```
