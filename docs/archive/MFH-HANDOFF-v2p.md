# MFH 핸드오프 — v2-p (2026-05-27)

> **다음 개발 채팅 첫 메시지로 이 파일 + `MFH-CONTEXT.md` + `MFH-PORTFOLIO-DESIGN.md` 를 함께 첨부하세요.**
> `MFH-HANDOFF-v2o.md` 를 갱신·대체합니다.
> (현재 위치: **포트폴리오 Step B-2 완성(선교편지 PDF)** → 다음: **다크모드 / 노션 34건 import / Step C 방명록**)

-----

## 0. 한 줄 요약

MFH 앱. v2-o(포트폴리오 Step B-1, patch61) 이후 이번 세션 = **포트폴리오 Step B-2 완성(patch62)** = 선교편지(PDF 방식). **핵심 전환: 편지 본문을 앱에서 작성하지 않고, 외부 제작 PDF 뉴스레터를 업로드**(제목·호수·PDF·선택 표지만). `letters` 테이블 신규 재정의(기존 3섹션 미사용 정의 폐기) + RLS(public_view AND 부모 is_public) + 인덱스 + 신규 공개 버킷 `portfolio-letters`. 공개 페이지 편지 섹션(영상 아래, 년도 accordion 최신 펼침, 표지 3:4 또는 PDF placeholder 카드, 클릭=새 탭 PDF). 편집 페이지 "선교편지 관리"(추가폼 + PDF/표지 업로드 + 공개토글 + 공유 URL 복사 + 순서). 디자인 사양서 `MFH-PORTFOLIO-DESIGN.md` **v4** 갱신.

-----

## 1. 인프라 (확정 — 변동 없음)

