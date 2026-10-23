# MFH 핸드오프 v2dx (세션 종료)

> 이전: `v2dw`(회계 2027 실기 검증 + 디자인 원칙 문서화, `docs/archive/`). 이번 세션(2026-10-21~22): **2027 Minimal Block 전체 앱 개정 1~4단계(4-7 후원자까지)**. 단계마다 미리보기 아티팩트 → 결정 → 적용 → 빌드 → 푸시 → 실기 「성공」. 앱 버전 **3.8.0 유지**(다음 "버전" 때 누적 검토 — 전체 개정 완료 시 MAJOR `4.0.0` 후보, 중간이면 MINOR `3.9.0`).

---

## 현재 위치 (한 줄)
전체 앱 2027 개정 = **토큰·셸·홈·공용 부품·일지·할 일·프로젝트·캘린더·말씀·인사이트/동향/Facebook/사진·후원자 완료**. 남은 것 = **4-8 포트폴리오(내부)·주제 → 4-9 브릿지 루트 승격·정리 → 5단계 로고·스플래시·PWA** + 회계 잔여.

---

## 이번 세션 커밋 (전부 origin/main · 실기 성공)
| 커밋 | 단계 | 내용 |
|---|---|---|
| `e8c2ae9` | 1 토큰 | `brand2027` 에 `tint1~8` · `incomeSoft/expenseSoft/waitSoft` · `incomeBar` 추가, 회계 리터럴 치환, `--b27-*` 를 `:root` 선언 |
| `17a1a62` | 2 셸 | 하단 탭(아이콘+라벨 · 남색 돌출 홈) · 흰 사이드바 · 헤더 Manrope 17 · 빨간 뒤로 · 테두리 없는 DetailNav · 보조 패널 · 종이 노이즈 제거 · `light.paper` 순백 |
| `9b967a2` `66774cd` `4a51b10` `bf74a78` `c074236` `0545fe3` | 3 홈 | 블록 격자(전폭 3열 · 주제 아래) · 투톤 블록(숫자 = 진한 파스텔 / 아이콘 = 틴트 + 진한 톤) · 카드 = 브랜드 틴트 면 · 주제 카드 = 살구 중간 톤 `#FDE6C1` · 색 조합 「노을」 · `deep1~8` 토큰 · `blockTint(n)` |
| `995088b` `f327967` | 4-0 · 4-1 | 공용 부품 14종 2027 · 일지(모바일 = 흰 카드 + 콜라주 · 데스크탑 = 2줄 행 + 사진 1장 · 켜진 플래그만 · 월 머리줄 분류 비중 띠 · 분류 블록 선택 `CategoryBlocks`) |
| `b443f97` | 4-2 할 일 | 요약 3칸 · 필터 면 · 기한 그룹 알약 · 원형 체크 카드 · 마감 살구 면 · 중요도 블록 · **상태 이름 예정/진행/완료** |
| `8d3162b` | 4-3 프로젝트 | 요약 3칸(빠른 필터) · 검색 · 상태 그룹 · 로즈 진행 막대 · 진행 요약 면 · 할 일 행 |
| `fb71815` | 4-4 캘린더 | 회계 달력 문법 · 점 = 할 일/지남/완료 · 로즈 주간 막대 · 선택일 2줄 행(+ 걸친 프로젝트) · 넓은 화면 2단 · 구독 접힘 |
| `2b1d00a` | 4-5 말씀 | QT·통독·성경 읽기/검색·중보 · **성경 본문 명조 Noto Serif KR**(`--font-serif`, `font-serif`) · 원형 민트 읽음 체크 |
| `1f1e0be` | 4-6 | 인사이트 렌즈 틴트 블록 · 종합 면 · 분야 행 · 동향 분야 알약 · Facebook 카드 · 사진 격자 |
| `033a4a6` | 4-7 후원자 | 회계형 하단 탭·세그먼트 · 살구 요약 · 명단 2줄 행 · 상세 프로필/정기후원/기도 면 · 패널 행 |
| (이번) | — | 핸드오프 v2dx · 디자인 문서 §9 진행 갱신 |

## 확정된 디자인 결정 (상세는 `docs/MFH-DESIGN-2027.md`)
- **모듈 고정색**: 일지 2 살몬 · 프로젝트 6 로즈 · 할 일 3 살구 · 인사이트·동향·Facebook 8 페리윙클 · 캘린더 4 민트 · 성경/QT 7 블러시 · 통독 5 라벤더 · 중보 6 로즈 · 사진 1 라군 · 후원자 3 살구 · 회계 2 살몬. 주제 카드 = 살구 중간 톤 `#FDE6C1`.
- **일지 분류색**(`JOURNAL_CATEGORY_BLOCK`): 교회사역 1 · 방과후학교 3 · 선교사가정 7 · 훈련·행정 8 · 긴급구호 6 · 일상 4 · 묵상 5.
- **투톤 규칙**: 진한 파스텔(흰 글자 + 할로)은 숫자·선택된 것에만, 나머지는 같은 색 틴트 + 진한 톤(`deep1~8`). 진한 톤 글자를 진한 파스텔 위에 쓰지 않는다(A안 기각).
- **미니멀 유지**: 카드 테두리·그림자·옆줄·영문 대문자 머리글 금지. 구분 = 연회색 면 · 틴트 면 · 라벨 앞 8px 색 사각형 · 타이틀 알약 · 2줄 행.
- **행동 = 터키석**(＋ · 묵상일지 쓰기 · 할 일 추가 · 문구 복사 · 메일 쓰기), 저장·수정 = 남색, 삭제 = 연한 빨강 면.
- **완료 체크** = 원형(미완료 회색 테두리 / 완료 진한 민트 `#226C5A`) — 할 일 · 프로젝트 · 통독 공통.
- 보조 회색 `muted` = `#7A8093`(진하게 조정).

