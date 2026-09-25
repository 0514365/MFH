// MFH-BIBLE-SEED-V1 — Manna scripts/bible-seed.ts V3 이식(docs/MANNA-TO-MFH-BIBLE-TEXTS.md). 원자료는 BIBLE_DIR(.env.local, 기본 ./Bible).
// Bible/ 원자료(repo 미포함) → bible_texts(patch105) 시딩(service role).
// 사용: npx tsx scripts/bible-seed.ts [nkrv|nkt|esv|all] [--dry]
//   --dry = 파싱·검증 리포트만(DB 안 씀). 시딩은 버전 단위 delete 후 insert(재시딩 안전).
// 전제: 이 Mac(textutil·iconv 계열은 TextDecoder 로 대체) · repo 루트 실행 · patch105 실행 완료.
// 원자료 형식:
//   개역개정  <BIBLE_DIR>/개역개정-text/*.txt (CP949, 1줄 1절 "창1:1 본문", 합절 "신6:18-19")
//             예외 ① "창35:본문…"(절 번호 소실) → 직전 절에 이어붙임 ② 시편 권표제 "시1:제일권" → 다음 절 앞에 <제일권>
//   새한글    <BIBLE_DIR>/새한글성경(NKT)_구약/새한글성경(NKT)_구약.txt + 새한글성경(NKT)_신약/새한글성경(NKT)_신약.txt
//             (UTF-8 합본 2개를 이어 읽음. "책명 N장" / "[소제목]" → 다음 절 앞에 <소제목> / "N 본문" / 이어지는 줄)
//             요한1·2·3서는 "[요한1서 N]" 표지만 있고 책명이 정식(요한일서)과 달라 NKT_BOOK_ALIAS 로 맞춘다.
//             본문이 빈 절(원자료에서 절 본문이 소실된 곳)이 있는 장은 결함 장으로 제외 → 개역개정 폴백. 정경에 없는 장은 리포트만.
//             원자료 결함 보정: ① 시 행이 소제목과 같은 [ ] 로 감싸져 있음(원본 HTML 도 <h2>) → isNktPoetry 로 판별해 직전 절 줄로
//             ② 애가 2~5장 제목이 "[예레미야애가 N]" ③ 같은 장이 두 번(삼하 1장) → 두 번째 블록은 건너뛴다
//   ESV       <BIBLE_DIR>/영어성경 ESV Bible.rtf (textutil 변환. "Gen 1:1 body" + 줄바꿈 연속. "|"→I, 2kKi→2Ki)
//             + esv-fill.txt (RTF 원천에서 소실된 1,063절 — PDF 추출 보충, 같은 "Abbr C:V body" 형식)
//             ESV 가 본문비평상 생략한 17절(막7:16 · 요5:4 · 행8:37 등)은 원래 없음 — 빈 절 아님.
import { execSync } from 'child_process'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { BIBLE_BOOKS } from '../lib/bible/data'
import { chapSeqOf, type BibleVersion } from '../lib/bible/texts'
import { createServiceClient, loadEnv } from './_shared'

// 원자료 폴더: 환경변수 BIBLE_DIR(셸 또는 .env.local) > ./Bible. MFH 는 .env.local 에 BIBLE_DIR=../Manna/Bible.
const BIBLE_DIR = resolve(process.cwd(), process.env.BIBLE_DIR ?? loadEnv().BIBLE_DIR ?? 'Bible')

type Row = {
  version: BibleVersion
  chap_seq: number
  book_order: number
  chapter: number
  verse: number
  verse_end: number | null
  body: string
}

const bookByName = new Map(BIBLE_BOOKS.map((b) => [b.name, b]))
const bookByAbbr = new Map(BIBLE_BOOKS.map((b) => [b.abbr, b]))

function makeRow(v: BibleVersion, order: number, ch: number, verse: number, verseEnd: number | null, body: string): Row {
  // \u0000 = 일부 원자료 파일 끝 NUL 패딩 — Postgres text 가 거부하므로 제거
  const clean = body.replace(/\u0000/g, '').trim()
  return { version: v, chap_seq: chapSeqOf(order, ch), book_order: order, chapter: ch, verse, verse_end: verseEnd, body: clean }
}

