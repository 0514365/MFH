# MFH 핸드오프 v2cc (세션 종료)

> 이전: `v2cb`(캘린더·중보기도 app-theme 통합 — 디자인 통합 종료). 이번 세션: **후원자 관리 모듈 신설(Phase A~D) + 보완 + 노션 연동 기반 + 우진 전용 게이팅**. 앱 `3.2.0` 유지 — 우진 결정 "후원자 기능 전체 개발 완료 + 1차 오류 수정 후 3.3".

---

## 현재 위치 (한 줄)

**후원자 관리 모듈 전체 개발 완료**(코어·연계·AI·이메일 + 노션 연동 export + 우진 전용 비공개). DB patch97~100 적용 완료. **다음 = 실기 1차 점검 → 오류 수정 → 버전 3.3.** 노션 회계 구축은 우진의 장기 과제(앱은 export까지 준비됨).

---

## 이번 세션 여정 (커밋 순, 모두 main 푸시)

1. **Phase A 코어 CRUD**(`a7a01ab`): `supabase/patch97`(supporters/supporter_donations/supporter_logs + 멤버 RLS + supporter-photos 버킷). `lib/types.ts`(Supporter·SupporterDonation·SupporterLog), `lib/supporters.ts`(나이·통화환산·라벨·사진업로드). `app/supporters/`(목록·신규·상세·편집·DeleteButton·DonationPanel·LogPanel). 홈 타일 추가.
2. **Phase B 연계·통계**(`97f4452`): `patch98`(journal_entries.supporter_id). 후원자 주도 일지 연계(JournalLinkPanel — 기존 일지 선택 연결/해제), 일지 상세 후원자 칩. 목록 상단 헌금 USD 통계 카드(전체/정기/올해/이번달).
3. **보완 — 기록 수정**(`3689b27`): DonationPanel·LogPanel 인라인 **수정** 기능(추가 폼 재사용, mode='none'|'add'|<id>).
4. **Phase C AI 관계관리**(`7a06235`): `patch99`(insights CHECK 에 supporter_care). `lib/insightExport`(supporterBlock·라벨·타입), `lib/insightPrompt`(LENS_FOCUS/LENS_OUTPUT 4부), `scripts/insight-pull`(supporters 조회+섹션), `.claude/commands/supporter-update.md` 스킬, 후원자 목록에 DomainInsightPanel + 생일 배너.
5. **보완 — 금액 입력**(`6bcbb82`→`497879c`): 천단위 콤마 → **회계형**(우측정렬, USD 센트부터 입력 0.01→1.23, KRW 정수). `lib/supporters` amountToNumber/formatAmountInput/sanitizeAmountInput/amountToRaw. 환율 환산은 round2(3째자리 반올림→2자리, 기존).
6. **Phase D 이메일 발송**(`7c35dd4`): 발송서버 없이 **mailto + bcc + 클립보드 복사**. MessageActions(개별: 메일보내기·주소복사·AI초안복사), BulkMailButton(통합). extractMessageDraft(supporter_care 초안 재사용).
7. **E1 노션 연동 export**(`40da731`): 후원자 CSV(한글헤더+BOM)/JSON(영문키) export, app_id 매핑키. `docs/MFH-SUPPORTERS-NOTION-SYNC.md` 스펙.
8. **우진 전용 게이팅**(`d164e23`): `patch100`(supporters 계열 읽기 is_master만). UI — 홈 타일·후원자 4페이지 redirect·insights 홈 supporter_care 제외(.neq).

---

## 핵심 메커니즘 (다음 세션 필수 이해)

**후원자 모듈 구조**: 3테이블(supporters 마스터 + supporter_donations 1:N + supporter_logs 1:N). RLS = patch73(멤버읽기)+patch91(마스터수정삭제) 패턴 → **patch100 으로 읽기를 마스터만으로 좁힘**(비공개). 사진은 supporter-photos 버킷(journal 과 동일 정책).

