// MFH-CLASE-COREANO-EXPORT-V1
// 한글학교(UNAH·ICAS) 일지·사진·영상 목록을 Clase Coreano 폴더의 `MFH자료/` 로 내보낸다(단방향 · 반복 실행 안전).
//   · 대상 일지: 분류 '한글학교' + 제목·장소에 UNAH/ICAS/한글 등이 있는 일지 + config.includeIds − config.excludeIds.
//     본문에만 언급된 일지는 내보내지 않고 `일지.md` 끝 "제외된 후보" 에 id 와 함께 적는다.
//   · 비공개·비밀글 제외. 일지 글은 제목·오늘 한 일·장소·사진 캡션만(묵상·기도·감사 제외).
//   · 겹치는 사진: Clase Coreano `Photos/` 에 이미 있는 사진은 보내지 않는다 — 촬영 시각(EXIF)과 이미지 지문(dHash)이 함께 맞거나, 지문이 거의 같을 때.
//     나중에 `Photos/` 에 같은 사진이 들어오면 다음 실행 때 내보낸 사본을 지운다.
//   · 영상: 복사하지 않고 `media/raw` 의 해당 날짜 클립 경로만 `영상목록.md` 에 적는다(`Photos/` 에 있는 것은 표시).
//   · 스크립트가 지우는 파일은 자신이 만든 것(_state.json 에 기록된 것)뿐이다. `Photos/` 는 읽기만 한다.
// 사용:  npx tsx scripts/clase-coreano-export.ts            (증분 동기화)
//        npx tsx scripts/clase-coreano-export.ts --dry      (무엇이 바뀔지만 출력)
// 자동:  ~/Library/LaunchAgents/com.mfh.clase-coreano-export.plist (하루 1회 21:30)
// ⚠ repo 루트에서 실행(.env.local·media 경로가 process.cwd() 기준).
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, rmSync, mkdtempSync } from 'fs'
import { join, extname, basename } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'
import sharp from 'sharp'
import exifr from 'exifr'
import { loadEnv, createServiceClient } from './_shared'

type Photo = {
  path?: string
  caption?: string | null
  ai_caption?: string | null
  place_name?: string | null
  taken_at?: string | null
  meta?: Record<string, unknown> | null
}
type Row = {
  id: string
  entry_date: string | null
  category: string | null
  headline: string | null
  today: string | null
  place_name: string | null
  photos: Photo[] | null
  photo_path: string | null
  photo_taken_at: string | null
  is_private: boolean | null
  is_secret: boolean | null
}
type Config = { dest: string; includeIds: string[]; excludeIds: string[] }
// 지문 캐시: Photos/ 파일(이름:크기:수정시각) → 촬영 시각(epoch 초)·dHash(16진).
type Finger = { t: number | null; h: string | null }
type State = {
  exported: Record<string, string> // storage path → 내보낸 파일명
  localCache: Record<string, Finger>
  remoteHash: Record<string, string> // storage path → dHash
}

const BUCKET = 'journal-photos'
const OUT_DIR = 'MFH자료'
const KEYWORD = /UNAH|ICAS|한글|한국어|Rinc[oó]n\s*Coreano|Coreano/i
const IMAGE_EXT = /\.(jpe?g|png|webp|heic|heif)$/i
const VIDEO_EXT = /\.(mov|mp4|m4v)$/i
const HASH_TIME_NEAR = 12 // 촬영 시각이 같을 때 허용하는 dHash 거리(실측: 같은 사진 0~3, 연속 촬영 25~30).
const HASH_NEAR = 5 // dHash 해밍 거리 이하면 같은 사진으로 본다(64비트 중).

const dry = process.argv.includes('--dry')
const log = (s: string) => console.log(`[${new Date().toISOString().slice(0, 19)}] ${s}`)