// ── 개역개정 ────────────────────────────────────────────────────────────────
function parseNkrv(): Row[] {
  const dir = join(BIBLE_DIR, '개역개정-text')
  const rows: Row[] = []
  const dec = new TextDecoder('euc-kr')
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.txt')).sort()) {
    const name = f.replace(/^\d+-\d+/, '').replace(/\.txt$/, '')
    const book = bookByName.get(name)
    if (!book) throw new Error(`책명을 찾지 못함: ${f}`)
    const verseRe = new RegExp(`^${book.abbr}(\\d+):(\\d+)(?:-(\\d+))?\\s+(.*)$`)
    const brokenRe = new RegExp(`^${book.abbr}(\\d+):(\\D.*)$`)
    let pendingTitle = ''
    for (const raw of dec.decode(readFileSync(dir + '/' + f)).split(/\r?\n/)) {
      const line = raw.trim()
      if (!line) continue
      const m = verseRe.exec(line)
      if (m) {
        const body = (pendingTitle ? pendingTitle + ' ' : '') + m[4]
        pendingTitle = ''
        rows.push(makeRow('nkrv', book.order, Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : null, body))
        continue
      }
      const b = brokenRe.exec(line)
      if (!b) throw new Error(`형식 불명 [${f}]: ${line.slice(0, 60)}`)
      const volume = /^제[일이삼사오]권$/.exec(b[2])
      if (volume) {
        pendingTitle = `<${b[2]}>` // 시편 권표제 → 다음 절 앞에 보존
      } else {
        const prev = rows[rows.length - 1] // 절 번호 소실 = 직전 절 후반부
        if (!prev || prev.chapter !== Number(b[1])) throw new Error(`이어붙일 절 없음 [${f}]: ${line.slice(0, 60)}`)
        prev.body += '\n' + b[2].trim()
      }
    }
  }
  return rows
}

// ── RTF 공통 ────────────────────────────────────────────────────────────────
function rtfToLines(file: string, out: string): string[] {
  const txt = join(tmpdir(), out)
  execSync(`textutil -convert txt -output "${txt}" "${join(BIBLE_DIR, file)}"`)
  return readFileSync(txt, 'utf8').split(/\r?\n/)
}

// ── 새한글 ──────────────────────────────────────────────────────────────────
const NKT_FILES = [
  join('새한글성경(NKT)_구약', '새한글성경(NKT)_구약.txt'),
  join('새한글성경(NKT)_신약', '새한글성경(NKT)_신약.txt'),
]
const NKT_BOOK_ALIAS: Record<string, string> = { 요한1서: '요한일서', 요한2서: '요한이서', 요한3서: '요한삼서' } // 원자료 표기 → BIBLE_BOOKS.name
const nktBookName = (raw: string): string => NKT_BOOK_ALIAS[raw] ?? raw
const NKT_BRACKET = /^\[(.+)\]$/
const NKT_VERSE = /^(\d+)[a-z]?\s+(.*)$/
const NKT_HEAD = /^([가-힣0-9]+)\s*(\d+)장$/
const NKT_UNIT = /^(대손|년째|년[ 이을의에]|일[ 이을의에째]|명(?![령예성백절단])|세[ 에의]|번째|번[ 이을]|개[ 의를]|달[ 이을째]|곱절|마리|규빗|세겔|달란트)/ // 잘린 숫자 뒤 단위(달아나라·명령 등 오인 방지)
const NKT_BOOK_MARK = /^\[([가-힣0-9]+) (\d+)\]$/ // 애가 "[예레미야애가 2]"

