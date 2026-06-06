import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // SMRIT Brand Colors
        background: '#F8F9FA',
        foreground: '#1A1A2E',
        primary: '#1B4F8A',
        'primary-dark': '#163d6b',
        'primary-light': '#2563aa',
        secondary: '#F5A623',
        'secondary-dark': '#d4891a',
        success: '#27AE60',
        warning: '#F59E0B',
        danger: '#E74C3C',
        error: '#E74C3C',
        muted: '#6B7280',
        border: '#E5E7EB',
        card: '#FFFFFF',
        'sidebar-bg': '#1B4F8A',
        'sidebar-active': 'rgba(255,255,255,0.15)',
        'sidebar-hover': 'rgba(255,255,255,0.08)',
        // Keep neutral shades for compatibility
        'neutral-50': '#F9FAFB',
        'neutral-100': '#F3F4F6',
        'neutral-200': '#E5E7EB',
        'neutral-300': '#D1D5DB',
        'neutral-400': '#9CA3AF',
        'neutral-500': '#6B7280',
        'neutral-600': '#4B5563',
        'neutral-700': '#374151',
        'neutral-800': '#1F2937',
        'neutral-900': '#111827',
      },
      spacing: {
        sidebar: '240px',
        'sidebar-collapsed': '64px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-md': '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)',
      },
      borderRadius: {
        card: '12px',
        badge: '6px',
      },
    },
  },
  plugins: [],
}

export default config
