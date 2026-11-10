import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

function makeClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Called from a Server Component. Session refresh is handled by middleware.
          }
        },
      },
    }
  )
}

// 한 요청(서버 렌더 1회) 안에서 로그인 확인은 한 번만 — 레이아웃과 페이지가 각각 getUser() 를 불러도
// Supabase Auth 왕복은 1회다. React cache 는 요청 단위라 사용자 간에 섞이지 않는다
// (렌더 밖 — route handler·server action — 에서는 캐시 없이 매번 확인).
const getUserOnce = cache(async () => makeClient(await cookies()).auth.getUser())

export async function createClient() {
  const client = makeClient(await cookies())
  const original = client.auth.getUser.bind(client.auth)
  // 토큰을 직접 넘기는 호출은 그대로 두고, 인자 없는 호출만 요청 단위로 공유.
  client.auth.getUser = ((jwt?: string) => (jwt ? original(jwt) : getUserOnce())) as typeof client.auth.getUser
  return client
}