// [ ] 줄이 소제목이 아니라 시 행인지(원자료 결함 — 표본 검증 규칙, v2-g):
//   ① 부호로 끝나거나(, . ! ? ; : ” ’ 」 ) ―) 인용부호·줄표로 시작 → 시 행
//   ② 다음 줄도 [ ] → 시 행(연속된 시 행)
//   ③ 다음 줄이 절 번호 없는 이어지는 줄 → 「~다」로 끝나면(「~마다」 제외) 절 중간 소제목, 아니면 시 행
//   ④ 다음 줄이 절·장 제목 → 소제목
function isNktPoetry(text: string, next: string): boolean {
  if (/[,.!?;:”’」)―]$/.test(text) || /^[“‘―]/.test(text)) return true
  if (NKT_BRACKET.test(next)) return true
  if (!next || NKT_VERSE.test(next) || /^\d+$/.test(next) || NKT_HEAD.test(next)) return false
  return !(/다$/.test(text) && !/마다$/.test(text))
}

function parseNkt(): Row[] {
  const lines = NKT_FILES.flatMap((f) => {
    const path = join(BIBLE_DIR, f)
    if (!existsSync(path)) throw new Error(`새한글 원자료 없음: ${f}`)
    return readFileSync(path, 'utf8')
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((l) => l.replace(/\u00a0/g, ' ').trim())
      .concat('') // 파일 경계 = 빈 줄(직전 파일 끝 절에 이어붙지 않도록)
  })
  const rows: Row[] = []
  const seenChapters = new Set<string>()
  let book: (typeof BIBLE_BOOKS)[number] | null = null
  let chapter = 0
  let skipping = false // 이미 나온 장의 중복 블록
  let pendingTitle = ''
  let poetryLines = 0
  let dupChapters = 0
  let unitJoins = 0
  const damaged = new Set<number>()
  lines.forEach((line, i) => {
    if (!line) return
    const mark = NKT_BOOK_MARK.exec(line)
    const head = NKT_HEAD.exec(line) ?? (mark && bookByName.has(nktBookName(mark[1])) ? mark : null)
    if (head && bookByName.has(nktBookName(head[1]))) {
      const name = nktBookName(head[1])
      const key = `${name} ${head[2]}`
      // 애가는 "예레미야애가 1장" 뒤에 "[예레미야애가 1]" 이 또 온다(요한이·삼서도 같음) — 지금 장과 같은 [ ] 표지는 중복이 아니다
      if (mark && book?.name === name && chapter === Number(head[2])) return
      skipping = seenChapters.has(key)
      if (skipping) dupChapters++
      seenChapters.add(key)
      book = bookByName.get(name)!
      chapter = Number(head[2])
      return
    }
    if (head && NKT_HEAD.test(line)) throw new Error(`새한글 책명 불명: ${line}`)
    if (skipping) return

    const title = NKT_BRACKET.exec(line)
    if (title) {
      const next = lines.slice(i + 1).find((l) => l) ?? ''
      const prev = rows[rows.length - 1]
      const inChapter = prev && book && prev.book_order === book.order && prev.chapter === chapter
      if (inChapter && isNktPoetry(title[1], next)) {
        prev.body += '\n' + title[1]
        poetryLines++
      } else if (inChapter && next && !NKT_VERSE.test(next) && !/^\d+$/.test(next) && !NKT_HEAD.test(next)) {
        prev.body += `\n<${title[1]}>` // 절 중간 소제목(창2:4 후반 등) — 그 자리에 둔다(VerseText 가 블록으로 분리)
      } else {
        pendingTitle = `<${title[1]}>`
      }
      return
    }
    // 절 줄 = "N 본문" 또는 번호만 있는 줄("1" — 본문이 숫자로 시작해 다음 줄로 밀린 경우).
    // "49년이…"처럼 숫자가 낱말에 붙은 줄은 절이 아니라 이어지는 본문이다(\s+ 필수).
    const verse = NKT_VERSE.exec(line) ?? /^(\d+)$/.exec(line)
    if (verse && book) {
      const num = Number(verse[1])
      const prev = rows[rows.length - 1]
      // 본문 속 「숫자+단위」(5대손 · 30일 · 32명)가 줄 앞으로 잘려 절 번호처럼 보이는 결함(v2-g):
      // 앞 줄이 문장 부호 없이 끊겼고 이번 줄이 단위 낱말로 시작하면 절이 아니라 앞 절의 이어지는 글이다.
      if (
        prev &&
        prev.book_order === book.order &&
        prev.chapter === chapter &&
        prev.body &&
        !/[.,!?;:”’」)―]$/.test(prev.body) &&
        NKT_UNIT.test(verse[2] ?? '')
      ) {
        prev.body += ` ${num}${verse[2]}`
        unitJoins++
        return
      }
      // 본문이 숫자로 시작하는 절("2년이 지났다" 등)이 절 번호로 오인되는 경우:
      // 같은 장에서 직전에 같은 번호를 이미 썼다면 이번 줄이 진짜 절 — 직전 행의 본문을 그 앞 절로 넘긴다.
      if (prev && prev.book_order === book.order && prev.chapter === chapter && prev.verse === num) {
        const before = rows[rows.length - 2]
        if (before && before.chapter === chapter && before.verse === num - 1) {
          const glue = NKT_UNIT.test(prev.body) || /^[,.]\d/.test(prev.body) ? '' : ' ' // 「3년째」「5,000명」처럼 단위·자릿수가 붙으면 띄우지 않는다
          // 앞 절이 부호 없이 끊긴 문장 중간이면 공백으로, 문장이 끝났으면 줄바꿈으로 잇는다(v2-h)
          const sep = !before.body ? '' : /[.,!?;:”’」)―]$/.test(before.body) ? '\n' : ' '
          before.body += sep + `${prev.verse}${glue}${prev.body}`.trim()
          rows.pop()
        } else {
          damaged.add(chapSeqOf(book.order, chapter)) // 원자료 결함(본문 숫자가 절 번호 줄로 잘림 등) — 장 단위로 뺀다
        }
      }
      const body = (pendingTitle ? pendingTitle + ' ' : '') + (verse[2] ?? '')
      pendingTitle = ''
      rows.push(makeRow('nkt', book.order, chapter, num, null, body))
      return
    }
    const prev = rows[rows.length - 1] // 운문 연속 줄
    if (!prev) throw new Error(`새한글 형식 불명: ${line.slice(0, 60)}`)
    prev.body += '\n' + line
  })
  console.log(`  [nkt] 시 행으로 되돌린 [ ] 줄 ${poetryLines} · 잘린 숫자 되붙임 ${unitJoins} · 중복 장 건너뜀 ${dupChapters}`)
  // 장별 절 번호가 1..N 으로 이어지지 않는 장도 결함으로 본다
  const perChap = new Map<number, number[]>()
  for (const r of rows) perChap.set(r.chap_seq, [...(perChap.get(r.chap_seq) ?? []), r.verse])
  for (const [seq, vs] of perChap) if (vs.some((v, i) => v !== i + 1)) damaged.add(seq)
  // 본문이 빈 절(원자료에서 절 본문 소실 — 행16:17 등)이 있는 장도 결함(v2-h)
  const emptyVerses = rows.filter((r) => !r.body)
  for (const r of emptyVerses) damaged.add(r.chap_seq)
  if (emptyVerses.length)
    console.log(`  [nkt] 본문이 빈 절 ${emptyVerses.length}: ${emptyVerses.map((r) => `${chapLabel(r.chap_seq)}:${r.verse}`).join(' ')}`)
  NKT_DAMAGED = damaged
  return rows.filter((r) => !damaged.has(r.chap_seq))
}