| 항목 | 값 |
|---|---|
| 작업 폴더 (Mac) | `/Users/wbook_m1/Dropbox (개인용)/MFH` |
| Downloads | `/Users/wbook_m1/Downloads` |
| GitHub | `0514365/MFH` (main, private) → Vercel auto-deploy |
| 배포 | `mfh-snowy.vercel.app` |
| Supabase | `https://ocygdrwdpoytwwbsrdmp.supabase.co` (Pro) |
| Auth | `honduras0691@gmail.com` |
| 환경변수 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY` |
| 포트폴리오 공개 URL | `mfh-snowy.vercel.app/p/mfh` |

스택: Next.js 14 (App Router) + TS(strict) + Tailwind + Supabase + Vercel + PWA + Anthropic API.

### 비용 모델 (변동 없음)
- Claude Max ≠ API 크레딧(분리). 자동 인사이트 = API 종량제.
- 모델: `claude-sonnet-4-6`(인사이트) / `claude-opus-4-7` / `claude-haiku-4-5-20251001`. SDK 미설치 → fetch 직접호출.
- ⚠️ **claude.ai 사용 한도 = 세션(5시간) 단위** 리셋. 큰 패치는 단계분리.

-----

## 2. 작업 방식 (반드시 준수)

- 로컬 = **Mac + Python3 만 (Node/npm 없음).** → **Vercel auto-build 가 유일 검증.**
- 패치 = `/home/claude/patchN/` → **⭐ gzip 없는 순수 `tar -cf` (.tar, .gz/.tar.gz 금지 — 우진 요청)** → `present_files`.
  ```
  cd /tmp; tar -xf "/Users/wbook_m1/Downloads/patchN.tar"
  cd "/Users/wbook_m1/Dropbox (개인용)/MFH"
  python3 /tmp/patchN/apply.py
  git add -A; git commit -m "..."; git push
  ```
  (적용 명령도 `tar -xf` — z 플래그 없이)
- **apply.py 엔진(표준):**
  - **NEW** = `copy_new_file()`. 대상 이미 존재하면 중단(덮어쓰기 방지).
  - **append (marker)** = 파일 끝에 블록 추가 전 마커 substring 체크 → 이미 있으면 중단(중복 방지). `lib/portfolio.ts` 영상 타입 추가가 이 패턴.
  - **EDIT** = `str_replace()`, old 정확히 1매치만 치환(0·2+ 전체중단). 같은 파일 다중EDIT = 메모리상 순차적용·각 단계 1매치.
  - 멱등성 = 재실행 시 신규 파일 존재 감지로 안전 중단.
  - 항상 dry-run(우진 원본 복제본에 적용) → tsc 통과 확인 후 패키징.
- Claude는 패키징 전 **모사 repo 적용 + tsc(strict, 실제 @types/react@18·node@20·react@18·@supabase/ssr·@supabase/supabase-js 설치) + 'use client' 경계 스캔 + 멱등성 재실행 + dry-run(원본 복제본) 적용본 tsc 통과**까지 검증.
- **`tsc --noUnusedLocals --noUnusedParameters` 통과 필수** (v2-k 표준).
- ⭐ **표준(v2-l):** supabase 호출 헬퍼는 모사검증 시 실제 `@supabase/supabase-js` + `@supabase/ssr` 설치 후 tsc 필수.
- ⭐ **표준(v2-l) — 데이터 모델 확인 선행:** 신규 supabase 쿼리 만들기 전 `lib/types.ts`/`lib/portfolio.ts` + 해당 모듈 편집폼 먼저 확인.
- ⭐ **표준(v2-m) — 공통 타입 키 추가 시 사용처 grep 전수 조사 필수.**
- ⭐ **표준(v2-n) — 신규 모듈 설계 단계 분리.** 큰 신규 모듈은 코드 진입 전 사양서(`MFH-PORTFOLIO-DESIGN.md`) 작성·시각화·우진 승인 → 핸드오프와 함께 첨부. 수정 시 새 버전(v3, v4) 누적. **이번 세션 = 결정 테이블 → 시각화 4뷰 → 사양서 v3 → 코드 흐름 그대로 적용됨.**
- ⭐ **표준(v2-n) — 공개 readonly 라우트 패턴.** `app/p/[slug]/page.tsx` 서버 컴포넌트 + RLS `is_public=true`. 로그인 redirect 없음.
- ⭐ **표준(v2-n) — Storage 공개 버킷 패턴.** `public=true` + select 전부 허용 + insert/update/delete 는 `(storage.foldername(name))[1] = auth.uid()::text`.
- ⭐ **신규 표준(v2-o) — 공개 자식 데이터의 RLS = 부모 is_public EXISTS 패턴.** 포트폴리오에 종속된 공개 데이터(영상·연혁 등)는 자기 테이블 RLS 의 anon SELECT 정책을 `exists (select 1 from portfolio p where p.user_id = <table>.user_id and p.is_public = true)` 로 건다. 부모(portfolio) 공개 여부가 자식 공개를 제어 → 일관성. patch61 영상 2테이블이 이 패턴.
- ⭐ **신규 표준(v2-o) — YouTube 자산은 업로드 없이 URL+자동 썸네일.** Storage 안 씀. `youtubeVideoId()` 로 watch/youtu.be/shorts/embed+쿼리 전부 파싱 → `img.youtube.com/vi/{id}/hqdefault.jpg` 썸네일 + `youtube.com/watch?v={id}` 정규화 시청 URL. 헬퍼는 `lib/portfolio.ts` 에.
- ⭐ **신규 표준(v2-p) — 공개 자식 데이터 + 자기 공개 토글 RLS = `자기.public AND 부모.is_public EXISTS`.** 영상은 부모 is_public 만 봤지만, **편지처럼 항목별 공개 토글이 있으면** anon SELECT 정책에 자기 컬럼(`public_view = true`)도 AND 로 함께 검사. patch62 `letters_public_read` 가 이 패턴.
- ⭐ **신규 표준(v2-p) — PDF/파일 자산 = 공개 Storage 버킷 + 서버에서 path→공개URL 변환.** Storage 공개 버킷(`public=true`)에 `{userId}/{kind}-{ts}.{ext}` 업로드. 공개 페이지(서버 컴포넌트)에서 `supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl` 로 미리 URL 변환 후 client 섹션에 전달(클라에서 supabase URL 환경변수 안 만져도 됨). 공유 URL 복사도 동일 getPublicUrl. patch62 `portfolio-letters` 버킷.
- ⭐ **신규 표준(v2-p) — URL 확장 props 는 제네릭 그룹 헬퍼로.** 공개 페이지가 DB row 에 `pdf_url/cover_url` 을 덧붙인 확장 타입을 넘길 때, 그룹핑 헬퍼(`groupLettersByYear`)는 `<T extends Pick<PortfolioLetter,'year_month'>>` 제네릭으로 작성 → 원본 타입·확장 타입 모두 통과. (이번에 비제네릭이라 tsc 에러 → 제네릭 전환으로 해결.)
- ⚠️ **반응형/sticky/실런타임 은 모사 repo tsc 로 못 잡음 → 실기기 화면 확인 필수.**
- ⚠️ **멱등성 함정 — substring 체크:** EDIT 의 `new` 가 `old` 를 포함하면 재실행 중복. 신규파일 존재체크 + append 마커체크로 회피.
- ⚠️ **button 안 button 중첩 금지.** (영상 카테고리 칩은 span 안에 button 여러 개 — span 컨테이너라 OK.)
- zsh: `#` 코멘트 금지, glob/공백 경로 따옴표 필수. `[slug]` dynamic route glob 따옴표 필수.
- 협업: 간결한 한국어, 결정 테이블, 한 단어 confirmation(`진행`/`성공`/`에러`/`다음진행`/`추천대로`).

