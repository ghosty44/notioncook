/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef9ee',
          100: '#fdf0d5',
          200: '#faded9a',
          300: '#f7c55f',
          400: '#f4a93a',
          500: '#f18c18',
          600: '#e2700e',
          700: '#bc520f',
          800: '#954113',
          900: '#793614',
          950: '#411906',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
