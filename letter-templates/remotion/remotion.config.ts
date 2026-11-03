// MFH-REMOTION-CONFIG-V1
import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setOverwriteOutput(true)
Config.setConcurrency(4)
Config.setCrf(21) // 25초 기준 ~20MB (기본 18 은 45MB — 폰 전송 한도 초과)
// 설치된 Google Chrome 으로 렌더하면 프레임 누락·타일 반복 깜빡임이 생긴다 → Remotion 전용 Chrome Headless Shell 사용
// (최초 1회 `npx remotion browser ensure` 로 내려받음)