## 코드 위치 (새로 생긴 것)
- `lib/palette.ts`: `tint1~8` · `deep1~8` · `incomeSoft/expenseSoft/waitSoft/incomeBar` · `blockTint(n)`. CSS 변수 `--b27-tint-n` · `--b27-deep-n` (인라인 `var()` 로 사용).
- `lib/constants.ts`: `JOURNAL_CATEGORY_BLOCK` · 상태 라벨 한글.
- `lib/fonts.ts` `notoSerifKr` · `tailwind` `font-serif` · `components/VerseText.tsx` 명조.
- `app/(app)/journal/CategoryBlocks.tsx` — 분류 블록 선택(일지·할 일·프로젝트 폼 공용).
- `lib/statusChip.ts` — `chip/chipOn`(흰 알약/남색) · `statusChipCls`(상태 틴트).

## 운용 (git 밖)
- 빌드 검증: 세션 스크래치 `buildcheck`(rsync + node_modules 링크)에서 `tsc` + `npm run build`. **명조 폰트 첫 내려받기로 컴파일이 수 분 걸릴 수 있음**(이후 캐시).
- 미리보기 아티팩트(우진 계정 비공개): 전체 컨셉 https://claude.ai/artifact/N5i3f5bZqnsrPn9LT34drW · 셸 https://claude.ai/artifact/3dePy6VePe3LgYMqhkketw · 홈 색 조합 https://claude.ai/artifact/DJqFgJzwdwGkXwErQxbVog · 일지 개선 https://claude.ai/artifact/8Q1rF3NEHKyf6533oWJZKN · 할 일 https://claude.ai/artifact/1W8v9mhRhmmYURAe4m7hZY · 프로젝트 https://claude.ai/artifact/Jxipd2hpMXeUnGbsdbZYbo · 캘린더 https://claude.ai/artifact/8LfFUq4i4LD4epUZNDoF37 · 말씀 https://claude.ai/artifact/KKAKtdDhm7ooR4dFnQcg3c · 인사이트 https://claude.ai/artifact/U8GUZ9qxv1HhBTqLB5yckG · 후원자 https://claude.ai/artifact/TRGsEDwAAAF7t6aDzamt7A
- 미커밋 잔여물(그대로): `flyers/dongsan-2026-07/`(수정 2), `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts`, `docs/bible-qt-kit/`, `letter-templates/assets/2026추석.heic`.

## 다음 과제
0. **4-8 포트폴리오(내부 `/portfolio`)·주제(`/theme`)** — 아직 마룬/Stayly 클래스(`PortfolioForm` · `LetterEditor` · `VideoEditor` · `HistoryEditor` · `AccordionSection` · `components/Portfolio*Upload` · `theme/page.tsx`). 미리보기 → 적용. 공개 `/p` 는 별도 유지.
1. **4-9 마무리** — `.theme-2027` 브릿지를 `:root` 로 승격, 마룬 `light` 토큰 정리, `app-theme`/`portfolio-theme.css` 의 `(app)` 잔재 제거(지금 `(app)` 페이지 import 는 0, 주석만 남음), `projects/Progress.tsx`(미사용 `ProgressRing`) 정리, 홈 env 미설정 화면 `text-primary`.
2. **회계 잔여** — 데스크탑(md+) 폼·검색·영수증·CSV·규칙 등에 `text-primary/bg-accent` 잔존(`AccountingForm` · `SearchView` · `CsvImport` · `ReceiptViewer` · `ItemManageButton` · `AccountAddForm` · `InboxBanner` · `CardRepayButton` · inbox 섹션들) · `charts.tsx` 미사용 코드.
3. **5단계** — 로고 재채색(남색·터키석) · 스플래시(마룬 → 2027) · PWA 아이콘 · `themeColor #661F20` → 흰색 · 편지 템플릿(2027호부터).
4. 선택: 후원자 현황 「최근 연락」 목록(데이터 조회 추가 필요 — 이번엔 뺌) · 다크 모드(범위 밖).
5. 이월: 11/3 이후 10월 마감 확인 · 11/13·11/15 카드 명세서 대조 · **10월호(MFH #2610)** 11월 초 착수.

## 다음 세션 시작 프롬프트(복사용)
```
docs/MFH-HANDOFF-v2dx.md 와 docs/MFH-DESIGN-2027.md 를 읽고 시작. 2027 전체 앱 개정 이어서 — 4-8 포트폴리오(내부)·주제 미리보기부터. 단계마다 미리보기 → 승인 → 적용, 커밋·푸시는 내가 말할 때만.
```
