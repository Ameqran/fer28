import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.2), 0 18px 50px rgba(24, 16, 56, 0.35)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,255,255,0.3)' },
          '50%': { boxShadow: '0 0 0 14px rgba(255,255,255,0)' },
        },
      },
      animation: {
        pulseGlow: 'pulseGlow 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