// 새한글 결함 장(시딩 제외 → 화면은 개역개정 폴백). main 이 개역개정 장별 절수와 대조해 리포트한다.
let NKT_DAMAGED = new Set<number>()

function chapLabel(seq: number): string {
  let rest = seq
  for (const b of BIBLE_BOOKS) {
    if (rest <= b.chapters) return `${b.abbr}${rest}`
    rest -= b.chapters
  }
  return String(seq)
}

function nktVerseCheck(nkt: Row[]) {
  // 장별 마지막 절 번호(합절 verse_end 포함) — 행 수는 개역개정 합절 때문에 어긋나므로 쓰지 않는다
  const count = (rows: Row[]) => {
    const m = new Map<number, number>()
    for (const r of rows) m.set(r.chap_seq, Math.max(m.get(r.chap_seq) ?? 0, r.verse_end ?? r.verse))
    return m
  }
  const ref = count(parseNkrv())
  const mine = count(nkt)
  const diff: string[] = []
  for (const [seq, n] of mine) {
    const want = ref.get(seq) ?? 0
    if (n !== want) diff.push(`${chapLabel(seq)} ${n}/${want}`)
  }
  console.log(`  [nkt] 결함으로 제외한 장 ${NKT_DAMAGED.size}: ${[...NKT_DAMAGED].sort((a, b) => a - b).map(chapLabel).join(' ') || '없음'}`)
  // 원자료에 아예 없는 장(정경 1189 기준, 결함 제외와 구분) — 보충 대상 목록
  const absent: number[] = []
  for (let seq = 1; seq <= 1189; seq++) if (!mine.has(seq) && !NKT_DAMAGED.has(seq)) absent.push(seq)
  console.log(`  [nkt] 원자료에 없는 장 ${absent.length}: ${absent.map(chapLabel).join(' ') || '없음'}`)
  console.log(`  [nkt] 개역개정과 장별 마지막 절 차이 ${diff.length}(새한글/개역개정): ${diff.join(' · ') || '없음'}`)
}

