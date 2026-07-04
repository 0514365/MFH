// MFH-LETTER-MOBILE-VIEW-V1
// 모바일 편지(HTML) 뷰어 라우트 — Supabase Storage 가 .html 을 text/plain 으로 서빙해
// 브라우저에 소스가 그대로 보이는 문제를 우회한다: 스토리지에서 받아 text/html 로 중계(스트리밍).
// 공개 조건: letters.public_view = true (공개 페이지와 동일 기준). 없거나 비공개면 404.

import { createClient } from '@/lib/supabase-server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: letter } = await supabase
    .from('letters')
    .select('mobile_path, public_view, title')
    .eq('id', id)
    .maybeSingle();

  if (!letter || !letter.public_view || !letter.mobile_path) {
    return new Response('Not found', { status: 404 });
  }

  const { data } = supabase.storage
    .from('portfolio-letters')
    .getPublicUrl(letter.mobile_path);

  const upstream = await fetch(data.publicUrl);
  if (!upstream.ok || !upstream.body) {
    return new Response('Not found', { status: 404 });
  }

  // 스토리지 응답 body 를 그대로 스트리밍하되 Content-Type 만 text/html 로 교정.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
