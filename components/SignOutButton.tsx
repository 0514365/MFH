// MFH-SIGNOUT-BUTTON-V1
'use client'

import { createClient } from '@/lib/supabase-browser'

// standalone PWA 에서 로그아웃 후 재로그인이 막히는 문제 대응:
// 서버 라우트(쿠키만 삭제) 대신, 클라이언트에서 세션·로컬 잔재까지 비우고
// 하드 내비게이션(window.location)으로 클라이언트 상태를 완전히 리셋한다.
export default function SignOutButton() {
  async function handleSignOut() {
    try {
      await createClient().auth.signOut()
    } catch {
      // 무시 — 아래에서 로컬 잔재까지 정리한다
    }
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('sb-')) localStorage.removeItem(k)
      })
    } catch {
      // localStorage 접근 불가 환경은 무시
    }
    window.location.replace('/login')
  }

  return (
    <button onClick={handleSignOut} className="text-xs text-muted underline">
      로그아웃
    </button>
  )
}
