// MFH-PORTFOLIO-TYPES-V1
// 포트폴리오 도메인 타입 + 헬퍼

export type Portfolio = {
  id: string;
  user_id: string;
  slug: string;
  hero_image_url: string | null;
  intro_text: string | null;
  email_public: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  intro_video_url: string | null;
  missionary_a_name: string | null;
  missionary_a_photo_url: string | null;
  missionary_a_bio: string | null;
  missionary_b_name: string | null;
  missionary_b_photo_url: string | null;
  missionary_b_bio: string | null;
  is_public: boolean;
  updated_at: string;
};

export type PortfolioHistory = {
  id: string;
  user_id: string;
  period_text: string;
  title: string;
  is_ongoing: boolean;
  sort_order: number;
  created_at: string;
};

export type PortfolioFormState = {
  slug: string;
  hero_image_url: string;
  intro_text: string;
  email_public: string;
  facebook_url: string;
  youtube_url: string;
  intro_video_url: string;
  missionary_a_name: string;
  missionary_a_photo_url: string;
  missionary_a_bio: string;
  missionary_b_name: string;
  missionary_b_photo_url: string;
  missionary_b_bio: string;
  is_public: boolean;
};

export function emptyPortfolioForm(): PortfolioFormState {
  return {
    slug: 'mfh',
    hero_image_url: '',
    intro_text: '',
    email_public: '',
    facebook_url: '',
    youtube_url: '',
    intro_video_url: '',
    missionary_a_name: '',
    missionary_a_photo_url: '',
    missionary_a_bio: '',
    missionary_b_name: '',
    missionary_b_photo_url: '',
    missionary_b_bio: '',
    is_public: true,
  };
}

export function portfolioToForm(p: Portfolio): PortfolioFormState {
  return {
    slug: p.slug ?? 'mfh',
    hero_image_url: p.hero_image_url ?? '',
    intro_text: p.intro_text ?? '',
    email_public: p.email_public ?? '',
    facebook_url: p.facebook_url ?? '',
    youtube_url: p.youtube_url ?? '',
    intro_video_url: p.intro_video_url ?? '',
    missionary_a_name: p.missionary_a_name ?? '',
    missionary_a_photo_url: p.missionary_a_photo_url ?? '',
    missionary_a_bio: p.missionary_a_bio ?? '',
    missionary_b_name: p.missionary_b_name ?? '',
    missionary_b_photo_url: p.missionary_b_photo_url ?? '',
    missionary_b_bio: p.missionary_b_bio ?? '',
    is_public: p.is_public,
  };
}

// YouTube URL → embed URL 변환
export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // https://youtu.be/VIDEO_ID
  const short = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;
  // https://www.youtube.com/watch?v=VIDEO_ID
  const long = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (long) return `https://www.youtube.com/embed/${long[1]}`;
  return null;
}


// ========== patch61: 사역 영상 ==========

export type PortfolioVideoCategory = {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type PortfolioVideo = {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  youtube_url: string;
  year: number | null;
  sort_order: number;
  created_at: string;
};

// YouTube URL → video id 추출 (watch / youtu.be / shorts / embed 모두 지원)
export function youtubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /[?&]v=([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

// YouTube 썸네일 URL (hqdefault: 480x360, 항상 존재)
export function youtubeThumbnailUrl(url: string | null | undefined): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

// 정규화된 시청 URL (shorts 등도 표준 watch 로)
export function youtubeWatchUrl(url: string | null | undefined): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : (url ?? null);
}
