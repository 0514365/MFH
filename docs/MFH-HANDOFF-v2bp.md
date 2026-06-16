# MFH 핸드오프 v2bp (세션 종료)

> 이전: `v2bo`(비서 카드 UX·클리셰 가드). 이번 세션: **QT 파이프라인 시각 앞당김** — 생성 05:10→**04:40**, 알림 06:00→**05:00**(온두라스 CST). 그에 맞춰 맥 새벽 wake/caffeinate 블록을 04:24~07:10으로 당김. repo 변경은 `vercel.json` 1줄(push·배포 완료), 나머지는 repo 밖(scheduled task·launchd·스크립트)+메모리. **DB·앱 코드 변경 없음.**

---

## 현재 위치 (한 줄)

QT 묵상 생성·알림이 30분씩 앞당겨져 **04:40 생성 / 05:00 알림**(CST)으로 운영. 맥 새벽 블록(04:24 wake → 04:25 caffeinate → 07:10)이 생성·알림·07:00 할일을 한 번에 커버. 첫 실전 적용은 **2026-06-16 새벽**. 다음은 (이월) 선교편지 실제 발송 호.

---

## 이번 세션 작업 — QT 시각 변경 (4곳 동기화)

배경: 우진 요청으로 QT 생성→알림을 30분 앞당김. 단일 설정이 아니라 4개 시스템(scheduled task·Vercel cron·맥 wake·caffeinate)이 맞물려 함께 조정해야 함. 시간대는 **로컬 = 온두라스 CST(UTC-6)** 로 확정(scheduled task `nextRunAt`이 UTC 11:18 = 로컬 05:18인 점으로 검증).

| 대상 | 위치 | 변경 |
|---|---|---|
| QT 생성 | scheduled task `qt-update-0510` | cron `10 5`→`40 4` (04:40, jitter 표시 04:49) |
| QT 알림 | `vercel.json` `/api/qt/notify` | UTC `0 12`→`0 11` (=CST 05:00). 커밋 `1d76e86`·push·배포 완료 |
| 맥 wake | `~/bin/schedule-wakes.sh` (V5) | 새벽 wake `04:54`→`04:24`. 06/16 04:24 pmset 등록 확인 |
| 맥 caffeinate | `~/Library/LaunchAgents/com.mfh.caffeinate-morning.plist` | 04:55/`-t 8100`(135분)→04:25/`-t 9900`(165분), 둘 다 07:10까지. reload 완료 |

새 새벽 블록 흐름: **04:24 wake → 04:25 caffeinate(07:10까지) → 04:40 생성 → 05:00 알림 → 07:00 할일**.

## 핵심 메모 (다음 세션)

- **repo 밖 파일이 다수** — wake/caffeinate/스케줄은 `~/bin`·`~/Library/LaunchAgents`·Claude scheduled-tasks에 있어 git 추적 밖. 시각 다시 바꾸면 메모리 `mfh-mac-wake-notification-timing`(V5로 갱신됨) 절차대로 4곳을 동기화해야 함.
- **생성→알림 간격이 좁아짐**: 50분→20분(scheduled task jitter 포함 실질 ~10분). 어쩌다 생성이 알림보다 늦으면 그날 알림에 전날 묵상이 나갈 수 있음. 내일 새벽 `~/Library/Logs/mfh-caffeinate-morning.log`·앱에서 첫 실행 확인 권장. 빠듯하면 생성을 04:30으로 더 당기는 카드.
- **taskId `qt-update-0510`** 은 디렉토리명이라 cron이 04:40으로 바뀌어도 이름의 `0510`은 그대로(혼동 주의, 기능 무관).
- **할일 알림 07:00은 불변**(`/api/push/send` UTC `0 13`). 인사이트 생성(08:00·22:00 scheduled task)은 새벽 블록 밖이지만 기존부터 그러했고 이번 변경과 무관.
- 검증: wake 06/16 04:24 pmset 등록 / `vercel.json` diff·커밋·push 확인 완료. caffeinate 04:25 실제 기동은 내일 로그로 사후 확인.

## 백로그 (v2bo 이월)

1. **`news-update.md` 19행 `url` 안내** — 에이전트 커맨드 설정 자동 차단으로 미적용(기능 무관 — `news-pull.ts`엔 반영). 우진 직접 수정 또는 권한 허용 필요.
2. **선교편지 실제 발송 호** 제작 · 인사이트 상세 리프레시(`LensDetail`·`InsightCard`) · 온두라스 동향·사진·캘린더·중보기도 화면 리프레시 · (보류) 포트폴리오 공개 페이지(`/p/[slug]`) · 첨부/와이드 레이아웃 타 모듈 확장.

*작성: 2026-06-15 세션 종료. 커밋 1d76e86(vercel.json). 메모리 mfh-mac-wake-notification-timing V4→V5 갱신. 직전 v2bo → `docs/archive/`.*