-----

## 3. 브랜드 + Status 색 (변동 없음)

라이트 토큰(lib/palette.ts): primary#661F20 / primaryHover#531719 / accent#B61821 / accentHover#9A141B / danger#B61821 / primarySoft#F1E4E4 / accentSoft#FAE3E4 / paper#FAF8F7 / surface#FFFFFF / surfaceSubtle#F2EEEC / line#E5DFDC / text#221C1C / textMuted#80807F / textFaint#A8A6A4.

**⚠️ 색-슬래시 opacity 동작 안 함 (요소 `opacity-*` 만). hover 배경 = `hover:opacity-90` 또는 `hover:border-primary`. `hover:bg-accent-soft`/`hover:bg-primary-soft` 안전(검증됨).**
**⚠️ 동적 클래스 금지 (`bg-status-${x}` 등 JIT 미감지).**
**⚠️ `bg-paper` 클래스 금지 → `style={{ background: 'var(--paper)' }}`.**
- 검증색키: `bg-accent` `bg-accent-soft` `bg-primary` `bg-primary-soft` `bg-surface` `bg-surface-subtle` `bg-line` `border-line` `border-primary` `border-accent` `text-accent` `text-danger` `text-faint` `text-muted` `text-primary` `text-white` `text-ink` `focus:border-primary`.
- patch61 영상 카드 썸네일 배경 = `bg-[#221C1C]` (임의값 OK, 영상 placeholder 검정). 년도 배지/재생 오버레이 = `bg-black/55~60` (검정 슬래시 opacity 는 동작).
- Status 색키 9종: `bg-status-upcoming`/`text-on-status-upcoming`/`border-on-status-upcoming`(회) + `…-progress`(파) + `…-done`(초).

### 반응형 기준값 (확정)
- **앱 내부 4모듈** = `min-[740px]:` 단일 기준. 마스터-디테일 2열.
- **포트폴리오 모듈** = **3단계** — 기본(<740) / `min-[740px]:`(태블릿) / `min-[1100px]:`(데스크탑). 영상 그리드 = 1/2/3열 동일 기준.

-----

## 4. 도메인 가드레일 (변동 없음)

**기도제목 3원칙:** ① 온두라스 정치 항상 중립 ② 사역 기도제목 1~2개 압축 ③ 가정 평강·문제예방·사전축복 비중. → `lib/insightPrompt.ts`.

### 인사이트 톤·시간지향 (변동 없음)
- 톤 = 따뜻한 목양적 동행 / 시간 지향: 일지=돌아봄 / 프로젝트=지금+다음 한 걸음 / 할일=앞보는 리마인더 / 종합=돌아봄+내다봄.

-----

## 5. Supabase 스키마

