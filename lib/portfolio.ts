// MFH-PORTFOLIO-TYPES-V2
// 포트폴리오 도메인 타입 + 헬퍼
// V2: couple_photo_url / couple_intro (부부사진 + 부부 소개 개요, patch63) 추가.

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
  couple_photo_url: string | null;
  couple_intro: string | null;
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
  couple_photo_url: string;
  couple_intro: string;
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
    couple_photo_url: '',
    couple_intro: '',
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
    couple_photo_url: p.couple_photo_url ?? '',
    couple_intro: p.couple_intro ?? '',
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


// ========== patch62: 선교편지 (PDF 방식) — MFH-PORTFOLIO-LETTER-TYPES-V1 ==========

export type PortfolioLetter = {
  id: string;
  user_id: string;
  year_month: string;        // "2026-05"
  number: string | null;     // "42" (호수)
  title: string;
  pdf_path: string;          // storage: portfolio-letters
  cover_path: string | null; // 표지 이미지 (선택)
  public_view: boolean;
  sort_order: number;
  created_at: string;
};

// year_month("2026-05") → 년도 문자열 "2026" (파싱 실패 시 "기타")
export function letterYear(yearMonth: string | null | undefined): string {
  if (!yearMonth) return '기타';
  const m = yearMonth.match(/^(\d{4})/);
  return m ? m[1] : '기타';
}

// year_month("2026-05") → 월 라벨 "5월" (없으면 빈 문자열)
export function letterMonthLabel(yearMonth: string | null | undefined): string {
  if (!yearMonth) return '';
  const m = yearMonth.match(/^\d{4}-(\d{1,2})/);
  if (!m) return '';
  const mon = parseInt(m[1], 10);
  return mon >= 1 && mon <= 12 ? `${mon}월` : '';
}

// 편지 배열 → 년도별 그룹 (최신 년도 우선). 각 그룹 내부는 입력 정렬 유지.
// 제네릭: PortfolioLetter 또는 URL 확장 타입 모두 허용.
export function groupLettersByYear<T extends Pick<PortfolioLetter, 'year_month'>>(
  letters: T[]
): { year: string; letters: T[] }[] {
  const map = new Map<string, T[]>();
  for (const l of letters) {
    const y = letterYear(l.year_month);
    const arr = map.get(y);
    if (arr) arr.push(l);
    else map.set(y, [l]);
  }
  const years = Array.from(map.keys()).sort((a, b) => {
    if (a === '기타') return 1;
    if (b === '기타') return -1;
    return b.localeCompare(a); // 최신 년도 먼저
  });
  return years.map((year) => ({ year, letters: map.get(year) ?? [] }));
}
