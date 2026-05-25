export const JOURNAL_CATEGORIES = [
  '교회사역',
  '방과후학교',
  '선교사가정',
  '훈련·행정',
  '긴급구호',
  '일상',
  '묵상',
] as const

export type JournalCategory = (typeof JOURNAL_CATEGORIES)[number]
