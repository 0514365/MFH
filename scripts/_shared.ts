// MFH-SCRIPTS-SHARED-V1
// scripts/*-pull·*-push 공통 보일러플레이트 — .env.local 파싱 · Supabase(service role) 초기화 ·
// MFH_USER_ID 검증 · 날짜 검증 · result.json 읽기 · insights-archive JSONL 누적.
// ⚠ repo 루트에서 실행 전제(.env.local·insights-archive 경로가 process.cwd() 기준).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync, appendFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

// .env.local 파싱(따옴표 제거). fetch-letter-materials.mjs 와 동일 규칙.
export function loadEnv(): Record<string, string> {
  const text = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
  return Object.fromEntries(
    text
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
      }),
  )
}

// service role 클라이언트(RLS 우회). URL/KEY 누락 시 안내 후 종료.
export function createServiceClient(env: Record<string, string>): SupabaseClient {
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

// 저장 귀속 user_id(push 전용). 누락 시 안내 후 종료.
export function requireUserId(env: Record<string, string>): string {
  const userId = env.MFH_USER_ID
  if (!userId) {
    console.error(
      'MFH_USER_ID 누락 — .env.local 에 저장 귀속 user_id 를 추가하세요.\n' +
        '  (Supabase 콘솔 Authentication > Users 의 honduras0691@gmail.com ID)',
    )
    process.exit(1)
  }
  return userId
}

// 날짜 형식(YYYY-MM-DD) 최소 검증.
export const isDate = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

// result.json 등 JSON 파일 읽기. 실패 시 안내 후 종료.
export function readJsonFile<T>(path: string): T {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch (e) {
    console.error(`입력(result.json)을 읽지 못했습니다: ${path}\n  ${(e as Error).message}`)
    process.exit(1)
  }
}

// insights-archive/<sub> 폴더 보장 후 JSONL 한 줄 누적(영구 아카이브 — gitignore 대상).
export function appendArchiveJsonl(sub: string, file: string, obj: unknown): void {
  const dir = join(process.cwd(), 'insights-archive', sub)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  appendFileSync(join(dir, file), JSON.stringify(obj) + '\n')
}