// 9×8 회색조 차분 해시(64비트 → 16진 16자). 크기·압축이 달라도 같은 사진이면 거의 같다.
async function dHash(input: Buffer | string): Promise<string | null> {
  try {
    const px = await sharp(input).rotate().greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer()
    let bits = ''
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? '1' : '0'
    let hex = ''
    for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16)
    return hex
  } catch {
    return null
  }
}
function hamming(a: string, b: string): number {
  let n = 0
  for (let i = 0; i < 16; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16)
    while (x) {
      n += x & 1
      x >>= 1
    }
  }
  return n
}
// 촬영 시각(epoch 초). 기기·브라우저의 시간대 해석 차이는 비교 단계에서 정시 단위 오차로 흡수한다.
async function exifTime(input: Buffer | string): Promise<number | null> {
  try {
    const e = await exifr.parse(input, ['DateTimeOriginal'])
    const d = e?.DateTimeOriginal
    return d instanceof Date && !isNaN(d.getTime()) ? Math.floor(d.getTime() / 1000) : null
  } catch {
    return null
  }
}
// 두 촬영 시각이 같은 순간인가 — 초 단위 일치, 또는 시간대 해석 차이(정시 배수, ±14h)만 나는 경우.
function sameMoment(a: number, b: number): boolean {
  const d = Math.abs(a - b)
  return d === 0 || (d % 3600 === 0 && d <= 14 * 3600)
}

function photosOf(r: Row): Photo[] {
  if (Array.isArray(r.photos) && r.photos.length) return r.photos.filter((p) => p && p.path)
  return r.photo_path ? [{ path: r.photo_path, taken_at: r.photo_taken_at }] : []
}
function org(text: string): string {
  const u = /UNAH/i.test(text)
  const i = /ICAS/i.test(text)
  return u && i ? 'UNAH·ICAS' : u ? 'UNAH' : i ? 'ICAS' : '미분류'
}
const clean = (s: string | null | undefined) => (s && s.trim() ? s.trim() : '')