**노션 연동 방향(확정)**: **앱=후원자 SoT, 노션=헌금/회계 SoT**(장기). 앱 헌금 입력(supporter_donations·DonationPanel·통계·supporter_care 헌금분석)은 **과도기 기록 수단** — 노션 회계 구축 완료 후 SoT 를 노션으로 이전하고 앱은 헌금 합계를 읽어 표시하는 쪽으로 전환. 양방향 실시간 동기화는 비채택(충돌·중복 위험). 매핑 키 = `supporters.id` ↔ 노션 "앱ID". 상세 = `docs/MFH-SUPPORTERS-NOTION-SYNC.md`. **노션 회계는 ABC 가계부 템플릿만 다운로드된 상태**(미구축) — 우진이 직접 구축 후 연결.

**우진 전용 비공개**: UI(`isMaster(user.id)` 게이팅) + RLS(patch100). **공개 전환 시**: patch100 의 "공개 복원" 주석 블록 실행(member read 복원) + UI 코드의 `isMaster` 조건/리다이렉트 제거. supporter_care 인사이트는 insights 홈에서 `.neq` 로 제외 중(공개 시 해제 고려).

**supporter_care AI**: insight 파이프라인(pull→Claude→push) 재사용. `/supporter-update` 실행 → 4부(관계현황·다음액션·기도제목·메시지초안). 가드레일: 헌금액으로 사람 비교 금지 + 기도 3원칙. 개선과제 메모리 등록됨([[mfh-supporters-ai-analysis-backlog]]).

**회계형 금액 입력**: state=raw digits(콤마 없음). USD 는 센트로 해석(/100), KRW 정수. 통화 변경 시 금액 리셋(오해석 방지). 편집 시 amountToRaw 로 복원.

---

## 다음 세션 (예정 — 우선순위)

1. **후원자 실기 1차 점검** → 오류 수정 → **버전 3.3.0** 승격(우진 기준 "전체 완료 + 1차 수정 후"). 새 모듈 = MINOR.
2. **노션 회계 구축(우진 장기)** → 후원자 DB 생성(스펙대로, 또는 Claude MCP 생성) → CSV/JSON import → 헌금 SoT 이전 → 앱 헌금기능 읽기 전환.
3. **Phase D 개별 AI 맞춤 초안**(후속) — 후원자별 실시간 AI 메시지(Anthropic 종량 비용). 현재는 supporter_care 일괄 초안 재사용.
4. (보류) 오프라인 3단계 — v2bv 부터 이월.

---

## 빌드·검증 함정

- **후원자 페이지는 우진 계정 전용** — 서진아 로그인 시 타일 없음 + 직접 URL 접근 시 홈 redirect. 실기 점검은 우진 계정으로.
- 로그인 후 페이지 preview 캡처 불가 → `npm run build` + 우진 실기. 디자인은 show_widget 목업 선검증(이번 후원자 목록·상세·폼 목업 제공함).
- **패치 실행 순서**: patch97(후원자)→98(일지연계)→99(supporter_care)→100(게이팅) 전부 우진 콘솔 실행 완료.
- Dropbox dev stale → build 로 검증([[mfh-dropbox-dev-hmr-stale]]).
- push 규칙: 우진이 명시적으로 "푸시" 할 때만.

---

## 백로그
1. 후원자 1차 점검 → 3.3.0.
2. 노션 회계 구축 + 후원자/헌금 연동(장기).
3. 후원자 개별 AI 메시지 초안(후속, 비용).
4. (보류) 오프라인 3단계.

---

## 워킹트리 메모 (앱 라인 무관, 그대로 둠)
- `flyers/dongsan-2026-07/` — 동산교회 전단지(앱 외). `_slim_frame.py` 포함.
- `scripts/measure-usage.ts` — 임시.

*작성: 2026-06-24 세션 종료. 후원자 관리 모듈 신설(Phase A 코어 → B 연계·통계 → C AI관계관리 → D 이메일) + 기록수정·회계형입력 보완 + 노션 연동 export(E1) + 우진 전용 게이팅. DB patch97~100. 커밋 9개(`a7a01ab`·`97f4452`·`3689b27`·`7a06235`·`6bcbb82`·`497879c`·`7c35dd4`·`40da731`·`d164e23`) 전부 main 푸시. 앱 3.2.0 유지(전체완료+1차수정 후 3.3). 직전 `v2cb` → `docs/archive/`. 다음 = 실기 1차 점검 → 3.3, 노션 회계 구축(장기).*
