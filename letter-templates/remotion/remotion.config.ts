// MFH-REMOTION-CONFIG-V1
import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setOverwriteOutput(true)
Config.setConcurrency(4)
Config.setCrf(21) // 25초 기준 ~20MB (기본 18 은 45MB — 폰 전송 한도 초과)
// 헤드리스 셸 다운로드 대신 설치된 Chrome 사용(build-video.py 와 동일 경로)
Config.setBrowserExecutable('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
