/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/client/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#5E6AD2',
        success: '#00D26A',
        warning: '#FF991F',
        error: '#F5455C',
        surface: {
          dark: '#0D1117',
          light: '#FFFFFF',
          DEFAULT: '#0D1117'
        },
        muted: '#656D76',
        border: {
          DEFAULT: '#21262D',
          light: '#E1E4E8'
        },
        text: {
          primary: '#F0F6FC',
          secondary: '#8B949E',
          'primary-light': '#24292F',
          'secondary-light': '#656D76'
        }
      },
      fontFamily: {
        mono: ['SF Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
        sans: ['SF Pro Display', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'pulse-dot': 'pulseDot 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}