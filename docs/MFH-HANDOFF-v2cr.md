# MFH 핸드오프 v2cr (세션 종료)

> 이전: `v2cq`(설교문 "주님은 길을 내십니다" 완성). 이번 세션: **홈 와이드 레이아웃 완성** — 데스크탑 2단 대시보드 + iPad 4열 벤토. 앱 버전 3.4.0 유지.

---

## 현재 위치 (한 줄)
**홈 반응형(데스크탑·iPad) 배포 완료 + 실기기 확인 성공.** 다음 = **설교문 피드백 반영** 또는 **편지 #2607** 준비.

---

## 이번 세션 작업

### 홈 와이드 레이아웃 (`app/page.tsx`만 변경, 로직·쿼리 무변경)
- 제안 A(벤토 확장)/B(2단 대시보드)/C(풀 리디자인) 중 **B안 채택** (HTML 목업으로 A·B 비교 후 결정).
- 브레이크포인트 구조:
  - **모바일(기본)**: 기존 그대로 — 세로 스택 + 2열 벤토, Log 는 tall(`row-span-2`).
  - **sm(≥640, iPad 세로 포함)**: `max-w-3xl`. 좌측 그룹(주제 hero 풀폭 → QT·동향 반반) + 모듈 4열 벤토(Log 일반 크기, Portfolio·Supporters 반폭, Accounting 풀폭).
  - **lg(≥1024, 데스크탑)**: `max-w-6xl`, 12칸 그리드 — **좌 5**(주제·QT·동향·Supporters 스택, `sticky top-4`) : **우 7**(모듈 벤토. 6열 그리드에 타일 2칸 = 실질 3열, 하단 Accounting 풀폭).
- 균형 디테일:
  - 우측 lg 행 템플릿 `[1fr_1fr_1fr_auto]` + 부모 `items-start` 제거 → 타일 3행이 스트레치되어 **Accounting 하단 = 좌측 Supporters 하단** 정렬.
  - Supporters 는 lg 전용 좌측 카피(`hidden lg:flex`), 벤토 쪽 원본 타일은 `lg:hidden` — 모바일·태블릿 순서 보존.
- 커밋 4개(모두 push 완료): `a21171c`(기본 구조) → `57222d4`(하단 와이드 반반) → `e7f79c7`(Supporters 좌측 이동) → `c033c98`(높이 정렬 + sm 브레이크포인트).

### 함정 (레이아웃 후속 작업 시)
- **iPad 세로는 md(768px) 미달 기기가 있음**(iPad mini 744px) → 태블릿 기준은 반드시 `sm:` 사용. md 로 되돌리면 재발.
- Log 타일 tall 은 모바일 전용(`row-span-2 sm:row-span-1`).

## 우진 확인 대기 (v2cq 이월)
1. 온두라스 소개 2면 수치 검수 (H1 보고서).
2. SEED 소개 면 문구 (seedtoday.org 기준).
3. 설교 실전 정보 — 대상 교회·예배 종류 확정 시 맞춤 수정.

## 다음 작업
1. 설교문 피드백 반영 (`reports/2026-H1/06-sermon-manuscript.md`).
2. 편지 #2607 (7/2~, ICMS 훈련 — 온라인 7/6~17, 대면 7/20~8/14).
3. (선택) 내부 페이지(일지·프로젝트 등) 와이드 레이아웃 확대 검토 — 홈과 동일 패턴.
4. 백로그: import_letters V3 / 리허설 노트 / v2ck 앱 백로그.

## 빌드·검증 함정 (변동 없음 — v2ck·v2cl 참조)
- `npx tsc --noEmit` + `npm run build` 통과 확인 완료. worktree 심링크 / prettier 금지 / push 명시 승인.

## 참고
- 미커밋 잔여(이번 세션과 무관, 커밋 제외 유지): `CLAUDE.md`, `flyers/dongsan-2026-07/*`, `scripts/measure-usage.ts`, `reports/2026-H1/06-sermon-manuscript.md`(피드백 후 커밋 예정).

---

*작성: 2026-07-12 세션. 홈 와이드 레이아웃 배포·확인 완료. 직전 v2cq→archive.*
