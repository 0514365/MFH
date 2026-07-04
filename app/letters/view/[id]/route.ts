// MFH-LETTER-MOBILE-VIEW-V2
// 모바일 편지(HTML) 뷰어 라우트 — Supabase Storage 가 .html 을 text/plain 으로 서빙해
// 브라우저에 소스가 그대로 보이는 문제를 우회한다: 스토리지에서 받아 text/html 로 중계(스트리밍).
// 공개 조건: letters.public_view = true (공개 페이지와 동일 기준). 없거나 비공개면 404.
// V2: Open Graph 메타태그 자동 주입 — 페이스북·카톡에 링크를 올리면 표지(og:image)·제목·요약이
//     미리보기 카드로 뜬다. 첫 스트림 청크의 <head> 뒤에 삽입(전체 버퍼링 없이 스트리밍 유지).

import { createClient } from '@/lib/supabase-server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: letter } = await supabase
    .from('letters')
    .select('mobile_path, cover_path, public_view, title, number, summary')
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

  // OG 태그 — 표지 이미지는 스토리지 public URL(이미지는 정상 Content-Type 으로 서빙됨).
  const coverUrl = letter.cover_path
    ? supabase.storage.from('portfolio-letters').getPublicUrl(letter.cover_path).data.publicUrl
    : null;
  const pageUrl = new URL(req.url).origin + `/letters/view/${id}`;
  const desc = (letter.summary ?? '').split('\n').map((s: string) => s.trim()).find(Boolean)
    ?? '온두라스 선교 소식을 전합니다.';
  const title = `${letter.title}${letter.number ? ` · MFH #${letter.number}` : ''}`;
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const og = [
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    coverUrl ? `<meta property="og:image" content="${esc(coverUrl)}" />` : '',
    `<meta property="og:url" content="${esc(pageUrl)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].filter(Boolean).join('\n');

  // 첫 청크의 <head> 바로 뒤에 og 태그 삽입 (크롤러는 문서 초반만 읽으므로 충분).
  let injected = false;
  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      if (!injected) {
        const text = new TextDecoder().decode(chunk);
        const m = text.match(/<head[^>]*>/i);
        if (m && m.index !== undefined) {
          const at = m.index + m[0].length;
          const out = text.slice(0, at) + '\n' + og + '\n' + text.slice(at);
          controller.enqueue(new TextEncoder().encode(out));
          injected = true;
          return;
        }
      }
      controller.enqueue(chunk);
    },
  });

  return new Response(upstream.body.pipeThrough(transform), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
