/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: { xs: '480px', sm: '640px', md: '768px', lg: '1024px', xl: '1280px' },
    extend: {
      colors: {
        void: '#050505',
        crimson: { DEFAULT: '#E11D2E', deep: '#7A0A12', btn: '#C41423', text: '#FF5A67' },
        ash: { DEFAULT: '#E8E2DC', dim: '#B9B0A8', mute: '#9A918A' },
        panel: 'rgba(8,4,5,0.82)',
      },
      fontFamily: {
        display: ['"Cinzel Decorative"', 'Cinzel', 'Georgia', 'serif'],
        label: ['Cinzel', 'Georgia', '"Times New Roman"', 'serif'],
        prose: ['Georgia', '"Times New Roman"', 'serif'],
      },
      boxShadow: { glow: '0 0 18px rgba(255,30,45,0.6)' },
    },
  },
  plugins: [],
};
