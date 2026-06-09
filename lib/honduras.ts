// MFH-HONDURAS-LIB-V1
// 온두라스 동향 — 같은 날짜 내 순번(넘버링) 계산.
// 같은 news_date 에 동향이 여러 개면 생성순(created_at asc)으로 1,2,3… 을 매겨 "날짜 (N)" 으로 구분한다.
import type { SupabaseClient } from '@supabase/supabase-js'

// 주어진 행이 같은 news_date 안에서 몇 번째(생성순)인지 → " (N)" 접미사. 그날 1개뿐이면 빈 문자열.
export async function seqSuffix(
  supabase: SupabaseClient,
  newsDate: string,
  id: string,
): Promise<string> {
  const { data } = await supabase
    .from('honduras_news')
    .select('id,created_at')
    .eq('news_date', newsDate)
    .order('created_at', { ascending: true })
  const arr = (data ?? []) as { id: string; created_at: string }[]
  if (arr.length <= 1) return ''
  const idx = arr.findIndex((x) => x.id === id)
  return idx >= 0 ? ` (${idx + 1})` : ''
}