전 테이블 RLS on. Storage 비공개 `journal-photos` + 공개 `portfolio-photos`.

| 테이블 | 비고 |
|---|---|
| `year_themes` | 변동 없음 |
| `projects` | 변동 없음. done 없음 → status='done'. |
| `tasks` | 변동 없음. status CHECK 제약 아직 없음. |
| `journal_entries` | 변동 없음. project_id/task_id 단일 FK. |
| `insights` | 변동 없음 |
| `categories` | 변동 없음. 7개 시드. |
| `letters` (v2-p 재정의) | id, user_id, **year_month**(text "2026-05"), **number**(text null 호수), title, **pdf_path**(필수), **cover_path**(null 선택 표지), **public_view**(bool default false), sort_order, created_at. **기존 3섹션 정의(미사용) 폐기 후 PDF 방식 신규**. RLS = 본인 ALL + anon SELECT(`public_view=true AND 부모 portfolio is_public EXISTS`). 인덱스 `(user_id, year_month desc, sort_order)`. SQL = 멱등(create if not exists + alter add column if not exists). |
| `portfolio` (v2-n) | id, user_id, **slug unique**, hero_image_url, intro_text, email_public, facebook_url, youtube_url, intro_video_url, missionary_a_*(name/photo_url/bio), missionary_b_*, is_public(default true), updated_at. **unique(user_id)**. RLS = 본인 ALL + public is_public=true SELECT. |
| `portfolio_history` (v2-n) | id, user_id, period_text, title, **is_ongoing**, sort_order, created_at. RLS = 본인 ALL + public SELECT. |
| **`portfolio_video_categories`** (신규 v2-o) | id, user_id, name, sort_order(int default 0), created_at. RLS = 본인 ALL + 공개 포트폴리오 소유자 카테고리 anon SELECT(exists portfolio is_public). 인덱스 `(user_id, sort_order)`. **시드 6개**(긴급구호/어린이예배/유치원/Zapotal 교회/방과후학교/찬양). |
| **`portfolio_videos`** (신규 v2-o) | id, user_id, **category_id**(FK → portfolio_video_categories, **on delete set null** = 삭제 시 "기타"), title, youtube_url, year(int null), sort_order, created_at. RLS = 본인 ALL + 공개 포트폴리오 영상 anon SELECT. 인덱스 `(user_id, category_id, sort_order)`. 영상 시드 없음(우진 직접 추가). |

### Storage 버킷
| 버킷 | public | 정책 |
|---|---|---|
| `journal-photos` | false | 본인 ALL only |
| `portfolio-photos` | true | 누구나 SELECT + 본인 INSERT/UPDATE/DELETE (foldername[1] = auth.uid()::text) |
| `portfolio-letters` (v2-p) | true | 동일 정책 (누구나 SELECT + 본인 쓰기). PDF + 표지 이미지. 경로 `{userId}/letter-{ts}.pdf` / `cover-{ts}.{ext}` |

(영상은 Storage 안 씀 — YouTube URL + 자동 썸네일.)

-----

## 6. 이번 세션 완료 (patch62 — 배포·검증 성공)

### ▶ 포트폴리오 Step B-2 = 선교편지 (PDF 방식)

**디자인 사양서:** `MFH-PORTFOLIO-DESIGN.md` **v4** (§5-5 편지 섹션 + §6-4 letters 테이블 + §6-5 letters 버킷 + §7 라우트 + §8 Step B-2 + §10 v3·v4 이력. ※ v3 영상 섹션이 사본에 누락돼 있어 v4 에서 §5-4·§6-3 으로 합본 반영).

**핵심 설계 전환(중요):** 당초 "앱에서 3섹션(nation/ministry/family) 작성" 안 → 우진 요청으로 **"외부 PDF 뉴스레터 업로드"** 로 전환. 앱은 제목·년월·호수·PDF·(선택)표지만 저장, 본문 렌더/작성 없음. → `/letter/[id]` 라우트·slug·3섹션 전부 폐기.

