/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          50: 'rgb(var(--color-base-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--color-base-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--color-base-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--color-base-300-rgb) / <alpha-value>)',
          400: 'rgb(var(--color-base-400-rgb) / <alpha-value>)',
          500: 'rgb(var(--color-base-500-rgb) / <alpha-value>)',
          600: 'rgb(var(--color-base-600-rgb) / <alpha-value>)',
          700: 'rgb(var(--color-base-700-rgb) / <alpha-value>)',
          800: 'rgb(var(--color-base-800-rgb) / <alpha-value>)',
          900: 'rgb(var(--color-base-900-rgb) / <alpha-value>)',
          950: 'rgb(var(--color-base-950-rgb) / <alpha-value>)',
        },
        brand: {
          300: 'rgb(var(--color-brand-300-rgb) / <alpha-value>)',
          400: 'rgb(var(--color-brand-400-rgb) / <alpha-value>)',
          500: 'rgb(var(--color-brand-500-rgb) / <alpha-value>)',
        },
        status: {
          online: 'rgb(var(--status-online-rgb) / <alpha-value>)',
          busy: 'rgb(var(--status-busy-rgb) / <alpha-value>)',
          away: 'rgb(var(--status-away-rgb) / <alpha-value>)',
        },

        // Semantic aliases for existing classes
        background: 'rgb(var(--background-rgb) / <alpha-value>)',
        foreground: 'rgb(var(--foreground-rgb) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--card-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground-rgb) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(var(--popover-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--popover-foreground-rgb) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground-rgb) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground-rgb) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground-rgb) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground-rgb) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--destructive-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--destructive-foreground-rgb) / <alpha-value>)',
        },
        border: 'rgb(var(--border-rgb) / <alpha-value>)',
        input: 'rgb(var(--input-rgb) / <alpha-value>)',
        ring: 'rgb(var(--ring-rgb) / <alpha-value>)',
        app: 'rgb(var(--background-rgb) / <alpha-value>)',
        sidebar: 'rgb(var(--sidebar-background-rgb) / <alpha-value>)',
        panel: 'rgb(var(--card-rgb) / <alpha-value>)',
        hover: 'rgb(var(--sidebar-accent-rgb) / <alpha-value>)',
        main: 'rgb(var(--foreground-rgb) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        sans: [
          'Plus Jakarta Sans',
          'Avenir Next',
          'Segoe UI',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif'
        ],
        mono: ['Geist Mono', 'JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'brand': 'var(--shadow-brand)',
        'premium': 'var(--shadow-md)',
        'glass': 'var(--shadow-lg)',
        'inner-subtle': 'inset 0 2px 4px rgba(0, 0, 0, 0.25)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },
      animation: {
        'fade-in': 'fadeIn 0.18s ease-out',
        'fade-in-up': 'fadeInUp 0.22s ease-out',
        'slide-up': 'slideUp 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.18s ease-out',
        'bounce-in': 'bounceIn 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-subtle': 'pulseSubtle 1.2s ease-in-out infinite',
        shimmer: 'shimmer 1.5s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '65%': { transform: 'scale(1.06)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.text-heading': {
          '@apply text-lg font-semibold text-base-50 tracking-tight': {},
        },
        '.text-body': {
          '@apply text-sm font-normal text-base-200 leading-relaxed': {},
        },
        '.text-meta': {
          '@apply text-xs font-medium text-base-400': {},
        },
        '.text-label': {
          '@apply text-[0.65rem] uppercase tracking-widest font-semibold text-base-400': {},
        },
      })
    }
  ],
}
