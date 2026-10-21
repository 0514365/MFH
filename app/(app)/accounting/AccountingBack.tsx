'use client'
// MFH-ACCOUNTING-BACK-V3 — 2027 실기 피드백: 화살표 적색(b27-expense) · 연회색 원(b27-card)
// MFH-ACCOUNTING-BACK-V2 — 뒤로 없을 때 모바일(<md)은 자리도 비움(달력 헤더 월 이동이 왼쪽으로)
// MFH-ACCOUNTING-BACK-V1
// 회계 셸 왼쪽 뒤로 — 회계 안에서만 뒤로(직전 회계 화면). 메인홈은 오른쪽 홈 버튼이 담당하므로 회계 밖으로 나가지 않는다.
//   · 회계 안 이동 경로(경로+쿼리)를 sessionStorage 스택에 쌓고, 누르면 직전 화면으로 push(스택 pop).
//   · 회계 셸(layout)이 새로 마운트되면(회계 밖에서 들어옴) 스택을 현재 화면 하나로 초기화.
//   · 직전 화면이 없으면 회계 홈(/accounting, 달력)으로. 이미 회계 홈이고 직전도 없으면 버튼 숨김(자리만 유지).
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const KEY = 'mfh-acct-nav'
const HOME = '/accounting'

function read(): string[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}
function write(stack: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(stack.slice(-30)))
  } catch {
    /* 저장 불가(사파리 개인정보 모드 등) — 홈으로만 동작 */
  }
}

export default function AccountingBack() {
  const router = useRouter()
  const pathname = usePathname()
  const [canBack, setCanBack] = useState(false)
  const entered = useRef(false)

  useEffect(() => {
    const here = pathname + window.location.search
    const stack = entered.current ? read() : []
    entered.current = true
    if (stack.length === 0) stack.push(here)
    else if (stack[stack.length - 1] === here) {
      // 같은 화면(새로고침)
    } else if (stack[stack.length - 2] === here) stack.pop() // 뒤로 온 경우
    else stack.push(here)
    write(stack)
    setCanBack(stack.length > 1 || pathname !== HOME)
  }, [pathname])

  function goBack() {
    const stack = read()
    const prev = stack[stack.length - 2]
    router.push(prev ?? HOME)
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="회계 안에서 뒤로"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-b27-card text-b27-expense transition hover:opacity-80 ${canBack ? '' : 'invisible max-md:hidden'}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  )
}
