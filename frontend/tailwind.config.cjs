/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        muted: 'var(--muted)',
        sidebar: 'var(--sidebar)',
        text: 'var(--text)',
        subtle: 'var(--subtle)',
        ink: 'var(--ink)',
        border: 'var(--border)',
        primary: 'var(--primary)',
        accent: 'var(--accent)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
      },
      boxShadow: {
        glow: '0 14px 36px -18px var(--glow)',
      },
      fontFamily: {
        app: ['var(--font)'],
      },
    },
  },
  plugins: [],
}
