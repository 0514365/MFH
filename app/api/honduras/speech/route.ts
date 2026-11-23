// MFH-HONDURAS-SPEECH-API-V1
// 시리 단축어용 — 최신 온두라스 동향의 낭독 대본을 text/plain 으로 돌려준다.
// 단축어: "URL 내용 가져오기"(GET, Authorization: Bearer <토큰>) → "텍스트 말하기". 설정 절차 = docs/MFH-SIRI-BRIEFING.md.
// 보호: HONDURAS_SPEECH_TOKEN(Vercel 환경변수). 읽기 전용이며 쓰기용 SMS_INGEST_TOKEN 과 분리한다.
// 대본(speech_script, patch122)이 없으면 제목·본문으로 조립한 본문을 돌려준다(lib/honduras-speech).
import { createAdminClient } from '@/lib/supabase-admin'
import { speechText, type SpeechSource } from '@/lib/honduras-speech'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function plain(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export async function GET(req: Request) {
  const token = process.env.HONDURAS_SPEECH_TOKEN
  if (!token || req.headers.get('authorization') !== `Bearer ${token}`) return plain('unauthorized', 401)

  try {
    const admin = createAdminClient()
    // select('*') — patch122 미적용(speech_script 컬럼 없음)이어도 조회가 실패하지 않게.
    const { data, error } = await admin
      .from('honduras_news')
      .select('*')
      .order('news_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    // 오류·빈 상태도 200 + 말할 문장으로 — 단축어가 그대로 읽어 준다.
    if (!data) return plain('아직 저장된 온두라스 동향이 없습니다.')

    const row = data as SpeechSource & { speech_script?: string | null }
    return plain(speechText(row, row.speech_script))
  } catch (e) {
    console.error('honduras speech failed', e)
    return plain('온두라스 동향을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
  }
}