**결정 흐름(F1~F4):** PDF 열기 = 새 탭 직접(브라우저 뷰어 다운로드 제공) / 공유 = PDF 공개 URL 복사 / 표지 = 선택 업로드(없으면 PDF placeholder 카드) / 신규 공개 버킷.

**선교편지 (공개 페이지):**
- 위치 = **영상 아래**, MAIN 2열 그리드 바깥 전체 폭.
- **년도별 accordion** — 최신 년도 기본 펼침, 헤더 "년도 · N편".
- 펼친 년도 = 카드 그리드 1/2/3/4열(기본/740/1100 + 4열). 카드 = 표지 3:4 또는 PDF placeholder(`surface-subtle`). 호수 배지(우상단). 하단 "5월 — 제목".
- 카드 클릭 = **새 탭 PDF**(getPublicUrl). 편지 0건이면 섹션 숨김. **공개 fetch = public_view=true 만.**

**선교편지 관리 (편집 페이지, 영상 관리 아래):**
- "편지 추가" 폼: 년월 + 호수(선택) + 제목 + PDF 업로드(필수) + 표지 업로드(선택) + 공개 토글.
- 리스트: 📄 + 호수 배지 + 년월·제목 + 공개/비공개 토글(클릭 즉시 update) + 🔗 공유 URL 복사(복사됨 1.5s) + ↑↓ 순서 + ✕ 삭제(PDF·표지 Storage 파일도 함께 remove).

### patch62 — 신규 4 + append 1 + EDIT 3파일

| 구분 | 파일 | 마커 |
|---|---|---|
| NEW | `app/p/[slug]/LetterSection.tsx` | `MFH-PORTFOLIO-LETTER-SECTION-V1` |
| NEW | `app/portfolio/LetterEditor.tsx` | `MFH-PORTFOLIO-LETTER-EDITOR-V1` |
| NEW | `components/PortfolioLetterUpload.tsx` | `MFH-PORTFOLIO-LETTER-UPLOAD-V1` |
| NEW(SQL) | `supabase/patch62-letters.sql` | — |
| append | `lib/portfolio.ts` | `MFH-PORTFOLIO-LETTER-TYPES-V1` (PortfolioLetter 타입 + 헬퍼 4: letterYear/letterMonthLabel/groupLettersByYear〈제네릭〉/) |
| EDIT | `app/portfolio/page.tsx` | 편지 fetch + LetterEditor (str_replace 3) |
| EDIT | `app/p/[slug]/page.tsx` | 편지 fetch(public_view=true) + getPublicUrl 변환 + letters prop (str_replace 3) |
| EDIT | `app/p/[slug]/PortfolioView.tsx` | LetterSection import·prop·삽입 + LetterWithUrls 타입 (str_replace 4) |

**SQL:** `patch62-letters.sql` 멱등. letters create if not exists + alter add column if not exists 7 + RLS 2정책(drop/create) + 인덱스 + 버킷 insert(on conflict do nothing) + storage 정책 4(drop/create).

**헬퍼:** `letterYear`("2026-05"→"2026", 실패시 "기타") / `letterMonthLabel`("2026-05"→"5월") / `groupLettersByYear`(제네릭, 최신 년도 먼저·내부 입력순·"기타" 맨끝).

> 검증: dry-run(우진 원본 복제본) str_replace 10개 전부 1매치 + 신규 4 생성 + append 1 + tsc strict(--noUnusedLocals/Parameters, 실제 @supabase/ssr·supabase-js) exit 0 / 'use client' 경계 OK(섹션·에디터·업로드=client, page 2개=server) / 헬퍼 node 실행 검증 / 멱등성 재실행 안전중단 / SQL 괄호·정책쌍 점검 / Vercel 빌드·실기기 성공.

-----

## 6-OLD. 직전 세션 (patch61 — Step B-1)

영상 2테이블 + RLS + 카테고리 6 시드. 공개 영상 그리드(연혁 아래, 1/2/3열, YouTube 자동 썸네일, 새 탭) + 편집 UI(카테고리 칩 + 영상 CRUD). 홈 6번째 카드 "Portfolio" + BottomNav 활성.

-----

## 7. 마커 스택 (현재)

