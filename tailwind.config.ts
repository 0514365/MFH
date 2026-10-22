import type { Config } from 'tailwindcss'
import containerQueries from '@tailwindcss/container-queries'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'primary-soft': 'var(--primary-soft)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-soft': 'var(--accent-soft)',
        danger: 'var(--danger)',
        paper: 'var(--paper)',
        surface: 'var(--surface)',
        'surface-subtle': 'var(--surface-subtle)',
        line: 'var(--line)',
        ink: 'var(--text)',
        muted: 'var(--text-muted)',
        faint: 'var(--text-faint)',
        'on-primary': 'var(--on-primary)',
        'on-accent': 'var(--on-accent)',
        'on-primary-soft': 'var(--on-primary-soft)',
        'status-upcoming': 'var(--status-upcoming)',
        'on-status-upcoming': 'var(--on-status-upcoming)',
        'status-progress': 'var(--status-progress)',
        'on-status-progress': 'var(--on-status-progress)',
        'status-done': 'var(--status-done)',
        'on-status-done': 'var(--on-status-done)',
        // MFH 2027 (Minimal Block) — --b27-* 는 :root 에 선언(app/layout.tsx ← lib/palette.ts brand2027). 공용 토큰 브릿지는 .theme-2027 스코프(app/globals.css)
        'b27-ink': 'var(--b27-ink)',
        'b27-plus': 'var(--b27-plus)',
        'b27-paper': 'var(--b27-paper)',
        'b27-card': 'var(--b27-card)',
        'b27-muted': 'var(--b27-muted)',
        'b27-line': 'var(--b27-line)',
        'b27-income': 'var(--b27-income)',
        'b27-expense': 'var(--b27-expense)',
        'b27-wait': 'var(--b27-wait)',
        'b27-sun': 'var(--b27-sun)',
        'b27-sat': 'var(--b27-sat)',
        'b27-block-1': 'var(--b27-block-1)',
        'b27-block-2': 'var(--b27-block-2)',
        'b27-block-3': 'var(--b27-block-3)',
        'b27-block-4': 'var(--b27-block-4)',
        'b27-block-5': 'var(--b27-block-5)',
        'b27-block-6': 'var(--b27-block-6)',
        'b27-block-7': 'var(--b27-block-7)',
        'b27-block-8': 'var(--b27-block-8)',
        'b27-tint-1': 'var(--b27-tint-1)',
        'b27-tint-2': 'var(--b27-tint-2)',
        'b27-tint-3': 'var(--b27-tint-3)',
        'b27-tint-4': 'var(--b27-tint-4)',
        'b27-tint-5': 'var(--b27-tint-5)',
        'b27-tint-6': 'var(--b27-tint-6)',
        'b27-tint-7': 'var(--b27-tint-7)',
        'b27-tint-8': 'var(--b27-tint-8)',
        'b27-income-soft': 'var(--b27-income-soft)',
        'b27-expense-soft': 'var(--b27-expense-soft)',
        'b27-wait-soft': 'var(--b27-wait-soft)',
        'b27-income-bar': 'var(--b27-income-bar)',
      },
      fontFamily: {
        sans: ['Pretendard', 'var(--font-montserrat)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['var(--font-montserrat)', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        // 2027 숫자·제목 — Manrope(lib/fonts.ts), 한글은 Pretendard 폴백
        num: ['var(--font-manrope)', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        // 2027 성경 본문 명조 — Noto Serif KR(lib/fonts.ts)
        serif: ['var(--font-serif)', 'Noto Serif KR', 'serif'],
      },
      boxShadow: {
        soft: '0 2px 12px -4px rgba(34, 28, 28, 0.06)',
      },
    },
  },
  // 컨테이너 쿼리(@container/@xl/@4xl) — 셸 본문 열 기준 반응형(docs/MFH-WIDE-LAYOUT-DESIGN.md §5).
  plugins: [containerQueries],
}

export default config