async function main() {
  const cfg = JSON.parse(readFileSync(join(process.cwd(), 'scripts/clase-coreano-export.config.json'), 'utf8')) as Config
  if (!existsSync(cfg.dest)) {
    console.error(`대상 폴더가 없습니다: ${cfg.dest}`)
    process.exit(1)
  }
  const outDir = join(cfg.dest, OUT_DIR)
  const photoDir = join(outDir, '사진')
  const statePath = join(outDir, '_state.json')
  const state: State = existsSync(statePath)
    ? (JSON.parse(readFileSync(statePath, 'utf8')) as State)
    : { exported: {}, localCache: {}, remoteHash: {} }
  if (!dry) mkdirSync(photoDir, { recursive: true })

  // ── 1) Clase Coreano Photos/ 지문(촬영 시각 + dHash). 캐시에 없는 파일만 계산. ──
  const localDir = join(cfg.dest, 'Photos')
  const localFiles = existsSync(localDir) ? readdirSync(localDir).filter((f) => !f.startsWith('.')) : []
  const localVideoStems = new Set(
    localFiles.filter((f) => VIDEO_EXT.test(f)).map((f) => basename(f, extname(f)).toLowerCase()),
  )
  const tmp = mkdtempSync(join(tmpdir(), 'mfh-cc-'))
  const cache: Record<string, Finger> = {}
  const local: { name: string; t: number | null; h: string | null }[] = []
  for (const f of localFiles.filter((x) => IMAGE_EXT.test(x))) {
    const full = join(localDir, f)
    const st = statSync(full)
    const key = `${f}:${st.size}:${Math.floor(st.mtimeMs)}`
    let fp = state.localCache[key]
    if (!fp) {
      const t = await exifTime(full)
      let h: string | null
      if (/\.hei[cf]$/i.test(f)) {
        // sharp 가 HEIC 를 못 읽어 sips 로 임시 JPG 변환 후 해시(원본은 그대로).
        const j = join(tmp, f + '.jpg')
        try {
          execFileSync('/usr/bin/sips', ['-s', 'format', 'jpeg', '-Z', '512', full, '--out', j], { stdio: 'ignore' })
          h = await dHash(j)
        } catch {
          h = null
        }
      } else h = await dHash(full)
      fp = { t, h }
    }
    cache[key] = fp
    local.push({ name: f, ...fp })
  }
  state.localCache = cache
  rmSync(tmp, { recursive: true, force: true })

  // ── 2) 대상 일지 고르기. ──
  const sb = createServiceClient(loadEnv())
  const { data, error } = await sb
    .from('journal_entries')
    .select('id,entry_date,category,headline,today,place_name,photos,photo_path,photo_taken_at,is_private,is_secret')
    .order('entry_date', { ascending: true })
  if (error) {
    console.error('조회 오류:', error.message)
    process.exit(1)
  }
  const rows = (data as Row[]).filter((r) => !r.is_private && !r.is_secret)
  const picked: Row[] = []
  const candidates: Row[] = []
  for (const r of rows) {
    if (cfg.excludeIds.includes(r.id)) continue
    const places = [r.place_name, ...photosOf(r).map((p) => p.place_name)].join(' ')
    const strong = r.category === '한글학교' || KEYWORD.test(`${r.headline ?? ''} ${places}`)
    if (strong || cfg.includeIds.includes(r.id)) picked.push(r)
    else if (KEYWORD.test(r.today ?? '')) candidates.push(r)
  }

  // ── 3) 사진: 겹침 판별 → 새 사진만 내려받기. ──
  const wanted = new Set<string>()
  const md: string[] = []
  let nNew = 0
  let nDup = 0
  let nKept = 0
  for (const r of picked) {
    const text = `${r.headline ?? ''} ${r.place_name ?? ''} ${r.today ?? ''}`
    md.push(`## ${r.entry_date} · ${clean(r.headline) || '(제목 없음)'}`, '')
    md.push(`- 기관: ${org(text)} · 분류: ${r.category ?? '—'} · 장소: ${clean(r.place_name) || '—'}`, '')
    if (clean(r.today)) md.push(clean(r.today), '')
    const photos = photosOf(r)
    if (photos.length) md.push('| 사진 | 캡션 |', '|---|---|')
    for (const p of photos) {
      const path = p.path as string
      const cap = (clean(p.caption) || clean(p.ai_caption) || '—').replace(/\|/g, '/').replace(/\n/g, ' ')
      const takenIso = typeof p.meta?.takenAt === 'string' ? (p.meta.takenAt as string) : null
      let t = takenIso ? Math.floor(new Date(takenIso).getTime() / 1000) : null
      if (t !== null && isNaN(t)) t = null

      // 이미지 지문은 내려받아야 계산된다 — 한 번 계산하면 state 에 보관해 다음 실행부터는 내려받지 않는다.
      let buf: Buffer | null = null
      let h = state.remoteHash[path]
      if (!h) {
        const dl = await sb.storage.from(BUCKET).download(path)
        if (dl.error || !dl.data) {
          log(`내려받기 실패: ${path} — ${dl.error?.message ?? ''}`)
          md.push(`| (내려받기 실패) | ${cap} |`)
          continue
        }
        buf = Buffer.from(await dl.data.arrayBuffer())
        h = (await dHash(buf)) ?? ''
        if (h) state.remoteHash[path] = h
      }
      // 같은 사진 = (촬영 시각 일치 + 이미지 근접) 또는 (이미지 거의 동일).
      // 시각만으로는 판정하지 않는다 — 같은 1초에 찍힌 연속 사진은 서로 다른 사진이다.
      const dist = (l: { h: string | null }) => (h && l.h ? hamming(l.h, h) : null)
      let why = '촬영 시각·이미지 일치'
      let dup = local.find((l) => {
        if (t === null || l.t === null || !sameMoment(l.t, t)) return false
        const d = dist(l)
        return d === null || d <= HASH_TIME_NEAR
      })
      if (!dup) {
        why = '이미지 일치'
        dup = local.find((l) => {
          const d = dist(l)
          return d !== null && d <= HASH_NEAR
        })
      }

      if (dup) {
        nDup++
        md.push(`| 보내지 않음 — \`Photos/${dup.name}\` 와 같은 사진(${why}) | ${cap} |`)
        continue
      }
      const stem = basename(path, extname(path)).split('-').pop()
      const name = state.exported[path] ?? `${r.entry_date}_${stem}${extname(path).toLowerCase()}`
      wanted.add(path)
      const full = join(photoDir, name)
      if (existsSync(full)) nKept++
      else {
        nNew++
        if (!dry) {
          if (!buf) {
            const dl = await sb.storage.from(BUCKET).download(path)
            if (dl.error || !dl.data) {
              log(`내려받기 실패: ${path} — ${dl.error?.message ?? ''}`)
              md.push(`| (내려받기 실패) | ${cap} |`)
              continue
            }
            buf = Buffer.from(await dl.data.arrayBuffer())
          }
          writeFileSync(full, buf)
        }
      }
      state.exported[path] = name
      md.push(`| \`${OUT_DIR}/사진/${name}\` | ${cap} |`)
    }
    md.push('')
  }

  // ── 4) 더는 대상이 아닌 사본 지우기(비공개 전환·삭제·Photos/ 에 같은 사진이 생긴 경우). ──
  let nGone = 0
  for (const [path, name] of Object.entries(state.exported)) {
    if (wanted.has(path)) continue
    nGone++
    if (!dry) {
      rmSync(join(photoDir, name), { force: true })
      delete state.exported[path]
    }
  }

  // ── 5) 영상 목록: 대상 일지 날짜의 media/raw 클립 경로. ──
  const dates = new Set(picked.map((r) => r.entry_date).filter(Boolean) as string[])
  const rawRoot = join(process.cwd(), 'media/raw')
  const clips: { date: string; file: string; mb: number; have: boolean }[] = []
  const walk = (dir: string) => {
    if (!existsSync(dir)) return
    for (const f of readdirSync(dir)) {
      const full = join(dir, f)
      const st = statSync(full)
      if (st.isDirectory()) walk(full)
      else if (VIDEO_EXT.test(f) && dates.has(f.slice(0, 10))) {
        // 파일명: YYYY-MM-DD-HHMM-<원본이름>.mov → 원본이름으로 Photos/ 보유 여부 확인.
        const origin = basename(f, extname(f)).slice(16).toLowerCase()
        clips.push({ date: f.slice(0, 10), file: full, mb: Math.round(st.size / 1e6), have: localVideoStems.has(origin) })
      }
    }
  }
  walk(rawRoot)
  clips.sort((a, b) => a.file.localeCompare(b.file))
  const headlineOf = (d: string) => picked.filter((r) => r.entry_date === d).map((r) => clean(r.headline)).join(' / ')
  const vmd = [
    '# 영상 목록 (MFH → Clase Coreano · 자동 생성)',
    '',
    `> 갱신 ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · 영상은 용량 때문에 복사하지 않는다. 필요한 클립은 아래 경로에서 직접 읽어 쓴다.`,
    '> 같은 날 찍은 클립을 모두 적었으므로 한글수업과 무관한 장면이 섞여 있을 수 있다 — 쓰기 전에 내용을 확인한다.',
    '',
    '| 날짜 | 그날 일지 | 경로 | MB | Photos/ 보유 |',
    '|---|---|---|---|---|',
    ...clips.map((c) => `| ${c.date} | ${headlineOf(c.date)} | \`${c.file}\` | ${c.mb} | ${c.have ? '있음' : '—'} |`),
    '',
  ]

  // ── 6) 문서 쓰기. ──
  const head = [
    '# 한글학교 일지 (MFH → Clase Coreano · 자동 생성)',
    '',
    `> 갱신 ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · 일지 ${picked.length}건 · 내보낸 사진 ${nNew + nKept}장 · 겹쳐서 보내지 않은 사진 ${nDup}장`,
    '> 이 파일과 `사진/` 은 MFH `scripts/clase-coreano-export.ts` 가 덮어쓴다 — 여기서 직접 고치지 않는다.',
    '> 학생 얼굴 게시 동의됨(2026-11-24 확인). 수료증의 학생 실명은 가린다.',
    '',
  ]
  const tail = candidates.length
    ? [
        '## 제외된 후보 (본문에만 한글수업이 언급된 일지)',
        '',
        '> 넣으려면 MFH `scripts/clase-coreano-export.config.json` 의 `includeIds` 에 id 를 추가한다.',
        '',
        '| 날짜 | 분류 | 제목 | 사진 | id |',
        '|---|---|---|---|---|',
        ...candidates.map(
          (r) => `| ${r.entry_date} | ${r.category ?? '—'} | ${clean(r.headline)} | ${photosOf(r).length} | \`${r.id}\` |`,
        ),
        '',
      ]
    : []
  if (!dry) {
    writeFileSync(join(outDir, '일지.md'), [...head, ...md, ...tail].join('\n'))
    writeFileSync(join(outDir, '영상목록.md'), vmd.join('\n'))
    writeFileSync(statePath, JSON.stringify(state, null, 1))
  }
  log(
    `${dry ? '[dry] ' : ''}일지 ${picked.length}건 · 새 사진 ${nNew} · 유지 ${nKept} · 겹침 제외 ${nDup} · 사본 삭제 ${nGone} · 영상 ${clips.length}개(보유 ${clips.filter((c) => c.have).length}) · 제외 후보 ${candidates.length}건`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