**이번 세션 신규(patch62 — 선교편지):**
- `app/p/[slug]/LetterSection.tsx`: **`MFH-PORTFOLIO-LETTER-SECTION-V1`**
- `app/portfolio/LetterEditor.tsx`: **`MFH-PORTFOLIO-LETTER-EDITOR-V1`**
- `components/PortfolioLetterUpload.tsx`: **`MFH-PORTFOLIO-LETTER-UPLOAD-V1`**
- `lib/portfolio.ts`: append **`MFH-PORTFOLIO-LETTER-TYPES-V1`** (PortfolioLetter 타입 + 헬퍼)

**직전 세션(patch61 — 영상):**
- `app/p/[slug]/VideoSection.tsx`: **`MFH-PORTFOLIO-VIDEO-SECTION-V1`**
- `app/portfolio/VideoCategoryEditor.tsx`: **`MFH-PORTFOLIO-VIDEO-CATEGORY-EDITOR-V1`**
- `app/portfolio/VideoEditor.tsx`: **`MFH-PORTFOLIO-VIDEO-EDITOR-V1`**

**포트폴리오 기존(patch60):**
- `lib/portfolio.ts`: `MFH-PORTFOLIO-TYPES-V1` (patch61 영상 타입+헬퍼 append)
- `app/p/[slug]/page.tsx`: `MFH-PORTFOLIO-PUBLIC-PAGE-V1`
- `app/p/[slug]/PortfolioView.tsx`: `MFH-PORTFOLIO-VIEW-V1`
- `app/portfolio/page.tsx`: `MFH-PORTFOLIO-EDIT-PAGE-V1`
- `app/portfolio/PortfolioForm.tsx`: `MFH-PORTFOLIO-FORM-V1`
- `app/portfolio/HistoryEditor.tsx`: `MFH-PORTFOLIO-HISTORY-EDITOR-V1`
- `components/PortfolioPhotoUpload.tsx`: `MFH-PORTFOLIO-PHOTO-UPLOAD-V1`

**앱 4모듈 기존 (변동 없음):**
- `lib/taskGroups.ts`: `MFH-TASK-GROUPS-V2` / `lib/taskFilter.ts`: `MFH-TASK-FILTER-V2` / `lib/journalFilter.ts`: `MFH-JOURNAL-FILTER-V2`.
- `app/tasks/TasksListClient.tsx`: `MFH-TASKS-LIST-V6` / `app/journal/JournalList.tsx`: `MFH-JOURNAL-LIST-V3` / `app/projects/ProjectForm.tsx`: `MFH-PROJECT-FORM-V2`.
- `lib/useSelectionMode.ts`: `MFH-SELECTION-MODE-V1` / `lib/bulkUpdate.ts`: `MFH-BULK-UPDATE-V4` / `components/SelectionCheckbox.tsx`: `MFH-SELECTION-CHECKBOX-V1` / `components/SelectionBar.tsx`: `MFH-SELECTION-BAR-V1`.
- `app/tasks/TaskBulkPanel.tsx`: `MFH-TASK-BULK-PANEL-V1` / `app/journal/JournalBulkPanel.tsx`: `MFH-JOURNAL-BULK-PANEL-V1` / `app/journal/PrayerCandidateToggle.tsx`: `MFH-PRAYER-CANDIDATE-TOGGLE-V1` / `app/projects/ProjectBulkPanel.tsx`: `MFH-PROJECT-BULK-PANEL-V1` / `app/projects/ProjectStatusToggle.tsx`: `MFH-PROJECT-STATUS-TOGGLE-V1` / `app/projects/ProjectsList.tsx`: `MFH-PROJECTS-LIST-V3`.
- `components/DetailNav.tsx`: `MFH-DETAIL-NAV-V2` / `lib/projectFilter.ts`: `MFH-PROJECT-FILTER-V1` / `lib/listNav.ts`: `MFH-LIST-NAV-V1`.
- `components/BackButton.tsx`: `MFH-BACK-BUTTON-V2` / `PageHeader.tsx`: `MFH-PAGE-HEADER-V1`.
- `app/tasks/page.tsx`: `MFH-TASKS-PAGE-V2` / `TaskForm.tsx`: `MFH-TASK-FORM-V2`.
- `app/journal/page.tsx`: `MFH-JOURNAL-PAGE-V2` / `JournalForm.tsx`: `MFH-JOURNAL-REDESIGN-V3` / `lib/useCategories.ts`: `MFH-USE-CATEGORIES-V1` / `CategorySelect.tsx`: `MFH-CATEGORY-SELECT-V1` / `lib/useWideScreen.ts`: `MFH-USE-WIDE-SCREEN-V1` / `lib/statusChip.ts`: `MFH-STATUS-CHIP-V1`.
- insight 7종, `ModuleIcon` `MFH-MODULE-ICON-V1`(portfolio 케이스 포함), `BottomNav` `MFH-BOTTOM-NAV-V1`(Portfolio 활성), `CalendarView` `MFH-CAL-FILTER-V2`.

