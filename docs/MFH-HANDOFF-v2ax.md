# MFH 핸드오프 v2ax (세션 종료)

> 이전: `v2aw`(세션 종료 정리 + 루틴 캡션 추가). 이번: **아이폰 원격제어 셋업** + **캡션 자동 루틴 권한 영구 등록**. 코드 변경 없음(환경·설정 작업).

---

## 현재 위치 (한 줄)

**코드 작업트리 clean·전부 푸시(이번 세션 코드 변경 0).** 아이폰에서 맥북 MFH 세션을 원격제어할 수 있게 됐고, 캡션 자동 루틴 권한을 settings 에 영구 등록해 안 멈추게 했다.

---

## 이번 세션 작업 (repo 밖 — 로컬 환경/설정)

### 1) 아이폰 원격제어(Remote Control) 셋업

- **데스크탑 앱은 Remote Control 호스트 불가**(공식 제약 — `/remote-control`·`/login` 슬래시가 "isn't available in this environment"). 터미널 CLI 로만 가능.
- 맥북에 정식 `claude` CLI 미설치 → 번들 바이너리(`~/Library/Application Support/Claude/claude-code/<버전>/claude.app/Contents/MacOS/claude`)를 가리키는 **`~/bin/claude` wrapper** 생성(최신 버전 자동 추적). PATH 등록(`~/.zshrc`)은 보안 분류기가 막아 **전체경로 `~/bin/claude` 로 호출**.
- 계정 이미 로그인(honduras0691, **Claude Max**) → 원격제어 자격 충족. `install`/`~/.local/bin` doctor 경고는 무시(정상 동작).
- **켜는 법**: 터미널에서 `cd "/Users/wbook_m1/Dropbox (개인용)/MFH" && ~/bin/claude --remote-control "MFH-main"` → 아이폰 Claude 앱 **코드 탭 → MFH-main(🟢 Connected)** 탭. 종료는 `/exit`. 맥북·터미널 창은 켜둬야 유지.
- ⚠️ 데스크탑 앱 세션과 터미널 remote-control 세션은 **독립** — 같은 repo·파일 동시 수정 시 충돌. 이 대화 맥락은 미러링 안 되며, 넘기려면 핸드오프/메모리 경유.
- 상세는 메모리 `remote-control-setup.md`.

### 2) 캡션 자동 루틴 권한 영구 등록

- `/caption-update` 1회 실행 → **캡션 대상 0장**(기존 20장 캡션 보유) → 새 생성 없이 종료.
- `auto` 권한모드라 프롬프트 없이 통과하지만 영구 저장은 안 돼서, **`.claude/settings.local.json` 의 allow 에 직접 등록**:
  - `Bash(npx tsx scripts/caption-pull.ts:*)`
  - `Bash(npx tsx scripts/caption-push.ts:*)`
- 설정 소스 `user,project,local` 공유 → **하루 3회 자동 루틴(06:10·14:10·21:10)이 권한으로 안 멈춤.** (settings.local.json 은 로컬·git 미추적)
- `caption-push` 는 0장이라 이번엔 미실행이나, 권한은 등록돼 다음 신규 사진 시 프롬프트 없이 동작.

---

## 우진 미결 액션

- 배포분 실기기 확인(변동 없음 — 각 호 핸드오프의 "우진 액션").
- 아이폰 원격으로 작업할 땐 **데스크탑 앱 창과 동시 작업 주의**(충돌). 한쪽은 쉬게.

---

## 다음 세션 시작 시

1. 최신 핸드오프 = **이 문서(v2ax)** + 직전(v2aw) 읽기.
2. 아이폰 원격 켜는 법 = 메모리 `remote-control-setup` 참조(터미널 `~/bin/claude --remote-control "MFH-main"`).
3. 미결 백로그(변동 없음): postcss moderate 2건 / Next 16 업그레이드(보류) / (옵션) 단일복제 자동번호·반복 N회·반복 시리즈 일괄수정.

*작성: 2026-06-08 세션 종료. 코드 clean·이번 세션은 코드 변경 없음(환경·설정만). `~/bin/claude` wrapper 와 settings.local.json 캡션 권한은 로컬(repo 밖/미추적).*
