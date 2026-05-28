# CLAUDE.md — MFH 앱 개발 (Claude Code 지침)

> 이 파일은 Claude Code가 이 repo 에서 작업할 때 **매 세션 자동으로 읽는** 프로젝트 지침서다.
> repo 루트(`/Users/wbook_m1/Dropbox (개인용)/MFH`)에 둔다.
> 상세 사양은 `docs/MFH-CONTEXT.md`, 포트폴리오는 `docs/MFH-PORTFOLIO-DESIGN.md`, 진행 상황은 `docs/MFH-HANDOFF-*.md` 최신본 참조.

---

## 1. 프로젝트 정체성

**MFH (Mission for Honduras)** = 온두라스 선교사 부부의 선교 활동 **기록 · 인사이트 · 포트폴리오 플랫폼**.
- 홈 4모듈: 일지(Journal) · 프로젝트(Projects) · 할 일(Tasks) · 인사이트(Insights).
- 오프닝: 연 주제(Theme)·목표(Goals) 스플래시.
- **AI 에이전트가 핵심**: Claude 가 일지+프로젝트+Task 를 연계 종합 분석 → 분야별/종합 인사이트, 월간 기도편지 보조.
- Brew Journal · WorshipFlow 의 자매 앱(동일 스택).

## 2. 기술 스택

- Next.js 14 (App Router) + TypeScript(**strict**) + Tailwind
- Supabase (DB / Auth / Storage / RLS)
- Vercel (Hobby) + PWA
- Anthropic API (서버사이드, 키는 **Vercel 환경변수** — 클라이언트 노출 금지)

## 3. 협업 스타일 (반드시 준수)

- **언어: 한국어 고정.** 우진은 한글로 입력하고 **모든 답변·설명·계획을 한국어로** 받는다. 코드·파일명·git 메시지·식별자만 영어, 그 외 대화는 전부 한국어.
- **간결한 한국어.** 결정이 필요하면 **결정 테이블** 제시 + 한 단어 confirmation 유도(`추천대로` / `진행` / `다음진행` / `성공` / `에러`). 결과 확인 요청은 "알려주세요".
- 큰 변경은 **단계 분리**(a → b). 한 번에 너무 많이 바꾸지 않는다.
- 파일/폴더명 **영어**, UI 텍스트 **한국어**, 이모지 절제.
- 추측이 필요한 지점은 묻기 전에 `docs/` 의 사양 파일을 먼저 확인하고, 거기에 없으면 묻는다.

## 4. 작업 방식 (Claude Code 전환 후)

> ⚠️ 이전(claude.ai 채팅) 방식의 **patch.tar / apply.py / dry-run 워크플로는 더 이상 쓰지 않는다.** Claude Code 는 repo 파일을 직접 읽고 수정한다.

- **플랜 모드 기본.** 우진은 플랜 모드(`⏸ plan mode`)로 작업한다. 큰 작업은 먼저 계획(결정 테이블 포함)을 제시하고 **승인을 기다린 뒤** 실행한다. 계획에 없던 변경이 필요하면 멋대로 진행하지 말고 멈춰서 묻는다.
- **git push 는 절대 자동으로 하지 않는다.** commit 까지도 우진 승인 후. push 는 반드시 우진이 명시적으로 "push" 라고 했을 때만. (플랜/기본 모드에서 셸 명령은 승인을 거치지만, 안전을 위해 명시적으로 규칙화한다.)
- **파일 직접 수정**: 변경 전 항상 해당 파일을 읽고, 정확한 위치를 편집한다. 큰 신규 모듈은 설계(결정 테이블) → 승인 → 코드 순서를 지킨다.
- **빌드 검증**: 변경 후 로컬에서 타입체크/빌드를 돌려 확인한다. (로컬에 Node + `node_modules` 설치 완료됨.)
  - 타입체크: `npx tsc --noEmit`
  - 빌드: `npm run build` (Vercel auto-build 와 동일 기준)
  - 의존성 추가/변경 시 `npm install` 먼저. push 전 로컬 빌드 통과를 기본 습관으로.
- **git**: 의미 단위로 커밋. 메시지는 영어 한 줄(`feat:`, `fix:`, `refactor:` 접두). push 는 사용자 승인 후.
- **배포**: git push → Vercel auto-build. 배포 URL 에서 사용자가 실기기 확인.

## 5. Supabase 규칙

- URL 은 **호스트만** (NO `/rest/v1/`).
- `lib/supabase-browser.ts` 는 `createClient` 를 export.
- **모든 테이블 RLS 필수** (`auth.uid() = user_id`).
- 공개 자식 데이터 RLS = `부모.is_public EXISTS` 패턴. 항목별 공개 토글이 있으면 `자기.public_view = true AND 부모.is_public` 둘 다 검사.
- 파일/PDF 자산 = 공개 Storage 버킷 + 서버에서 `getPublicUrl(path)` 변환 후 client 에 전달.
- nested aggregate / RPC 는 SECURITY INVOKER + auth.uid() 패턴.
- SQL 은 **멱등** 작성(`create table if not exists`, `add column if not exists`, 정책 `drop ... if exists` 후 `create`). 사용자가 Supabase 콘솔에서 직접 실행하므로 `supabase/` 폴더에 `.sql` 파일로 둔다.

## 6. 코드 컨벤션

- `lib/palette.ts` 키는 2026 Brand Kit 색에서 정의 — **존재하지 않는 키 참조 금지.**
- 컬러: `#661F20`(primary, 딥 마룬) / `#80807F`(neutral 그레이) / `#B61821`(accent 레드).
- 타이포: Montserrat(영문·숫자·제목) + Pretendard(한글 본문).
- 마커 주석: 각 주요 파일 첫 줄에 `// MFH-<NAME>-V<n>` 마커 유지(파일 정체성 추적용).
- zsh 주의: 명령 블록에 `#` 코멘트 금지, glob 패턴(`[id]` 등)은 따옴표 필수.
- 'use client' 경계: useState/onClick/navigator 등 쓰는 컴포넌트는 'use client', 서버 컴포넌트(page.tsx 등)에서 client 컴포넌트 import 는 정상.

## 7. 도메인 가드레일 (편지·인사이트 생성 시 내장)

**기도제목 3원칙**:
1. 온두라스 정치는 **정당·인물 거명 없이 항상 중립.**
2. 사역 기도제목은 **1~2개로 압축.**
3. **가정 평강·문제예방·사전축복** 비중.

- 월간 편지 3단 구조(온두라스 / 사역 / 선교사 가정), 굵은 번호 제목 + 맥락 문단 + 대시 불릿, 번호 `MFH #YYMM`.

## 8. 빌드 단계 / 현재 위치

v0(스키마+Auth+오프닝+홈+일지) → v1(프로젝트·할 일) → v2(에이전트 인사이트·별점) → v3(편지·캘린더 ICS·번역) → 추후(후원자·이메일).

**현재 위치**: 포트폴리오 모듈 진행 중. 최신 상태는 `docs/MFH-HANDOFF-*.md` 의 가장 높은 버전 파일을 먼저 읽고 판단한다. 세션 종료 시 핸드오프 파일을 갱신한다.

## 9. 세션 시작 시 Claude 가 할 일

1. `docs/` 에서 최신 핸드오프(`MFH-HANDOFF-*.md` 최고 버전) + `MFH-CONTEXT.md` 를 읽는다.
2. 포트폴리오 작업이면 `MFH-PORTFOLIO-DESIGN.md` 도 읽는다.
3. 현재 위치·다음 작업을 한 줄로 요약하고, 결정 테이블로 방향을 확인한 뒤 진행한다.
