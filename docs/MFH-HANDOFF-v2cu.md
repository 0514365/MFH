# MFH 핸드오프 v2cu (세션 종료)

> 이전: `v2ct`(6월호 연락처 QR 개편). 이번 세션: **프로젝트 상세·목록 데스크탑 개선** — 상세 2컬럼 확폭 + 개요 마크다운, 목록 카드·요약 패널 마크다운. GitHub 장애로 배포 지연 → 복구 확인. 앱 버전 3.4.0 유지.

---

## 현재 위치 (한 줄)
**프로젝트 상세·목록 마크다운/와이드 개선 배포 완료 + 실기기 확인 성공.** 다음 = **설교문 피드백 반영** 또는 **편지 #2607** 준비.

---

## 이번 세션 작업

### 프로젝트 상세 데스크탑 개선 (커밋 `13c5537`, push 완료)
- `app/projects/[id]/page.tsx`: `max-w-md` → `min-[740px]:max-w-5xl`(일지 상세와 동일 기준).
- **900px↑ 2컬럼**: 개요·첨부(좌) + 진행 상황(우, `sticky top-[72px]`). 740~900px 단일 컬럼 확폭, 모바일 기존 유지.
- **개요 마크다운**: 일반 `<p>` → `MarkdownText`(일지와 동일 렌더러, 표시만 변환·원문 보존).

### 프로젝트 목록 마크다운 (커밋 `eb7d359`, push 완료)
- `app/projects/ProjectsList.tsx`: 카드 발췌(line-clamp-2 유지)·우측 요약 패널(ProjectSummary) 모두 `MarkdownText` 적용.
- 폰트 비율: MarkdownText 헤더가 em 단위라 `text-sm`(14px) 기준 자동 비율 축소 — 별도 작업 불필요.

### 배포 장애 대응 (기록용)
- 7/16 22:51 UTC GitHub REST API 장애 → push 웹훅 미전달로 `eb7d359` 이후 자동 배포 중단.
- 진단: GitHub Deployments API(`api.github.com/repos/0514365/MFH/deployments`)로 최신 배포 SHA 확인, 프로덕션 CSS에서 클래스 존재 여부로 반영 검증.
- 재배포 트리거 빈 커밋 `bab4522` 푸시(당시엔 무효). **장애 복구 후 웹훅 소급 실행**되어 `eb7d359` Ready·프로덕션 승격, 우진 실기기 확인 성공.

## 함정 (신규)
- **Vercel 배포 누락 시**: GitHub 장애 여부 먼저 확인(githubstatus.com). Vercel 대시보드 "Create Deployment" 다이얼로그도 GitHub API 의존이라 장애 중엔 브랜치 해석이 안 됨(스피너 무한). 복구되면 밀린 웹훅이 소급 실행됨.
- Vercel CLI 로컬 배포(`npx vercel deploy --prod`)는 GitHub 우회 가능 — CLI 인증은 이번 세션에 갱신됨(`vercel whoami`로 확인). 단, Claude 자동 실행은 권한 분류기가 차단 → 우진 직접 실행 필요.
- `MarkdownText` 단독 SSR 검증: repo 루트에 임시 tsx + `--tsconfig`(jsx: react-jsx)로 `./node_modules/.bin/tsx` 실행 (스크래치패드 경로는 모듈 해석 실패).

## 우진 확인 대기 (v2cq 이월)
1. 온두라스 소개 2면 수치 검수 (H1 보고서).
2. SEED 소개 면 문구 (seedtoday.org 기준).
3. 설교 실전 정보 — 대상 교회·예배 종류 확정 시 맞춤 수정.

## 다음 작업
1. 설교문 피드백 반영 (`reports/2026-H1/06-sermon-manuscript.md`).
2. 편지 #2607 (7/2~, ICMS 훈련 — 온라인 7/6~17, 대면 7/20~8/14) — 마감 카드에 새 QR 규칙 적용.
3. (선택) 내부 페이지 와이드 레이아웃 확대 — 다음 후보: 할 일(Tasks) 상세, 후원자 상세.
4. 백로그: import_letters V3 / 리허설 노트 / v2ck 앱 백로그.

## 빌드·검증 함정 (변동 없음 — v2ck·v2cl 참조)
- worktree 심링크 / prettier 금지 / push 명시 승인.

## 참고
- 미커밋 잔여(이번 세션과 무관, 커밋 제외 유지): `CLAUDE.md`, `flyers/dongsan-2026-07/*`, `scripts/measure-usage.ts`, `reports/2026-H1/06-sermon-manuscript.md`(피드백 후 커밋 예정).
- 카드 발췌에 이미지 마크다운(`![...]`)이 들어가면 클램프가 세로로 커질 수 있음 — 실사용에서 문제 시 발췌용 이미지 제외 옵션 검토.

---

*작성: 2026-07-16 세션. 프로젝트 상세·목록 데스크탑 개선 배포·확인 완료. 직전 v2ct→archive.*