-----

## 8. 모듈 진행 현황

| 모듈 | v0 | v1 | v2 (인사이트) | Step A | Step B | Step C |
|---|---|---|---|---|---|---|
| 일지 | ✅ | ✅ | ✅ | — | — | — |
| 프로젝트 | ✅ | ✅ | ✅ | — | — | — |
| 할일 | ✅ | ✅ | ✅ | — | — | — |
| 인사이트 | — | — | ✅ | — | — | — |
| **포트폴리오** | — | — | — | ✅ patch60 | ✅ **B-1 patch61**(영상·홈진입점) / ✅ **B-2 patch62**(편지 PDF) | ☐ 방명록 |

-----

## 9. 다음 작업

### ▶ 후보 1 — 노션편지 34건 import (Step B-2 자연 연계, 제1순위)
- **이번 patch62 로 letters 테이블·버킷·UI 준비 완료** → 과거 34건을 채울 차례.
- 노션 export → 각 편지 PDF 화 → `portfolio-letters` 업로드 + `letters` row insert(year_month·number·title·pdf_path·public_view).
- ⚠️ **진입 시 확인**: 노션 편지가 (a) 이미 PDF 인지 (b) 텍스트라 PDF 변환 필요한지. PDF 일괄 업로드 = Storage API 스크립트 or 우진 수동. row 는 CSV→insert 스크립트 가능.
- 표지 이미지 일괄 = 선택(없으면 placeholder).

### ▶ 후보 2 — 다크모드
- 죽은 splash CSS 제거. white/inverse 로고 + palette dark. PWA manifest 색.
- selectionCheckbox / SelectionBar / BulkPanel / 날짜 input / 프로젝트 폼 2x2 / 할일 그룹 헤더 / **포트폴리오 페이지(영상·편지 카드 포함 전 단계 검증)** 다크 토큰.
- Tailwind dark variant 전략 결정. PWA standalone statusBar 색.

### ▶ 후보 3 — 포트폴리오 Step C (방명록)
- 이름+메시지 공개 입력 → 우진 승인 후 표시. 신규 테이블 + 앱 배지 알림. 승인제 + rate limit.

### ▶ 후보 4 — 일괄변경 정교화
- 일괄 "기간 변경" / "복사" / N:N 연계 모델 / 칩 검색창 / Undo.

### ▷ 인사이트 — 실사용 별점·메모 축적 → few-shot 품질↑.

-----

## 10. 열린 결정사항

- [ ] **포트폴리오 디자인 v5** — 영상·편지 섹션 실사용 후 피드백.
- [ ] **영상 카드 클릭** — 현재 새 탭. 추후 모달 embed 재생 원하면 변경.
- [ ] **편지 카드 클릭** — 현재 새 탭 PDF. 추후 인앱 PDF 뷰어(react-pdf 등) 원하면 변경.
- [ ] **노션 34건 import** — PDF 변환 필요 여부 + 일괄 업로드 방식 확인(후보1).
- [ ] **포트폴리오 후원 계좌 / SEED 로고 / QR 코드** 노출 여부 (PORTFOLIO-DESIGN §12 보류).
- [ ] **다크모드** 구현.
- [ ] **N:N 연계 모델** 신설 여부.
- [ ] 일괄 변경 Undo / DetailNav 위치표시 페이지네이션 / `tasks.status` CHECK / 인사이트 Haiku 절감 / 성경출처 한글vs영문.

