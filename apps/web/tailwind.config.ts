import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Ubits Brand Kit — Primary
        navy: '#04101f',
        primary: '#1a6bff',
        bright: '#2ec6ff',
        light: '#cadeff',
        // UI Tokens
        action: '#3865f5',
        'dark-ui': '#2a303f',
        accent: '#f49e04',
        'border-gray': '#d0d2d5',
        bg: '#f8faff',
        // Semantic states
        'status-ok': '#166534',
        'status-ok-bg': '#dcfce7',
        'status-warn': '#854d0e',
        'status-warn-bg': '#fef9c3',
        'status-error': '#991b1b',
        'status-error-bg': '#fee2e2',
        'status-info': '#1e40af',
        'status-info-bg': '#dbeafe',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #04101f 0%, #1a6bff 100%)',
        'gradient-blue': 'linear-gradient(135deg, #1a6bff 0%, #2ec6ff 100%)',
        'gradient-light': 'linear-gradient(135deg, #cadeff 0%, #ffffff 100%)',
      },
      boxShadow: {
        card: '0 2px 8px rgba(4, 16, 31, 0.08)',
        'card-hover': '0 8px 24px rgba(4, 16, 31, 0.15)',
        sidebar: '4px 0 16px rgba(4, 16, 31, 0.12)',
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
