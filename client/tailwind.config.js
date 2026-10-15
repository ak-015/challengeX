/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: { xs: '480px', sm: '640px', md: '768px', lg: '1024px', xl: '1280px' },
    extend: {
      colors: {
        void: '#070506',
        ink: '#100809',
        stone: '#160B0D',
        card: '#1B1114',
        crimson: { DEFAULT: '#E50920', bright: '#FF2438', deep: '#8E1824', btn: '#C4081D', text: '#FF5A67' },
        ash: { DEFAULT: '#F4EDEB', dim: '#B9A8A7', mute: '#887778', faint: '#6E5F60' },
        gold: '#B99A62',
        success: '#5FBF8F',
        warning: '#E0A83C',
        panel: 'rgba(16,8,9,0.86)',
      },
      fontFamily: {
        display: ['Cinzel', '"Cinzel Decorative"', 'Georgia', 'serif'],
        decorative: ['"Cinzel Decorative"', 'Cinzel', 'Georgia', 'serif'],
        label: ['Cinzel', 'Georgia', '"Times New Roman"', 'serif'],
        prose: ['"Cormorant Garamond"', 'Georgia', '"Times New Roman"', 'serif'],
        fell: ['"IM Fell English SC"', 'Cinzel', 'Georgia', 'serif'],
        ui: ['Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: { glow: '0 0 18px rgba(255,36,56,0.55)' },
    },
  },
  plugins: [],
};