// ── ESV ────────────────────────────────────────────────────────────────────
const ESV_ABBRS = [
  'Gen', 'Exo', 'Lev', 'Num', 'Deu', 'Jos', 'Jdg', 'Rut', '1Sa', '2Sa', '1Ki', '2Ki', '1Ch', '2Ch', 'Ezr', 'Neh',
  'Est', 'Job', 'Psa', 'Pro', 'Ecc', 'Sol', 'Isa', 'Jer', 'Lam', 'Eze', 'Dan', 'Hos', 'Joe', 'Amo', 'Oba', 'Jon',
  'Mic', 'Nah', 'Hab', 'Zep', 'Hag', 'Zec', 'Mal', 'Mat', 'Mar', 'Luk', 'Joh', 'Act', 'Rom', '1Co', '2Co', 'Gal',
  'Eph', 'Phi', 'Col', '1Th', '2Th', '1Ti', '2Ti', 'Tit', 'Phm', 'Heb', 'Jam', '1Pe', '2Pe', '1Jo', '2Jo', '3Jo',
  'Jud', 'Rev',
]
const ESV_ALIAS: Record<string, string> = { '2kKi': '2Ki' }

function parseEsv(): Row[] {
  const orderByAbbr = new Map(ESV_ABBRS.map((a, i) => [a, i + 1]))
  const rows: Row[] = []
  const verseRe = /^([1-3]?[A-Za-z]+)\s+(\d+):(\d+)\s*(.*)$/
  for (const raw of rtfToLines('영어성경 ESV Bible.rtf', 'mfh-esv.txt')) {
    const line = raw.trim().replace(/(^|\s)\|(?=\s|$)/g, '$1I') // 깨진 대문자 I 복원
    if (!line || /^(The Holy Bible|English Standard Version)/.test(line)) continue
    const m = verseRe.exec(line)
    const order = m ? orderByAbbr.get(ESV_ALIAS[m[1]] ?? m[1]) : undefined
    if (m && order) {
      rows.push(makeRow('esv', order, Number(m[2]), Number(m[3]), null, m[4]))
      continue
    }
    const prev = rows[rows.length - 1] // 줄바꿈 연속(영문은 공백 연결)
    if (!prev) throw new Error(`ESV 형식 불명: ${line.slice(0, 60)}`)
    prev.body += (prev.body ? ' ' : '') + line
  }
  // 보충 파일 오버레이: RTF 손상 구간(참조·본문이 한 절씩 어긋남)의 절을 PDF 추출본으로 무조건 덮어쓴다
  const fillPath = join(BIBLE_DIR, 'esv-fill.txt')
  if (existsSync(fillPath)) {
    const byKey = new Map(rows.map((r) => [`${r.chap_seq}:${r.verse}`, r]))
    let filled = 0
    for (const line of readFileSync(fillPath, 'utf8').split('\n')) {
      const m = verseRe.exec(line.trim())
      const order = m ? orderByAbbr.get(ESV_ALIAS[m[1]] ?? m[1]) : undefined
      if (!m || !order || !m[4]) continue
      const row = makeRow('esv', order, Number(m[2]), Number(m[3]), null, m[4])
      const cur = byKey.get(`${row.chap_seq}:${row.verse}`)
      if (cur) cur.body = row.body
      else rows.push(row)
      filled++
    }
    console.log(`  esv-fill.txt 보충(덮어쓰기) ${filled}절`)
  }
  const stillEmpty = rows.filter((r) => !r.body)
  if (stillEmpty.length) console.log(`  ★ 본문 없는 절 ${stillEmpty.length} — 시딩에서 제외`)
  return rows.filter((r) => r.body).sort((a, b) => a.chap_seq - b.chap_seq || a.verse - b.verse)
}

