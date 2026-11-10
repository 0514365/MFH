// MFH-MAKE-REEL-V6
// V6b: 사진도 zoom+좌우 motion 이면 넓은 훑기(양옆 인물 얼굴)
// V6: 클립 줌·좌우 이동(motion·zoom·focus) — 클립은 1620×2880 으로 떠서 확대해도 선명하게. motion 미지정 시 in/left/out/right 순환
// V5: 클립 장면도 s.dur 지정 가능(기본 릴스 약 60초 설계 대응)
// V3: 선교편지 숏츠용 선택 항목 — reel.durations{cover,scene,end} · 장면·표지 fit:'contain'(가로 사진 무크롭) · end_title · hide_url · out_name
// V4: 하이라이트 숏츠 — reel.variant:'letter' · 장면 dur·position · 자막 \n 줄바꿈
// fb-update 가 만든 result.json 의 reel 을 영상으로 만든다:
//   사진(journal-photos 버킷) 다운로드 → Remotion props JSON → letter-templates/remotion 렌더(무음) → build-video.py --mux(현장음·음악 믹스)
//   → media/out/reel-<week_start>.mp4
// 사용:  npx tsx scripts/make-reel.ts                       (기본 insights-archive/_fb/result.json)
//        npx tsx scripts/make-reel.ts path/to/result.json [--props-only] [--music bgm.mp3]
// ⚠ repo 루트에서 실행. 장면의 photo 가 로컬에 이미 있는 파일 경로면 다운로드 없이 그대로 쓴다(테스트용).
//   자막에 *어절* 을 쓰면 강조색. 클립은 media/raw 의 파일을 public 폴더(media/out/reel-<week>/clips)에 심볼릭 링크로 둔다.
import { copyFileSync, existsSync, mkdirSync, renameSync, writeFileSync } from 'fs'
import { basename, join, relative, resolve } from 'path'
import { spawnSync } from 'child_process'
import { loadEnv, createServiceClient, readJsonFile } from './_shared'

type Scene = { photo?: string; clip?: string; start?: number; audio?: number; label?: string; caption?: string; motion?: string; zoom?: number; focus?: string; animate?: boolean; fit?: 'contain'; dur?: number; position?: string }
type Reel = {
  title?: string; label?: string; date_label?: string; cover_photo?: string
  scenes?: Scene[]; end_line?: string
  durations?: { cover?: number; scene?: number; end?: number }; cover_fit?: 'contain'; end_title?: string; hide_url?: boolean; out_name?: string; variant?: 'letter'
}
type Result = { week_start?: string; reel?: Reel | null }

const ROOT = process.cwd()
const REMOTION = join(ROOT, 'letter-templates', 'remotion')
const BUILD = join(ROOT, 'letter-templates', 'tools', 'build-video.py')
const LOGO = join(ROOT, 'letter-templates', 'assets', 'logo-white.png')
const COVER_DUR = 4, SCENE_DUR = 5, END_DUR = 4, CLIP_AUDIO = 0.6

