// 2026 Brand Kit tokens. Reference only keys defined here.
export const palette = {
  primary: '#661F20', // 딥 마룬 (primary)
  neutral: '#80807F', // 그레이 (neutral)
  accent: '#B61821',  // 레드 (action/accent)
  paper: '#F6EFE2',
  ink: '#2B2620',
  line: '#E3DCCD',
  muted: '#80807F',
  danger: '#B61821',
  white: '#FFFFFF',
} as const

export type PaletteKey = keyof typeof palette