-----

## 11. 다음 세션 시작 문구(예시)
> "안녕 Claude. MFH 이어서 합니다. `MFH-HANDOFF-v2p.md` + `MFH-CONTEXT.md` + `MFH-PORTFOLIO-DESIGN.md` 기준, 포트폴리오 Step B-2(선교편지 PDF) 완성됨. 이번엔 **노션편지 34건 import** 가죠." (또는 다크모드 / 방명록)

-----

## 12. 이번 세션 패치 이력 (v2-o → v2-p)

- **patch62** = **포트폴리오 Step B-2 (선교편지 PDF 방식)**. NEW 4 (`app/p/[slug]/LetterSection.tsx` + `app/portfolio/LetterEditor.tsx` + `components/PortfolioLetterUpload.tsx` + SQL) + append 1 (`lib/portfolio.ts` PortfolioLetter 타입·헬퍼 4) + EDIT 3 (`app/portfolio/page.tsx` 편지 fetch·LetterEditor / `app/p/[slug]/page.tsx` 편지 fetch·getPublicUrl·letters prop / `PortfolioView.tsx` LetterSection 삽입). letters 테이블 재정의 + RLS 2 + 인덱스 + 버킷 portfolio-letters + storage 정책 4.

### 교훈 (다음 세션에서 적용)

- **⭐ 설계 단계 결정 전환은 사양서로 흡수.** 당초 "앱에서 3섹션 편지 작성" 안이 시각화·결정 과정에서 "외부 PDF 업로드"로 전환됨. 시각화 2차(PDF 시안)로 재확인 → 사양서 v4 → 코드. 라우트(`/letter/[id]`)·slug·3섹션을 코드 진입 전 폐기해 리워크 0. **신규 모듈 4단계 흐름(결정→시각화→사양서→코드)이 또 효과.**

- **항목별 공개 토글 RLS = `자기.public AND 부모.is_public`(v2-p 표준).** 영상은 부모만 봤지만 편지는 편지별 토글 → anon SELECT 에 `public_view=true` AND 부모 EXISTS 둘 다. 공개 fetch 도 `.eq('public_view', true)` 추가.

- **PDF/파일 자산 = 공개 버킷 + 서버 getPublicUrl 변환(v2-p 표준).** 공개 페이지(서버)에서 path→publicUrl 미리 변환해 client 섹션에 `pdf_url/cover_url` 확장 타입으로 전달. 클라가 supabase URL 환경변수 안 만짐. 공유 URL 복사도 getPublicUrl + navigator.clipboard(실패 시 window.prompt fallback).

- **URL 확장 props → 그룹 헬퍼 제네릭화(v2-p 교훈).** DB row 에 url 필드 덧붙인 확장 타입을 그룹핑 헬퍼에 넘기면, 헬퍼가 비제네릭이면 tsc 에러. `<T extends Pick<Base,'key'>>` 로 작성. (이번에 한 번 걸렸다 제네릭 전환으로 해결 — node 헬퍼 실행 검증까지 함.)

- **동명 page.tsx 업로드 = document 본문으로 원본 재구성(v2-o 교훈 지속).** 편집/공개 page.tsx 동명 → 디스크엔 공개본만 남음. dry-run orig 의 편집 page.tsx 는 document 본문으로 작성. str_replace old 는 항상 우진 원본(업로드/본문) 기준.

- **dry-run = 우진 원본 복제본 apply.py 실행 + 적용본 tsc.** orig(업로드본 3 + 편집 page 본문) 복제 → apply.py → str_replace 10개 1매치 → 적용본을 repo 인프라(node_modules·stub·tsconfig)로 tsc exit 0. 실제 Mac 적용과 가장 근접.

- **⭐ 패치 = gzip 없는 순수 `.tar`(우진 요청, v2-o 확정 지속).** `tar -cf`, 적용 `tar -xf`.