function arg(name: string) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const args = process.argv.slice(2)
  const propsOnly = args.includes('--props-only')
  const music = arg('--music')
  const fileArg = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--music') || join(ROOT, 'insights-archive', '_fb', 'result.json')
  const parsed = readJsonFile<Result>(fileArg)
  const reel = parsed.reel
  if (!reel || !Array.isArray(reel.scenes) || !reel.scenes.length) {
    console.log('[make-reel] reel 없음 — 건너뜀')
    return
  }
  const week = parsed.week_start || 'undated'
  const outDir = join(ROOT, 'media', 'out', `reel-${week}`)   // = Remotion public dir
  const photoDir = join(outDir, 'photos')
  const clipDir = join(outDir, 'clips')
  mkdirSync(photoDir, { recursive: true })
  mkdirSync(clipDir, { recursive: true })
  copyFileSync(LOGO, join(outDir, 'logo-white.png'))

  // 사진 확보 — 로컬 파일이면 그대로, 아니면 journal-photos 에서 다운로드. 반환값은 public dir 기준 상대경로.
  let sb: ReturnType<typeof createServiceClient> | null = null
  const cache = new Map<string, string>()
  async function photoPath(p: string | undefined): Promise<string> {
    if (!p) throw new Error('사진 path 없음')
    if (cache.has(p)) return cache.get(p)!
    let local: string
    if (existsSync(resolve(ROOT, p))) {
      local = join(photoDir, basename(p))
      if (!existsSync(local)) copyFileSync(resolve(ROOT, p), local)
    } else {
      local = join(photoDir, basename(p))
      if (!existsSync(local)) {
        sb ??= createServiceClient(loadEnv())
        const { data, error } = await sb.storage.from('journal-photos').download(p)
        if (error || !data) throw new Error(`사진 다운로드 실패 ${p}: ${error?.message ?? '빈 응답'}`)
        writeFileSync(local, Buffer.from(await data.arrayBuffer()))
      }
    }
    shrink(local)
    const rel = relative(outDir, local)
    cache.set(p, rel)
    return rel
  }
  // 원본 4000px 급 사진은 Chrome 래스터가 불안정(프레임 누락·타일 반복) → 긴 변 2400px 이하로 줄여 둔다(1080×1920 + 켄번즈 7% 에 충분).
  function shrink(file: string) {
    const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' })
    const [w, h] = (r.stdout || '').trim().split(',').map(Number)
    if (!w || !h || Math.max(w, h) <= 2400) return
    const tmp = file + '.tmp.jpg'
    const s = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-vf', "scale='if(gt(iw,ih),2400,-2)':'if(gt(iw,ih),-2,2400)'", '-q:v', '2', tmp])
    if (s.status === 0) renameSync(tmp, file)
  }
  // 클립: Remotion public 폴더는 심볼릭 링크를 못 따라가므로, 장면 길이만큼 잘라 세로 1080×1920 mp4 로 변환해 둔다(무음 — 현장음은 원본에서 믹스).
  function clipPath(p: string, start: number, dur: number): string {
    const src = resolve(ROOT, p)
    if (!existsSync(src)) throw new Error(`클립 없음: ${p}`)
    const out = join(clipDir, basename(src).replace(/\.[^.]+$/, '') + `-${start}s-${dur}d-hq.mp4`)
    if (!existsSync(out)) {
      const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(start), '-t', String(dur + 0.5), '-i', src,
        '-vf', 'scale=1620:2880:force_original_aspect_ratio=increase,crop=1620:2880,fps=30', '-an',
        '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-pix_fmt', 'yuv420p', out], { stdio: 'inherit' })
      if (r.status !== 0) throw new Error(`클립 변환 실패: ${p}`)
    }
    return relative(outDir, out)
  }

  const coverDur = reel.durations?.cover ?? COVER_DUR, sceneDur = reel.durations?.scene ?? SCENE_DUR, endDur = reel.durations?.end ?? END_DUR
  const scenes: Record<string, unknown>[] = []
  const CLIP_MOTIONS = ['in', 'right', 'out', 'left']
  let clipN = 0
  scenes.push({
    kind: 'cover', dur: coverDur, ...(reel.cover_fit ? { fit: reel.cover_fit } : {}),
    photo: await photoPath(reel.cover_photo || reel.scenes.find((s) => s.photo)?.photo),
    date_label: reel.date_label || week.slice(0, 7).replace('-', '.'),
    label: reel.label || '이번 주 소식',
    title: reel.title || 'MFH 소식',
  })
  for (const s of reel.scenes) {
    // animate: true → fal.ai(Kling) 로 사진을 5초 클립으로(scripts/animate-photo.ts, 같은 사진은 재생성 안 함) → 무음 클립 장면
    if (s.animate && s.photo && !s.clip) {
      const local = join(photoDir, basename(s.photo))
      await photoPath(s.photo)
      const r = spawnSync('npx', ['tsx', join(ROOT, 'scripts', 'animate-photo.ts'), local], { stdio: 'inherit' })
      const anim = join(ROOT, 'media', 'out', 'anim', basename(local).replace(/\.[^.]+$/, '') + '.mp4')
      if (r.status !== 0 || !existsSync(anim)) {
        console.warn(`[make-reel] 애니메이션 실패 → 켄번즈로 대체: ${basename(local)}`)
      } else {
        scenes.push({ kind: 'clip', dur: sceneDur, clip: clipPath(relative(ROOT, anim), 0, sceneDur), start: 0, audio: 0,
          label: s.label || '', caption: s.caption || '' })
        continue
      }
    }
    if (s.clip) {
      const start = s.start ?? 0
      const d = s.dur ?? sceneDur
      scenes.push({ kind: 'clip', dur: d, clip: clipPath(s.clip, start, d), start: 0,
        audio: s.audio ?? CLIP_AUDIO, audio_src: resolve(ROOT, s.clip), audio_start: start,
        motion: s.motion ?? CLIP_MOTIONS[clipN++ % CLIP_MOTIONS.length], ...(s.zoom ? { zoom: s.zoom } : {}), ...(s.focus ? { focus: s.focus } : {}),
        label: s.label || '', caption: s.caption || '' })
    } else {
      scenes.push({ kind: 'photo', dur: s.dur ?? sceneDur, photo: await photoPath(s.photo), label: s.label || '', caption: s.caption || '',
        ...(s.motion ? { motion: s.motion } : {}), ...(s.fit ? { fit: s.fit } : {}), ...(s.position ? { position: s.position } : {}), ...(s.zoom ? { zoom: s.zoom } : {}), ...(s.focus ? { focus: s.focus } : {}) })
    }
  }
  scenes.push({ kind: 'end', dur: endDur, end_line: reel.end_line || '', logo: 'logo-white.png',
    ...(reel.end_title ? { title: reel.end_title } : {}), ...(reel.hide_url ? { hide_url: true } : {}) })

  const propsPath = join(outDir, 'reel.props.json')
  writeFileSync(propsPath, JSON.stringify({ scenes, ...(reel.variant ? { variant: reel.variant } : {}) }, null, 2))
  console.log(`[make-reel] ${relative(ROOT, propsPath)} · 장면 ${scenes.length}개`)
  if (propsOnly) return

  // 1) Remotion 렌더(무음)
  const silent = join(outDir, 'reel-silent.mp4')
  const r1 = spawnSync('npx', ['remotion', 'render', 'src/index.ts', 'Reel', silent, `--public-dir=${outDir}`, `--props=${propsPath}`, '--log=error', '--timeout=180000'],
    { cwd: REMOTION, stdio: 'inherit' })
  if (r1.status !== 0) process.exit(r1.status ?? 1)

  // 2) 오디오 믹스(현장음·음악·음성) + 먹싱
  const mp4 = join(ROOT, 'media', 'out', reel.out_name || `reel-${week}.mp4`)
  const r2 = spawnSync('python3', [BUILD, propsPath, mp4, '--mux', silent, ...(music ? ['--music', music] : [])], { stdio: 'inherit' })
  if (r2.status !== 0) process.exit(r2.status ?? 1)
  console.log(`[make-reel] 완료 → ${relative(ROOT, mp4)} (폰으로 보내 FB/IG 앱에서 음원 선택 후 게시)`)
}

main().catch((e) => {
  console.error('[make-reel] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
