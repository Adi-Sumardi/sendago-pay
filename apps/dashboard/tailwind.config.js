/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        gold: {
          50: '#FDFBF7',
          100: '#FBF6EE',
          200: '#F5EAD4',
          300: '#EED9B3',
          400: '#E2C288',
          500: '#D4AF37', // Brand Luxury Gold
          600: '#B89326',
          700: '#917118',
          800: '#705612',
          900: '#4D3A0A',
        },
        primary: {
          DEFAULT: '#D4AF37',
          foreground: '#FFFFFF',
          dark: '#B89326',
        },
        secondary: {
          DEFAULT: '#FDFBF7',
          foreground: '#18181B',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#F4F4F5',
          foreground: '#71717A',
        },
        accent: {
          DEFAULT: '#FAF5EB',
          foreground: '#B89326',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#18181B',
        },
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      boxShadow: {
        'gold-sm': '0 1px 3px rgba(212, 175, 55, 0.15)',
        'gold-md': '0 4px 14px rgba(212, 175, 55, 0.20)',
        'gold-lg': '0 10px 30px rgba(212, 175, 55, 0.25)',
      },
    },
  },
  plugins: [],
};
