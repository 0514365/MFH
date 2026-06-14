# MFH 핸드오프 v2bj (세션 종료)

> 이전: `v2bi`(일일 QT 묵상 기능 전체 구축). 이번 세션: **맥 잠자기 알림 타이밍 수정** — 06:00 QT 푸시가 맥 재취침으로 누락되던 문제를 새벽 깨우기 블록 연장으로 해결. **repo 코드 변경 없음**(이 핸드오프 문서만 커밋). 실제 변경은 repo 밖 시스템 설정(`~/bin`, `~/Library/LaunchAgents`).

---

## 현재 위치 (한 줄)

**QT 기능 완성(v2bi) + 06:00 알림 수신 타이밍 정상화.** Vercel cron은 정시 발송했으나 우진 맥이 06:00 직전 다시 잠들어 푸시를 놓치던 것을, 새벽 caffeinate 블록을 07:10까지 늘려 해결. 효과는 **내일(06/15) 06:00부터**.

## 이번 세션 작업 (repo 밖 시스템 설정)

### 증상
- 일일 QT 알림(06:00)이 정시에 안 오고, 우진이 **맥을 수동으로 깨운 순간** 한꺼번에 도착.

### 원인 (pmset 로그로 확인)
- 발송은 정상: Vercel cron `/api/qt/notify` `0 12 * * *` UTC = **06:00 온두라스(CST=UTC-6)**.
- 맥 깨우기가 **옛 루틴 시각(05시 뉴스·08/22시 인사이트)** 기준이라 현재 cron(06:00 알림)과 어긋남.
- 새벽 `caffeinate`가 **04:55~05:55(1시간)**만 유지 → **06:00엔 재취침** → 푸시 누락. 수동 기상(오늘 06:40) 시 밀린 알림 도착.

### 수정 (V3 → V4)
- `~/bin/schedule-wakes.sh` (com.mfh.wake-scheduler, V4): wake `07:54` 제거 → **04:54·21:54**만. `sudo -n pmset` = `/etc/sudoers.d/pmset` NOPASSWD 의존(cancelall도 동작 확인).
- `~/Library/LaunchAgents/com.mfh.caffeinate-morning.plist` (**신규**): 04:55에 `caffeinate -i -t 8100`(135분 → **07:10까지**). 04:54 wake로 깨어난 뒤 떠야 의미(caffeinate는 잠든 맥을 못 깨움).
- `~/Library/LaunchAgents/com.mfh.routine-caffeinate.plist`: 04:55·07:55 제거 → 저녁 **21:55**만(`-t 3600`).
- 적용: `plutil -lint` 통과 · `launchctl` 재로드 3개 · `pmset schedule cancelall` 후 재등록(04:54/21:54).

### 커버 결과 (내일부터, 새벽 한 블록)
- 05:10 QT 생성 · **06:00 QT 알림** · 06:00 뉴스/인사이트 생성 · 07:00 할일 알림.
- 검증 로그: `~/Library/Logs/mfh-{wake-scheduler,caffeinate-morning}.log`.

### 메모리
- `mfh-mac-wake-notification-timing` 기록(알림 cron 시각 변경 시 이 두 plist + schedule-wakes.sh 같이 수정해야 함).

## 남은 확인 (우진)
1. **내일(06/15) 06:00 QT 알림**이 수동 기상 없이 도착하는지. 안 오면 `~/Library/Logs/mfh-caffeinate-morning.log`(04:55 실행 흔적) 확인.
2. **폰 알림도 늦었는지** — 폰은 APNs라 잠자기와 무관(정시에 와야 함). 늦으면 구독/폰 알림 설정 쪽 별도 점검.
3. (v2bi 이월) Vercel → Settings → Crons 등록 확인 · 부부 폰 앱 알림 허용(push_subscriptions 구독).

## 백로그 (v2bi 이월)
1. 선교편지 실제 발송 호 제작.
2. 인사이트 상세 디자인 리프레시(`LensDetail`·`InsightCard`).
3. 온두라스 동향·사진·캘린더·중보기도 화면 리프레시.
4. (보류) 포트폴리오 공개 페이지(`/p/[slug]`).

## 미커밋 (이번 세션 무관 · 우진 판단 대기)
- `.gitignore`에 `.env*` 추가 — 합리적 보안 변경이나 세션 무관이라 스테이징 안 함.
- `flyers/` (untracked) — 내용 미확인이라 손대지 않음.

*작성: 2026-06-14 세션 종료. repo 변경: 이 핸드오프 문서 추가 + v2bi → `docs/archive/`. 실제 수정은 repo 밖(`~/bin/schedule-wakes.sh`, `~/Library/LaunchAgents/com.mfh.caffeinate-morning.plist`·`com.mfh.routine-caffeinate.plist`). 직전 v2bi → archive.*
