// MFH-MAKE-REEL-V1
// fb-update 가 만든 result.json 의 reel 을 영상으로 만든다:
//   사진(journal-photos 버킷) 다운로드 → letter-templates/tools/reel-template.html 채움 → build-video.py → media/out/reel-<week_start>.mp4
// 사용:  npx tsx scripts/make-reel.ts                       (기본 insights-archive/_fb/result.json)
//        npx tsx scripts/make-reel.ts path/to/result.json [--html-only]
// ⚠ repo 루트에서 실행. 장면의 photo 가 로컬에 이미 있는 파일 경로면 다운로드 없이 그대로 쓴다(테스트용).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { basename, join, relative, resolve } from 'path'
import { spawnSync } from 'child_process'
import { loadEnv, createServiceClient, readJsonFile } from './_shared'

type Scene = { photo?: string; clip?: string; label?: string; caption?: string }
type Reel = {
  title?: string; label?: string; date_label?: string; cover_photo?: string
  scenes?: Scene[]; end_line?: string
}
type Result = { week_start?: string; reel?: Reel | null }

const ROOT = process.cwd()
const TEMPLATE = join(ROOT, 'letter-templates', 'tools', 'reel-template.html')
const BUILD = join(ROOT, 'letter-templates', 'tools', 'build-video.py')
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escBr = (s: unknown) => esc(s).replace(/&lt;br\s*\/?&gt;/g, '<br>')

async function main() {
  const args = process.argv.slice(2)
  const htmlOnly = args.includes('--html-only')
  const fileArg = args.find((a) => !a.startsWith('--')) || join(ROOT, 'insights-archive', '_fb', 'result.json')
  const parsed = readJsonFile<Result>(fileArg)
  const reel = parsed.reel
  if (!reel || !Array.isArray(reel.scenes) || !reel.scenes.length) {
    console.log('[make-reel] reel 없음 — 건너뜀')
    return
  }
  const week = parsed.week_start || 'undated'
  const outDir = join(ROOT, 'media', 'out', `reel-${week}`)
  const photoDir = join(outDir, 'photos')
  mkdirSync(photoDir, { recursive: true })

  // 사진 확보 — 로컬 파일이면 그대로, 아니면 journal-photos 에서 다운로드.
  let sb: ReturnType<typeof createServiceClient> | null = null
  const cache = new Map<string, string>()
  async function photoPath(p: string | undefined): Promise<string> {
    if (!p) throw new Error('사진 path 없음')
    if (cache.has(p)) return cache.get(p)!
    let local: string
    if (existsSync(resolve(ROOT, p))) {
      local = resolve(ROOT, p)
    } else {
      sb ??= createServiceClient(loadEnv())
      const { data, error } = await sb.storage.from('journal-photos').download(p)
      if (error || !data) throw new Error(`사진 다운로드 실패 ${p}: ${error?.message ?? '빈 응답'}`)
      local = join(photoDir, basename(p))
      writeFileSync(local, Buffer.from(await data.arrayBuffer()))
    }
    const rel = relative(outDir, local)
    cache.set(p, rel)
    return rel
  }

  // 템플릿 분해 — 표지·사진·클립·마무리 네 블록.
  const tpl = readFileSync(TEMPLATE, 'utf8')
  const block = (cls: string) => {
    const m = tpl.match(new RegExp(`<section class="scene ${cls}"[\\s\\S]*?</section>`))
    if (!m) throw new Error(`템플릿에 ${cls} 장면 없음`)
    return m[0]
  }
  const head = tpl.slice(0, tpl.indexOf('<body>') + '<body>'.length)
  const fill = (html: string, vars: Record<string, string>) =>
    html.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')

  const sections: string[] = []
  sections.push(fill(block('cover'), {
    cover_photo: await photoPath(reel.cover_photo || reel.scenes.find((s) => s.photo)?.photo),
    date_label: esc(reel.date_label || week.slice(0, 7).replace('-', '.')),
    cover_label: esc(reel.label || '이번 주 소식'),
    cover_title: escBr(reel.title || 'MFH 소식'),
  }))
  for (const s of reel.scenes) {
    if (s.clip) {
      const clip = resolve(ROOT, s.clip)
      if (!existsSync(clip)) throw new Error(`클립 없음: ${s.clip}`)
      sections.push(fill(block('clip'), { clip: relative(outDir, clip), label: esc(s.label), caption: esc(s.caption) }))
    } else {
      sections.push(fill(block('photo'), { photo: await photoPath(s.photo), label: esc(s.label), caption: esc(s.caption) }))
    }
  }
  sections.push(fill(block('end'), { end_line: esc(reel.end_line || '') })
    .replace('../assets/logo-white.png', relative(outDir, join(ROOT, 'letter-templates', 'assets', 'logo-white.png'))))

  const html = `${head}\n\n${sections.join('\n\n')}\n\n</body>\n</html>\n`
  const htmlPath = join(outDir, 'reel.html')
  writeFileSync(htmlPath, html)
  console.log(`[make-reel] ${relative(ROOT, htmlPath)} · 장면 ${reel.scenes.length + 2}개`)
  if (htmlOnly) return

  const mp4 = join(ROOT, 'media', 'out', `reel-${week}.mp4`)
  const r = spawnSync('python3', [BUILD, htmlPath, mp4], { stdio: 'inherit' })
  if (r.status !== 0) process.exit(r.status ?? 1)
  console.log(`[make-reel] 완료 → ${relative(ROOT, mp4)} (폰으로 보내 FB/IG 앱에서 음원 선택 후 게시)`)
}

main().catch((e) => {
  console.error('[make-reel] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
