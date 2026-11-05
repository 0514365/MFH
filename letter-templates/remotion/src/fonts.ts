// MFH-REMOTION-FONTS-V1 · 한글 폰트는 유니코드 구간별 woff2 가 수백 개다. 전부 받으면 Google Font 로더의 파일당 18초 제한에 걸려
// 렌더가 실패하므로, 렌더 props 에 실제로 쓰인 글자가 든 구간만 받는다. props 를 못 읽으면(Studio 등) 전체를 받는다.
import { getInputProps } from 'remotion'

// 장면 코드에 직접 박힌 문구(props 에 없음)
const FIXED_TEXT = '온두라스 · 김우진 · 서진아 선교사 기도로 함께해 주세요 MFH'

const rangeHas = (range: string, cp: number) =>
  range.split(',').some((part) => {
    const [a, b] = part.trim().replace(/^U\+/i, '').split('-')
    const lo = parseInt(a.replace(/\?/g, '0'), 16)
    const hi = b ? parseInt(b, 16) : parseInt(a.replace(/\?/g, 'F'), 16)
    return cp >= lo && cp <= hi
  })

// 패키지 타입은 'korean' 같은 이름만 허용하지만 실제 키는 '[75]' 같은 번호다.
export const subsetsForText = <S extends string>(unicodeRanges: Record<string, string>): S[] | undefined => {
  const props = JSON.stringify(getInputProps() ?? {})
  if (props.length < 10) return undefined
  const cps = Array.from(new Set(Array.from(props + FIXED_TEXT).map((c) => c.codePointAt(0) as number)))
  const picked = Object.keys(unicodeRanges).filter((k) => cps.some((cp) => rangeHas(unicodeRanges[k], cp)))
  return picked.length ? (picked as S[]) : undefined
}
