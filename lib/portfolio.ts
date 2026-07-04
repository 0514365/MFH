// MFH-PORTFOLIO-TYPES-V8
// 포트폴리오 도메인 타입 + 헬퍼
// V2: couple_photo_url / couple_intro (부부사진 + 부부 소개 개요, patch63) 추가.
// V3: youtubeVideoId 에 live/ 패턴 추가(라이브 영상 썸네일 지원).
// V4: portfolio_videos.thumbnail_url(커스텀 썸네일, patch66) + VIDEO_BANNER_RAMP(브랜드 배너 그라데이션) 추가.
// V5: letters.summary(최신 선교편지 요약 기도문, patch67) + LETTER_BANNER_RAMP(앰버·세피아 년도 배너) 추가.
// V6: donation_info(후원 안내 — 푸터 후원방법 블록, patch68) 추가.
// V7: letters.video_url(영상 편지 — PDF 없이 YouTube 영상만, patch81) + pdf_path nullable.
// V8: letters.mobile_path(모바일 편지 HTML — 사진 임베드 단일 파일). 링크 우선순위 모바일→PDF→영상,
//     둘 다 있으면 부 링크(letterSubLink)로 PDF 병기.

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
  donation_info: string | null;
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
  donation_info: string;
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
    donation_info: '',
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
    donation_info: p.donation_info ?? '',
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
  thumbnail_url: string | null; // 커스텀 썸네일(재생목록·FB 등 YouTube 썸네일 없는 영상용, patch66)
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
    /youtube\.com\/live\/([A-Za-z0-9_-]{6,})/,
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

// 영상 표시 썸네일: 커스텀 썸네일 → YouTube 썸네일 → null(placeholder)
export function videoThumbnail(
  v: Pick<PortfolioVideo, 'thumbnail_url' | 'youtube_url'>,
): string | null {
  return (v.thumbnail_url && v.thumbnail_url.trim()) || youtubeThumbnailUrl(v.youtube_url);
}

// 사역 영상 배너 브랜드 그라데이션 램프 (마룬 옅음→진함, 각 배너 가로 그라데이션).
// 그룹 순서(sort_order)대로 배정. text=사역명 글자색(밝은 배너=마룬 / 진한 배너=흰색).
export const VIDEO_BANNER_RAMP = [
  { from: '#F4E1DF', to: '#D9BFBE', text: '#5E1B1C' },
  { from: '#D9BFBE', to: '#BE9E9D', text: '#5E1B1C' },
  { from: '#BE9E9D', to: '#A47C7C', text: '#FFFFFF' },
  { from: '#A47C7C', to: '#895A5B', text: '#FFFFFF' },
  { from: '#895A5B', to: '#6E393A', text: '#FFFFFF' },
  { from: '#6E393A', to: '#531719', text: '#FFFFFF' },
] as const;

// 그룹 인덱스 → 램프 항목 (그룹이 6개 초과면 순환)
export function videoBannerStyle(index: number) {
  return VIDEO_BANNER_RAMP[index % VIDEO_BANNER_RAMP.length];
}


// ========== patch62: 선교편지 (PDF 방식) — MFH-PORTFOLIO-LETTER-TYPES-V1 ==========

export type PortfolioLetter = {
  id: string;
  user_id: string;
  year_month: string;        // "2026-05"
  number: string | null;     // "42" (호수)
  title: string;
  pdf_path: string | null;   // storage: portfolio-letters (영상 편지는 null — patch81)
  mobile_path: string | null; // 모바일 편지 HTML (사진 임베드 단일 파일) — V8
  cover_path: string | null; // 표지 이미지 (선택)
  summary: string | null;    // 요약 기도문(최신호만, patch67) — 공개 "최신 선교편지" 블록 우측 칼럼
  video_url: string | null;  // 영상 편지(PDF 없이 YouTube 영상만) — patch81
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

// 선교편지 년도 배너 램프 (앰버·세피아, 편지지·봉투 톤). 옅음(최신 년도)→진함(과거).
// 그룹 순서(최신 년도=0)대로 배정. text=년도 글자색(밝은 배너=세피아 / 진한 배너=흰색).
export const LETTER_BANNER_RAMP = [
  { from: '#F3E7D0', to: '#E7D3AE', text: '#5A4424' },
  { from: '#E7D3AE', to: '#D8BC88', text: '#5A4424' },
  { from: '#D8BC88', to: '#C19E5F', text: '#5A4424' },
  { from: '#C19E5F', to: '#A07B40', text: '#FFFFFF' },
  { from: '#A07B40', to: '#7E5C2E', text: '#FFFFFF' },
  { from: '#7E5C2E', to: '#5E421F', text: '#FFFFFF' },
] as const;

// 그룹 인덱스 → 램프 항목 (년도가 6개 초과면 순환)
export function letterBannerStyle(index: number) {
  return LETTER_BANNER_RAMP[index % LETTER_BANNER_RAMP.length];
}


// ========== 공개 편지 표시 헬퍼 (LetterSection / LetterFullSection / letters page 공유) ==========

// storage publicUrl 을 붙인 공개 편지 형태(공개 페이지가 PortfolioLetter 에 URL 을 확장).
export type LetterWithUrls = PortfolioLetter & {
  pdf_url: string | null;
  mobile_url: string | null;
  cover_url: string | null;
};

// 영상 편지 = PDF·모바일 없고 영상(YouTube)만 있는 편지.
export const isVideoLetter = (l: LetterWithUrls): boolean =>
  !l.pdf_url && !l.mobile_url && !!l.video_url;

// 편지 주 링크: 모바일 우선 → PDF → 영상(YouTube watch). 표지 아래 캡션 라벨 포함.
export function letterLink(l: LetterWithUrls): { href: string | null; label: string } {
  if (l.mobile_url) return { href: l.mobile_url, label: '모바일로 보기 →' };
  if (l.pdf_url) return { href: l.pdf_url, label: 'PDF 보기 →' };
  if (l.video_url) return { href: youtubeWatchUrl(l.video_url), label: '영상 보기 →' };
  return { href: null, label: '' };
}

// 편지 부 링크: 모바일+PDF 둘 다 있을 때만 PDF 를 부 링크로 병기 (없으면 null).
export function letterSubLink(l: LetterWithUrls): { href: string; label: string } | null {
  if (l.mobile_url && l.pdf_url) return { href: l.pdf_url, label: 'PDF 보기 →' };
  return null;
}

// 편지 표지: 업로드 표지 우선 → 영상 편지는 YouTube 썸네일 → 없으면 null(placeholder).
export function letterCoverSrc(l: LetterWithUrls): string | null {
  if (l.cover_url) return l.cover_url;
  if (l.video_url) return youtubeThumbnailUrl(l.video_url);
  return null;
}
