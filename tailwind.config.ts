import type { Config } from 'tailwindcss'

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
      },
      fontFamily: {
        sans: ['Pretendard', 'var(--font-montserrat)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['var(--font-montserrat)', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 12px -4px rgba(34, 28, 28, 0.06)',
      },
    },
  },
  plugins: [],
}

export default config