// ── 검증 리포트 ─────────────────────────────────────────────────────────────
function report(v: BibleVersion, rows: Row[]) {
  const chapters = new Set(rows.map((r) => r.chap_seq))
  const perBook = new Map<number, number>()
  for (const r of rows) perBook.set(r.book_order, (perBook.get(r.book_order) ?? 0) + 1)
  console.log(`[${v}] 절 행 ${rows.length} · 장 ${chapters.size}/1189 · 책 ${perBook.size}/66`)
  const diffs: string[] = []
  for (const b of BIBLE_BOOKS) {
    const n = perBook.get(b.order)
    if (n === undefined) continue
    const d = n - b.verses
    if (d !== 0) diffs.push(`${b.abbr} ${n}(${d > 0 ? '+' : ''}${d})`)
  }
  if (diffs.length) console.log(`  절수 차이(합절·판 차이 예상): ${diffs.join(' · ')}`)
  const empty = rows.filter((r) => !r.body).length
  if (empty) console.log(`  ★ 빈 본문 ${empty}행`)
}

// ── 실행 ───────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  const dry = args.includes('--dry')
  const target = args.find((a) => !a.startsWith('--')) ?? 'all'
  const parsers: Record<string, () => Row[]> = { nkrv: parseNkrv, nkt: parseNkt, esv: parseEsv }
  const versions = target === 'all' ? (Object.keys(parsers) as BibleVersion[]) : [target as BibleVersion]
  if (versions.some((v) => !parsers[v])) {
    console.error('사용법: npx tsx scripts/bible-seed.ts [nkrv|nkt|esv|all] [--dry]')
    process.exit(1)
  }

  const parsed = versions.map((v) => ({ v, rows: parsers[v]() }))
  for (const { v, rows } of parsed) {
    const keys = new Set<string>()
    for (const r of rows) {
      const k = `${r.chap_seq}:${r.verse}`
      if (keys.has(k)) throw new Error(`[${v}] 중복 키: book ${r.book_order} ${r.chapter}:${r.verse}`)
      keys.add(k)
    }
    report(v, rows)
    if (v === 'nkt') nktVerseCheck(rows)
  }
  if (dry) return

  const supabase = createServiceClient(loadEnv())
  for (const { v, rows } of parsed) {
    const del = await supabase.from('bible_texts').delete().eq('version', v)
    if (del.error) throw new Error(`[${v}] delete 실패: ${del.error.message}`)
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from('bible_texts').insert(rows.slice(i, i + 500))
      if (error) throw new Error(`[${v}] insert 실패(${i}~): ${error.message}`)
    }
    console.log(`[${v}] 시딩 완료 ${rows.length}행`)
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
