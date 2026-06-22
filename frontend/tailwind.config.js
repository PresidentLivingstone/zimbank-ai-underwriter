/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#061420',
          900: '#0d2137',
          800: '#1a3a5c',
          700: '#14304f',
        },
      },
    },
  },
  plugins: [],
};
