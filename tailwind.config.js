/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#12180F',
          light: '#2E352A',
          dark: '#050704',
        },
        paper: {
          DEFAULT: '#EDEEE4',
          light: '#F5F6F0',
          dark: '#DFE1D4',
        },
        ledger: {
          DEFAULT: '#1B3A24',
          light: '#2D583B',
          dark: '#0E2114',
        },
        sage: {
          DEFAULT: '#7A9B76',
          light: '#A3BBA0',
          dark: '#587354',
        },
        seal: {
          DEFAULT: '#C4442E',
          light: '#E25E47',
          dark: '#932C1A',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

