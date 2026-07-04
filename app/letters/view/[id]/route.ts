// MFH-LETTER-MOBILE-VIEW-V3
// 모바일 편지(HTML) 뷰어 라우트 — Supabase Storage 가 .html 을 text/plain 으로 서빙해
// 브라우저에 소스가 그대로 보이는 문제를 우회한다: 스토리지에서 받아 text/html 로 중계(스트리밍).
// 공개 조건: letters.public_view = true (공개 페이지와 동일 기준). 없거나 비공개면 404.
// V2: Open Graph 메타태그 자동 주입 — 페이스북·카톡에 링크를 올리면 표지(og:image)·제목·요약이
//     미리보기 카드로 뜬다. 첫 스트림 청크의 <head> 뒤에 삽입(전체 버퍼링 없이 스트리밍 유지).
// V3: og:image 를 가로(1200×630) 전용 이미지로 — 세로 표지는 미리보기 카드에서 잘리므로,
//     mobile_path 와 같은 폴더의 `og-{date8}.jpg` 가 있으면 그것을 우선 사용(없으면 cover fallback).

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

  // OG 이미지: 가로 전용(og-{date8}.jpg, 1200×630) 우선 → 없으면 세로 표지 fallback.
  // (이미지 파일은 스토리지가 정상 Content-Type 으로 서빙.)
  const storage = supabase.storage.from('portfolio-letters');
  let ogImageUrl: string | null = null;
  let ogWide = false;
  const ogPath = letter.mobile_path.replace(/mobile-(\d{8})\.html?$/i, 'og-$1.jpg');
  if (ogPath !== letter.mobile_path) {
    const candidate = storage.getPublicUrl(ogPath).data.publicUrl;
    try {
      const head = await fetch(candidate, { method: 'HEAD' });
      if (head.ok) {
        ogImageUrl = candidate;
        ogWide = true;
      }
    } catch {
      /* fallback to cover */
    }
  }
  if (!ogImageUrl && letter.cover_path) {
    ogImageUrl = storage.getPublicUrl(letter.cover_path).data.publicUrl;
  }

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
    ogImageUrl ? `<meta property="og:image" content="${esc(ogImageUrl)}" />` : '',
    ogWide ? `<meta property="og:image:width" content="1200" />` : '',
    ogWide ? `<meta property="og:image:height" content="630" />` : '',
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
