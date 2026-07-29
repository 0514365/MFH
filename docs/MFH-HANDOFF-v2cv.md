# MFH 핸드오프 v2cv (세션 종료)

> 이전: `v2cu`(프로젝트 상세·목록 데스크탑 + 마크다운). 이번 세션: **마크다운 인용 블록 볼드 추가** — 소규모 스타일 패치 1건 배포. 앱 버전 3.4.0 유지.

---

## 현재 위치 (한 줄)
**마크다운 인용(`>`) 볼드 스타일 배포 + 실기기 확인 성공.** 다음 = **설교문 피드백 반영** 또는 **편지 #2607** 준비.

---

## 이번 세션 작업

### 마크다운 인용 블록 볼드 (커밋 `03b7c4e`, push 완료)
- `components/MarkdownText.tsx` blockquote 클래스에 `font-semibold` 추가.
- 기존 형식(회색 `#98A4A6` 세로바 + 이탤릭) 유지, 글자만 볼드 — `MarkdownText` 사용하는 모든 화면(일지·프로젝트·할 일)에 즉시 적용, 저장 원문 무변경.
- 검증: `npx tsc --noEmit` + `npm run build` 통과 후 푸시. 우진 실기기 확인 성공.

## 우진 확인 대기 (v2cq 이월)
1. 온두라스 소개 2면 수치 검수 (H1 보고서).
2. SEED 소개 면 문구 (seedtoday.org 기준).
3. 설교 실전 정보 — 대상 교회·예배 종류 확정 시 맞춤 수정.

## 다음 작업
1. 설교문 피드백 반영 (`reports/2026-H1/06-sermon-manuscript.md`).
2. 편지 #2607 (7/2~, ICMS 훈련 — 온라인 7/6~17, 대면 7/20~8/14) — 마감 카드에 새 QR 규칙 적용.
3. (선택) 내부 페이지 와이드 레이아웃 확대 — 다음 후보: 할 일(Tasks) 상세, 후원자 상세.
4. 백로그: import_letters V3 / 리허설 노트 / v2ck 앱 백로그.

## 함정 (v2cu 이월, 변동 없음)
- **Vercel 배포 누락 시**: GitHub 장애 여부 먼저 확인(githubstatus.com). 복구되면 밀린 웹훅이 소급 실행됨. CLI 배포(`npx vercel deploy --prod`)는 우진 직접 실행 필요.
- `MarkdownText` 단독 SSR 검증: repo 루트에 임시 tsx + `--tsconfig`(jsx: react-jsx)로 `./node_modules/.bin/tsx` 실행.
- worktree 심링크 / prettier 금지 / push 명시 승인 (v2ck·v2cl 참조).

## 참고
- 미커밋 잔여(이번 세션과 무관, 커밋 제외 유지): `CLAUDE.md`, `flyers/dongsan-2026-07/*`, `scripts/measure-usage.ts`, `reports/2026-H1/06-sermon-manuscript.md`(피드백 후 커밋 예정).
- 카드 발췌에 이미지 마크다운(`![...]`) 클램프 세로 확대 가능성 — 실사용 문제 시 발췌용 이미지 제외 옵션 검토.

---

*작성: 2026-07-29 세션. 마크다운 인용 볼드 배포·확인 완료. 직전 v2cu→archive.*
