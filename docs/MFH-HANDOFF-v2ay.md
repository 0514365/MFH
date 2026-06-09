# MFH 핸드오프 v2ay (세션 종료)

> 이전: `v2ax`(아이폰 원격제어 + 캡션 권한 영구등록, 코드 변경 0). 이번: **주간 Facebook 게시 추천 기능 신규 구현**(Phase A 파이프라인 + B 앱페이지 + C 주간루틴). 부부 두 계정 통합 분석, 비용 0, 배포 완료(commit 69d863d).

---

## 현재 위치 (한 줄)

**주간 FB 추천 기능 전체 완성·배포.** 매주 월요일 00:30 로컬 루틴이 지난 7일 부부 공동 데이터를 분석해 게시안 2~3개(문구+추천사진+해시태그)를 생성→앱 `/facebook` 카드로 표시. 게시는 추천만(우진 수동, FB 자동업로드 없음).

---

## 이번 세션 작업 (신규 기능 — 기존 pull→분석→push 패턴 복제)

### Phase A — 생성 파이프라인 (비용 0, Claude Code 구독)
- `supabase/patch86-weekly-fb.sql` — `weekly_fb` 테이블(주차별 게시안 jsonb 배열) + RLS(멤버읽기/본인쓰기, `is_member` 재사용). unique(user_id, week_start). **우진이 Supabase 콘솔 실행 완료.**
- `scripts/fb-pull.ts`(MFH-FB-PULL-V1) — 최근 7일 일지 본문 + 사진 path·기존 캡션 + 인사이트 신호 → 작업지시서 stdout. **사진은 비전 재분석 없이 기존 caption/ai_caption 텍스트만 사용**(추가 비용 0). `user_id` 필터 없음 = 부부 공동.
- `scripts/fb-push.ts`(MFH-FB-PUSH-V1) — result.json → `weekly_fb` upsert(onConflict `user_id,week_start`) + 아카이브(`insights-archive/_fb/`, gitignore). 저장 귀속 `MFH_USER_ID`(우진).
- `.claude/commands/fb-update.md` — `/fb-update` 스킬(pull→게시안작성→result.json→push→보고). 가드레일: 정치중립·현지인실명금지·모금압박금지·따뜻한보고체·사진path 목록 그대로.

### Phase B — 앱 표시
- `app/facebook/page.tsx`(MFH-FB-PAGE-V1) — 최신 주차 조회 + 사진 `createSignedUrl`(journal-photos **비공개 버킷**, 1시간). auth 가드(→/login).
- `app/facebook/FacebookClient.tsx`(MFH-FB-CLIENT-V1) — 게시안 카드(문구 + 사진 썸네일 3열 + 해시태그 + **문구복사 버튼**). 빈 상태 UI.
- `app/page.tsx` — 홈에 **Facebook 카드** 추가(Photos↔Portfolio 사이, 메가폰 인라인 SVG).

### Phase C — 자동화
- `~/.claude/scheduled-tasks/weekly-fb/SKILL.md` — **매주 월요일 00:30**(cron `30 0 * * 1`, 지터로 표기상 ~00:39) `/fb-update` 실행. `mcp__scheduled-tasks__create_scheduled_task` 로 등록.
- 권한: `settings.local.json` 직접 추가는 auto 분류기가 거부(자가수정 차단) → **Run now로 실행해 권한을 task에 저장**(우진 수행). lastRunAt 2026-06-09 00:21, **다음 자동 실행 2026-06-15**.

### 검증
- 타입체크·빌드 통과. `/facebook` 컴파일·런타임 정상(미로그인 시 307 리다이렉트 확인).
- end-to-end: `weekly_fb`에 2주차 저장(06-01~08 첫 테스트, 06-02~09 Run now) 각 게시안 3개·사진 8장.
- **부부 통합 확인**: app_members 김우진(6920f3d8)·서진아(5564d6ee) 등록, fb-pull `user_id` 필터 없음 = 둘 다 분석. **단 서진아 계정 일지 0건(최근 90일)** — 우진이 두 사람 몫 다 기록 중. 아내가 honduras8282로 쓰기 시작하면 코드 변경 0으로 자동 통합.

---

## 우진 미결 액션
- 아이폰 PWA `/facebook`에서 게시안 확인(배포됨) → 문구 복사 → 직접 게시.
- 매주 월요일 새벽 자동 — **맥북이 켜져 있어야** 동작(꺼지면 다음 켤 때 또는 수동 `/fb-update`). 일일 루틴과 동일 제약.
- (참고) 서진아 계정 미사용 — 따로 기록할지는 우진 판단(현재 한 계정 집중도 무방).

## 미구현 옵션 (이번 세션 논의, 보류)
- **재작성은 Cowork 대화로** 가능: "3안을 ○○로 바꿔줘" → 같은 주차 덮어쓰기. 별도 UI 불필요(앱 내 재생성 버튼은 종량 비용 발생 → 비채택).
- 게시 중복방지: 앱에 "게시함" 체크 → 다음 추천이 안 올린 소식 위주. 가벼운 추가, 미구현.
- FB 자동 업로드: Graph API + Meta 검수 필요, 개인계정 제한적. 보류.
- 별점/메모 피드백(insight식 next-gen 반영): 가능, 미구현.

## 다음 세션 시작 시
1. 최신 핸드오프 = 이 문서(v2ay) + 직전(v2ax).
2. 주간 FB 기능 요약: `/fb-update` 스킬 · `weekly_fb` 테이블 · `/facebook` 페이지 · `weekly-fb` 루틴(월 00:30). 부부 공동 분석 · 비용 0 · 추천만(수동 게시).
3. 미결 백로그(변동): postcss moderate 2건 / Next 16 업그레이드(보류) / (옵션) 단일복제 자동번호·반복 N회·반복 시리즈 일괄수정 / FB 게시중복방지·피드백구조(위 미구현 옵션).

*작성: 2026-06-08 세션 종료. weekly_fb 기능 commit 69d863d push 완료. `scheduled-tasks/weekly-fb`·`settings.local.json`(fb 권한 미등록 — Run now로 task 저장)은 로컬(repo 밖/미추적).*
