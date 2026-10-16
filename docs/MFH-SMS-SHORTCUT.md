# MFH 카드 문자 iPhone 단축어 실시간 수집 — 설정 절차

> Ficohsa 카드 결제 문자가 iPhone 에 오면 단축어 자동화가 곧바로 앱 API 로 보내 **승인대기에 실시간으로** 들어가게 한다.
> ⚠ 2026-10-15 판정: 단축어는 실제 카드 문자에서 동작하지 않아 **Mac 수집(launchd 10분)이 주 수집**이다. 아래 절차는 기록·재사용용.
> Mac 수집(`scripts/ficohsa-collect.ts`)은 **백업**으로 계속 돈다 — 같은 거래는 카드·금액·상점 + 수신 ±5분으로 한 번만 들어간다.
> 코드: `app/api/accounting/sms-ingest/route.ts` · `lib/ficohsa-sms.ts` · DB `supabase/patch112-inbox-source.sql`.

## 현재 상태 (2026-10-15)

- **iPhone 단축어는 실제 카드 문자에서 실행되지 않음.** iOS 메시지 자동화의 "보낸 사람" 은 연락처의 번호·주소로만 일치하는데, Ficohsa 발신자는 영문 ID `FICOHSA`(번호 없음)라 연락처로 연결되지 않는다(전화번호 칸에 `FICOHSA` 붙여넣기도 연결 안 됨 — 확인).
  - 대조 테스트: 보낸 사람을 실제 연락처(진아)로 바꾸고 같은 형식 문자를 보내면 자동화·API·토큰 모두 정상 동작(`dry` 응답 수신).
  - **최종 판정(2026-10-15): 작동 안 함** — 실결제가 모두 `source = mac` 으로만 들어오고 `shortcut` 은 0건, 우진 실기 확인. 원인 = 영문 발신자 `FICOHSA` 를 보낸 사람 조건으로 쓸 수 없는 iOS 제약. iPhone 자동화 "MFH 카드 수집" 은 끔.
- **대안 운용(방법 B)**: Mac 수집을 **launchd `com.mfh.ficohsa-collect`(07:00~22:50, 10분마다, node 전체 디스크 접근 권한)** 로 운용(2026-10-15, 예약 작업 `ficohsa-collect-2200` 은 중지). `.env.local` 의 `MFH_APP_URL` + `CRON_SECRET` 으로 새 건이 있으면 푸시(+아이콘 뱃지).
- API(`/api/accounting/sms-ingest`)·토큰·이 문서는 보존 — iOS 가 영문 발신자 조건을 지원하면 재사용.

## 1. 토큰 만들기 · Vercel 등록 (1회)

1. Mac 터미널에서 임의 토큰 생성:
   ```bash
   openssl rand -hex 24
   ```
2. Vercel → 프로젝트 → Settings → Environment Variables → `SMS_INGEST_TOKEN` = (위 값), Environment **Production** → Save.
3. Deployments → 최신 배포 **Redeploy**(환경변수는 재배포해야 반영).
4. 토큰은 단축어에만 넣는다(채팅·문서·git 에 남기지 않기). 유출 의심 시 새 값으로 교체 → 재배포 → 단축어 수정.

## 2. 연결 테스트 (저장 없음)

`?dry=1` 은 판정만 하고 저장·푸시를 하지 않는다. `<TOKEN>` 과 `<APP>`(배포 URL) 을 바꿔서 실행:

```bash
curl -s -X POST "https://<APP>/api/accounting/sms-ingest?dry=1" -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"text":"FICO: Transaccion TC xxxx*****7697 por HNL 594.42 en SUPERMERCADOS LA, si no la reconoce llame"}'
```

- 기대: `{"ok":true,"dry":true,...,"suggested":true,...}` — 401 이면 토큰/재배포 확인.
- FICO 거래가 아닌 문장을 보내면 `{"skipped":...}` (정상).

## 3. iPhone 단축어 자동화 만들기

단축어 앱 → **자동화** 탭 → **+** → **메시지**

1. 조건: **메시지 내용 포함** `FICO: Transaccion` (발신자 'FICOHSA' 는 연락처가 아니라 고를 수 없으므로 내용으로 거른다).
2. **즉시 실행** 선택, **실행 시 알림** 끔 → 다음.
3. 새 빈 단축어 → 동작 추가:
   1. **날짜 포맷** — 날짜: *현재 날짜*, 포맷: **ISO 8601**(시간 포함).
   2. **URL 콘텐츠 가져오기**
      - URL: `https://<APP>/api/accounting/sms-ingest`
      - 방법: **POST**
      - 헤더: `Authorization` = `Bearer <TOKEN>`
      - 요청 본문: **JSON**
        - `text` (텍스트) = *단축어 입력* → **내용**(메시지 본문)
        - `received_at` (텍스트) = *포맷된 날짜*
4. 완료.

> 자동화 입력이 메시지 객체가 아니라 텍스트로 넘어오는 iOS 버전도 있다 — 그때는 `text` 에 *단축어 입력* 을 그대로 넣으면 된다.

## 4. 실제 확인

- 카드 결제 후 몇 초 안에: 사전에 자동 승인이 켜진 상점이면 조용히 장부 저장(승인대기 "카드 자동 승인" 목록), 아니면 **"카드 승인대기 L 594.42 SUPERMERCADOS LA"** 푸시.
- 앱 승인대기에서 평소처럼 승인.
- 그날 22:00 Mac 수집 로그에 `이미 있음 N` 으로 잡히면 중복 판정 정상.

## 동작 규칙 요약

| 항목 | 규칙 |
|---|---|
| 인증 | `Authorization: Bearer SMS_INGEST_TOKEN` (불일치 401) |
| 입력 | JSON `{text, received_at?}` 또는 본문 전체 텍스트. `received_at` 이 없거나 미래·24시간 이전이면 서버 시각 |
| 비거래 문자 | 200 `{skipped}` — 단축어 오류 알림 없음 |
| 중복 | 같은 출처는 `sms_key`(카드·로컬시각초·금액), Mac↔단축어는 카드·금액·상점 + ±5분(1:1) |
| 자동 승인 | ② 규칙 그대로(상점 자동 켬 + 항목 보임 + 계좌 + HNL/USD + 금액 ≤ 최근 10건 평균×3) |
| 푸시 | 승인대기로 들어간 건만 즉시. 자동 승인 건은 조용히 |
| 출처 | `card_tx_inbox.source` = `shortcut` / `mac` |
