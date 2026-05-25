import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#661F20',
          neutral: '#80807F',
          accent: '#B61821',
        },
        paper: '#F6EFE2',
        ink: '#2B2620',
        line: '#E3DCCD',
        muted: '#80807F',
        danger: '#B61821',
      },
      fontFamily: {
        sans: ['Pretendard', 'Montserrat', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'Pretendard', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
