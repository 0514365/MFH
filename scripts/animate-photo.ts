// MFH-ANIMATE-PHOTO-V1
// 사진 1장 → fal.ai image-to-video(Kling) 5초 세로 클립. 릴스·영상편지의 대표 컷을 "움직이는 사진"으로.
//   · 키: .env.local 의 FAL_KEY (커밋 금지). 사진은 data URI 로 전송(공개 URL 불필요 — 외부 전송은 fal 서버뿐).
//   · 모델 기본 Kling 2.1 standard(가성비). --model 로 교체. 5초 세로 기준 컷당 수백 원.
//   · 결과: media/out/anim/<사진이름>.mp4 — 같은 이름이 있으면 재생성하지 않는다(비용 보호). --force 로 강제.
// 사용:  npx tsx scripts/animate-photo.ts <사진> [--prompt "..."] [--dur 5] [--model fal-ai/kling-video/v2.1/standard/image-to-video] [--force] [--dry]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { basename, extname, join } from 'path'
import { loadEnv } from './_shared'

const ROOT = process.cwd()
const OUT = join(ROOT, 'media', 'out', 'anim')
const DEFAULT_MODEL = 'fal-ai/kling-video/v2.1/standard/image-to-video'
// 기록 영상이라 "실제 그 순간이 살짝 이어지는" 정도만. 과장·카메라 워크 금지.
const DEFAULT_PROMPT =
  'Subtle natural continuation of this real moment: gentle breathing, small head and hand movements, hair and clothes moving slightly, ' +
  'soft ambient light flicker. Camera almost still with a very slow push-in. Keep every face, body and object exactly as in the photo. ' +
  'Documentary realism, no added people, no text, no effects.'
const NEGATIVE = 'blur, distortion, morphing faces, extra limbs, text, watermark, cartoon, fast motion, camera shake'

function arg(name: string, dflt?: string) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : dflt
}

async function main() {
  const argv = process.argv.slice(2)
  const valued = new Set(['--prompt', '--dur', '--model'])
  const file = argv.find((a, i) => !a.startsWith('--') && !valued.has(argv[i - 1] ?? ''))
  if (!file || !existsSync(file)) throw new Error('사진 경로가 필요합니다: npx tsx scripts/animate-photo.ts <사진.jpg>')
  const model = arg('--model', DEFAULT_MODEL)!
  const dur = arg('--dur', '5')!
  const prompt = arg('--prompt', DEFAULT_PROMPT)!
  const force = process.argv.includes('--force')
  const dry = process.argv.includes('--dry')

  mkdirSync(OUT, { recursive: true })
  const out = join(OUT, basename(file, extname(file)) + '.mp4')
  if (existsSync(out) && !force) {
    console.log(`[animate] 이미 있음(재생성 안 함) → ${out}`)
    return
  }
  const env = loadEnv()
  const key = env.FAL_KEY || process.env.FAL_KEY
  if (!key) throw new Error('.env.local 에 FAL_KEY 가 없습니다 (fal.ai → Keys 에서 발급)')

  const bytes = readFileSync(file)
  const mime = /\.png$/i.test(file) ? 'image/png' : 'image/jpeg'
  const input = {
    image_url: `data:${mime};base64,${bytes.toString('base64')}`,
    prompt, negative_prompt: NEGATIVE, duration: dur, aspect_ratio: '9:16', cfg_scale: 0.5,
  }
  console.log(`[animate] ${basename(file)} · ${model} · ${dur}s · ${(bytes.length / 1024 / 1024).toFixed(1)}MB`)
  if (dry) { console.log('[animate] --dry: 호출 안 함'); return }

  const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' }
  const q = await fetch(`https://queue.fal.run/${model}`, { method: 'POST', headers, body: JSON.stringify(input) })
  if (!q.ok) throw new Error(`요청 실패 ${q.status}: ${(await q.text()).slice(0, 300)}`)
  const { request_id, status_url, response_url } = (await q.json()) as { request_id: string; status_url: string; response_url: string }
  console.log(`[animate] 대기열 ${request_id}`)

  const t0 = Date.now()
  for (;;) {
    await new Promise((r) => setTimeout(r, 5000))
    const s = await fetch(`${status_url}?logs=0`, { headers })
    const st = (await s.json()) as { status: string; queue_position?: number }
    process.stdout.write(`\r[animate] ${st.status}${st.queue_position != null ? ` (대기 ${st.queue_position})` : ''} · ${Math.round((Date.now() - t0) / 1000)}s   `)
    if (st.status === 'COMPLETED') break
    if (st.status === 'FAILED') throw new Error('생성 실패')
    if (Date.now() - t0 > 15 * 60 * 1000) throw new Error('15분 초과')
  }
  console.log()
  const r = await fetch(response_url, { headers })
  const res = (await r.json()) as { video?: { url: string } }
  if (!res.video?.url) throw new Error(`응답에 video 없음: ${JSON.stringify(res).slice(0, 300)}`)
  const mp4 = await fetch(res.video.url)
  writeFileSync(out, Buffer.from(await mp4.arrayBuffer()))
  console.log(`[animate] 완료 → ${out} — 반드시 검수(얼굴·손 뒤틀림) 후 사용`)
}

main().catch((e) => {
  console.error('[animate] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
