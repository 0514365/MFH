# MFH 핸드오프 v2bi (세션 종료)

> 이전: `v2bh`(프로젝트·할일 상세/폼 + 인사이트 홈 리프레시). 이번 세션: **일일 QT 묵상 기능 전체 신규 구축** — 성서유니온 매일성경 본문 + 일지·사역 접목 QT를 생성·표시·자동화·아카이브. 모두 push 완료.

---

## 현재 위치 (한 줄)

**일일 QT 묵상 기능 완성.** 매일 성서유니온 본문을 가져와 일지·사역과 접목한 QT(본문설명·핵심절·묵상·적용·기도)를 자동 생성하고, 홈 카드 · `/qt` 페이지 · 지난 QT 아카이브로 표시. 생성 cron(로컬 05시) + 알림 cron(Vercel 06시)까지.

## 이번 세션 작업 (모두 push)

### A. 백엔드 파이프라인
- **DB**: `supabase/patch92-daily-qt.sql`(daily_qt 테이블·RLS 멤버읽기·하루1행 upsert) + `patch93-daily-qt-commentary.sql`(commentary jsonb 컬럼). **우진 Supabase 실행 완료.**
- `scripts/qt-pull.ts`: 성서유니온 매일성경 Ajax 직접 호출 → 그날 본문 수집 + 최근 일지·프로젝트·할일 → 작업지시서(stdout). 핵심 사실: `POST sum.su.or.kr:8888/Ajax/Bible/BodyMatterDetail`(책·장절·제목 Qt_sj) · `BodyBible`(개역개정 절, Ver_Cd=1001), body `{qt_ty:'QT1', Base_de:'YYYY-MM-DD'}`, 날짜형식 대시 필수.
- `scripts/qt-push.ts`: result.json → daily_qt upsert(onConflict user_id,qt_date) + 아카이브 JSONL.
- `.claude/commands/qt-update.md`: `/qt-update`. 패턴 = honduras-news(pull→Claude분석→push, 무비용).

### B. 앱 표시 + 디자인 (Variant 리스킨 V4)
- `app/qt/page.tsx`(최신 1건 + 하단 "지난 QT" 링크), `app/qt/QtView.tsx`(렌더 공유), 홈 카드(`app/page.tsx` — 제목 19px + 주소 우측).
- **섹션 순서**: 날짜(32px·우측 성서유니온 링크) → 본문카드(maroon-tint·제목+주소, 찬송 없음) → 핵심절(좌측바+quote) → **본문읽기(접이식)** → **본문설명(접이식)** → 묵상 → 적용(근거 pill) → 기도 → 묵상일지 버튼(red) → 출처.
- 접이식 2개: `PassageAccordion`(실시간 `/api/qt/passage`, **저장 안 함**) · `CommentaryAccordion`(DB commentary 토글). 원형 caret.
- 묵상일지 버튼 → `/journal/new?category=묵상&headline=<본문축약 제목>`. `lib/bibleAbbr.ts`(책명 약어). `JournalForm`/`new`에 `initialCategory`·`initialHeadline`.
- `tailwind.config.ts`에 `shadow-soft` 추가. opacity 모디파이어 함정은 고정색으로, Phosphor 아이콘은 인라인 SVG로 변환.

### C. 자동화
- **생성**: 로컬 scheduled-tasks cron `qt-update-0510`(매일 ~05:19, `/qt-update`) — Claude 분석 필요해 로컬.
- **알림**: Vercel cron `/api/qt/notify`(`vercel.json` `"0 12 * * *"` UTC = 온두라스 06시). VAPID가 Vercel **Sensitive**라 로컬 `env pull` 불가 → **Vercel 런타임 발송**으로 전환(기존 구독 유지·재구독 불필요).
- `public/sw.js`: payload `url`·`tag` 반영(QT 알림 클릭→`/qt`). 할일 알림은 기본값 유지(하위호환).
- 로컬 `qt-notify-0600` cron **비활성**, `scripts/qt-notify.ts` 삭제.

### 아카이브
- `/qt/archive`(날짜별 목록) · `/qt/[id]`(상세, QtView 공유). honduras 패턴(QT는 하루1건이라 넘버링 없음).

## 신학/도메인 가드레일 (QT 생성 내장)
개혁주의 복음주의(대한예수교장로회) · **구속사 연결** · 개역개정 정확 인용(책·장·절) + 기도 3원칙(정치중립·사역압축·가정평강). 성서유니온 묵상 해설 미사용(매일성경 제목만 식별용 저장). → 메모리 `mfh-content-theology-guardrails`(편지·설교에도 공통 적용).

## 환경/검증 메모
- `.env.local` = SUPABASE 3 + MFH_USER_ID. **VAPID는 로컬 불필요**(Vercel 런타임 사용).
- ⚠ **`vercel link`가 자동 `env pull`로 `.env.local`을 덮어쓸 수 있음** — 이번 세션에 development 환경으로 덮어써져 SUPABASE·MFH_USER_ID 소실 → Dropbox 버전 기록으로 복원. 이후 `vercel env pull`은 **임시 파일**(`/tmp/v.env`) + `--environment` 명시로. Sensitive 변수는 pull 시 빈 값.
- dev preview(`preview_start`)는 Dropbox/CloudStorage 경로 이슈로 안 뜸 → `tsc`+`build` 검증.

## 남은 확인 (배포 후 · 우진)
1. **Vercel → Settings → Crons**: `/api/qt/notify` 등록 확인 (Hobby cron 한도 2개 = `send`+`qt/notify`).
2. **부부 폰 앱 알림 허용**(push_subscriptions 구독) — 없으면 알림 자동 스킵.
3. (권장) 사이드바 Scheduled → **`qt-update-0510` "지금 실행"** 1회 → WebFetch·Supabase 도구 사전 승인(자동 실행 매끄럽게).

## 백로그 (이월)
1. 선교편지 실제 발송 호 제작.
2. 인사이트 상세 디자인 리프레시(`LensDetail`·`InsightCard`).
3. 온두라스 동향·사진·캘린더·중보기도 화면 리프레시.
4. (보류) 포트폴리오 공개 페이지(`/p/[slug]`).

*작성: 2026-06-13 세션 종료. 변경: `supabase/patch92·93`, `scripts/qt-pull·qt-push`, `.claude/commands/qt-update.md`, `app/qt/*`(page·QtView·PassageAccordion·CommentaryAccordion·archive·[id]), `app/api/qt/passage·notify`, `app/page.tsx`, `app/journal/new·JournalForm`, `lib/bibleAbbr.ts`, `public/sw.js`, `tailwind.config.ts`, `vercel.json`. 커밋 다수 push 완료. cron: `qt-update-0510`(생성) · `qt-notify-0600`(비활성) · Vercel `/api/qt/notify`(알림). 직전 v2bh → `docs/archive/`.*
