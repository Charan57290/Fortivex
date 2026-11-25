/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: {
          primary: '#090D16',
          secondary: '#111827',
          card: '#151D2C',
        },
        accent: {
          primary: '#6366F1',
          secondary: '#06B6D4',
        },
      },
    },
  },
  plugins: [],
};
