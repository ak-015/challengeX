/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#070606',
        surface: '#100909',
        'surface-elevated': '#170909',
        'surface-hover': '#210a0d',
        crimson: {
          DEFAULT: '#e50920',
          dark: '#760b12',
          glow: '#ff2638',
          soft: 'rgba(229, 9, 32, 0.12)',
        },
        parchment: {
          DEFAULT: '#e9dfd0',
          dim: '#a79a8b',
          faint: '#71665e',
        },
      },
      fontFamily: {
        display: ['"Cinzel Decorative"', 'serif'],
        heading: ['Cinzel', 'serif'],
        narrative: ['"Cormorant Garamond"', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'crimson-sm': '0 0 12px rgba(229, 9, 32, 0.25)',
        'crimson-md': '0 0 28px rgba(229, 9, 32, 0.35)',
        'crimson-lg': '0 0 56px rgba(229, 9, 32, 0.45)',
        stone: 'inset 0 1px 0 rgba(233,223,208,0.06), 0 12px 40px rgba(0,0,0,0.6)',
      },
      keyframes: {
        ember: {
          '0%': { transform: 'translateY(0) translateX(0)', opacity: '0' },
          '10%': { opacity: '1' },
          '100%': { transform: 'translateY(-120px) translateX(var(--ember-x, 0px))', opacity: '0' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        spinSlow: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        spinReverse: {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
      },
      animation: {
        ember: 'ember 6s linear infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'spin-slow': 'spinSlow 40s linear infinite',
        'spin-reverse': 'spinReverse 60s linear infinite',
      },
    },
  },
  plugins: [],
};
