# MFH 핸드오프 v2bg (세션 종료)

> 이전: `v2bf`(마스터 권한 확장 — 캡션·작성자 재지정). 이번 세션: **Variant(variant.ai) 시안 기반 앱 전반 디자인 리프레시** — 홈·일지(목록·상세·입력폼)·프로젝트·할일 재디자인. 모두 **push 완료.**

---

## 현재 위치 (한 줄)

**탭바 4모듈 + 일지 전체(목록·상세·입력)가 새 디자인 시스템으로 리프레시 완료.** 남은 건 프로젝트/할일 상세·입력, 그 외 모듈(인사이트·동향·사진·캘린더·중보기도), 포트폴리오 공개페이지(보류).

---

## 이번 세션 작업 (디자인 리프레시, 모두 push)

작업 방식: **Variant(variant.ai)에서 화면별 시안(HTML)을 받아 첨부 → 기존 기능 100% 보존하며 비주얼만 이식 → `tsc`+`build` 검증 → `show_widget` 미리보기 → 우진 확인 후 커밋/푸시.**

| 화면 | 커밋 | 핵심 |
|---|---|---|
| 홈 | `77822db` | 벤토 그리드 — 주제 hero + 동향 wide(최신 브리핑 미리보기) + 모듈 타일, Projects/To-Do/중보 신호·배지, 노이즈 텍스처 |
| 일지 목록 | `882bb95` | 카드 리스킨 — 사진 콜라주(서명 URL 일괄), 메타칩(프로젝트·태스크·장소·작성자), 카테고리 칩. `DomainInsightPanel` maroon-tint 리스킨(공용) |
| 프로젝트 목록 | `6179ba0`→`b7bf130` | 기존 카드 유지 + **좌측** 상태 컬러밴드 + 하단 Due date(강조)·할일 숫자(진행링 제거). page.tsx 는 원복(today prop 만 X) |
| 할일 목록 | `9ae9cd0`→`c53c0bb` | 좌측 원형 체크(완료=초록 `#0F6E56`) + 좌측 긴급도 밴드(지남 red/임박 orange/완료 초록/기본 회색) + Due 강조 + 메타칩, 프로젝트 칩 상단우측 / Due·분류 2열 |
| 일지 상세 | `3caffff`→`8456df5` | 미니멀 상단바(‹ Log + n/total) + 영문 날짜(OCTOBER 15, 2026) + 날짜/메타 행 분리 + 에디터리얼 4섹션(아이콘+영문캡스+한글, 교대 배경) |
| 일지 입력폼 | `18c59ee`→`ca30034` | 미니멀 헤더(중앙 NEW/EDIT LOG, 마룬 18px) + 24px 카드 + 기도 틴트박스 + SAVE LOG 버튼 |

공용 컴포넌트: `DomainInsightPanel`(maroon-tint+sparkle 접이식), `BackButton`(+`variant='text'`), `DetailNav`(+`variant='minimal'`) — 기본값 유지라 다른 페이지 영향 없음.

## 디자인 시스템 (이번 세션 확립 — 모든 화면 공통)

- **색**: maroon `#661F20`, maroon-tint `#F1E4E4`, red `#B61821`, red-tint `#FAE3E4`, page `#FAF8F7`, surface `#FFF`, ink `#221C1C`, muted `#80807F`, faint `#A8A6A4`, line `#E5DFDC`, subtle `#F2EEEC`. 상태색(예정 `#F1EFE8`/`#444441` · 진행 `#E6F1FB`/`#0C447C` · 완료 `#E1F5EE`/`#0F6E56`).
- **타이포**: Montserrat(영문 캡스 라벨, tracking .15em) + Pretendard(한글). 패턴 = 작은 영문 캡스 라벨 위 굵은 한글.
- **패턴**: 24px 카드(rounded-3xl), 상태 컬러밴드(목록=좌측), 메타칩(border-line + bg-paper + 라인 아이콘), 미니멀 상단바(‹ Label + 중앙 제목 + border-b), 노이즈 텍스처(`globals.css` `body::before` opacity .04).
- **⚠ Tailwind opacity modifier 함정**: 토큰이 `var(--x)`=hex 라 `text-primary/60` 같은 알파 모디파이어가 **안 먹힘**. → `opacity-*` 유틸이나 기본색 흰색(`bg-white/60`) 사용.

## 환경/검증 메모 (중요)

- **dev preview(`preview_start`)가 Dropbox/CloudStorage 경로의 Next 파일와처 이슈로 안 뜸**(로그 없이 listen 실패). → 검증은 `npx tsc --noEmit` + `npm run build`, 시각 확인은 `show_widget` 미리보기로 대체. 실기기 확인은 배포(push→Vercel) 후.
- 디자인 작업 = **기능 보존 원칙**: 필터·정렬·다중선택·일괄변경·라이트박스·EXIF/위치·검증·저장 로직 손대지 않고 렌더(JSX/className)만 교체.

## 세부 페이지용 공통 프롬프트 (Variant 재사용)

세부 페이지를 Variant 로 받을 때 **공통 프리앰블(위 디자인 시스템을 영어로 정리) + SCREEN 블록** 합본으로 요청. 받은 시안은 비주얼 참고로만, 기능은 기존 컴포넌트 로직 보존. (프리앰블 전문은 세션 로그 참조.)

## 다음 세션 백로그 (디자인 리프레시 잔여)

1. **프로젝트 상세·입력**(`/projects/[id]`·`/new`·`/edit`), **할일 상세·입력**(`/tasks/[id]`·…) — 일지 상세/폼 패턴(미니멀 상단바·영문 날짜·섹션·24px 카드) 그대로 적용 가능.
2. **인사이트 · 온두라스 동향 · 사진 · 캘린더 · 중보기도** 화면.
3. **포트폴리오 공개 페이지**(`/p/[slug]`) — **보류(우진: 차후 재검토)**. 합본 프롬프트는 작성됨. `PortfolioView` + 섹션 컴포넌트(BrandBar/Missionary/History/Letter/Video/PrayerCta) 다수 → 섹션별 단계 이식 필요.

## 백로그 (v2bf에서 이월)

1. **선교편지 실제 발송 호** 제작(미세조정 반영). 빌드: 마스터 복제 → 콘텐츠·사진 교체 → `python3 tools/build-letter.py <letter.html> --all`.
2. 인사이트 시각 미세조정 / 스케줄 `honduras-news-0600` first-run 확인.
3. (보류) C3 baseline SQL · C4 postcss · Next 16.

*작성: 2026-06-13 세션 종료. 변경 파일: `app/page.tsx`·`app/globals.css`·`app/journal/page.tsx`·`app/journal/JournalList.tsx`·`app/journal/JournalForm.tsx`·`app/journal/[id]/page.tsx`·`app/projects/ProjectsList.tsx`·`app/tasks/TasksListClient.tsx`·`app/tasks/TaskCheck.tsx`·`app/insights/DomainInsightPanel.tsx`·`components/BackButton.tsx`·`components/DetailNav.tsx`. 커밋 10건(`77822db`~`ca30034`) 모두 push. DB 변경 없음.*
