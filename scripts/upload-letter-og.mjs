// MFH-UPLOAD-LETTER-OG-V1
// 선교편지 발행 마지막 단계: 링크 공유 미리보기용 가로 OG 이미지(1200×630) 를 스토리지에 올린다.
// 뷰어 라우트 app/letters/view/[id]/route.ts 가 mobile_path 와 같은 폴더의 `og-{date8}.jpg` 를 우선 사용한다.
// 사용:  node scripts/upload-letter-og.mjs <date8> <og.jpg>      예) node scripts/upload-letter-og.mjs 20260831 letter-templates/issues/2026-08/og-20260831.jpg
// 키는 .env.local 의 SUPABASE_SERVICE_ROLE_KEY (코드에 키 없음). 우진 "발행 진행" 승인 후에만 실행.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    }),
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const [date8, file] = process.argv.slice(2)
if (!/^\d{8}$/.test(date8 || '') || !file) {
  console.error('사용: node scripts/upload-letter-og.mjs <date8> <og.jpg>')
  process.exit(1)
}

// mobile_path 의 폴더(= user_id) 를 letters 에서 찾는다.
const { data: rows, error: qErr } = await sb
  .from('letters')
  .select('id,number,mobile_path')
  .like('mobile_path', `%mobile-${date8}.htm%`)
if (qErr) throw qErr
if (!rows?.length) {
  console.error(`mobile-${date8}.html 을 가진 편지가 없습니다. import_letters.py --apply 를 먼저 실행하세요.`)
  process.exit(1)
}
const letter = rows[0]
const folder = letter.mobile_path.split('/').slice(0, -1).join('/')
const path = `${folder}/og-${date8}.jpg`

const bytes = readFileSync(file)
const { error } = await sb.storage
  .from('portfolio-letters')
  .upload(path, bytes, { contentType: 'image/jpeg', upsert: true })
if (error) throw error

const url = sb.storage.from('portfolio-letters').getPublicUrl(path).data.publicUrl
console.log(`[OK] og 업로드 — #${letter.number} → ${path} (${(bytes.length / 1024).toFixed(0)}KB)`)
console.log(url)
console.log(`공유 링크: https://mfh-snowy.vercel.app/letters/view/${letter.id}  (카톡·FB 캐시는 각 공유 디버거에서 초기화)`)
