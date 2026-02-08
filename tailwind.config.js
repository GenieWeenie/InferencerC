/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--theme-primary)',
        secondary: 'var(--theme-secondary)',
        cta: 'var(--theme-accent)',
        background: 'var(--theme-background)',
        text: 'var(--theme-text)',
        'text-secondary': 'var(--theme-text-secondary)',
        surface: 'var(--theme-surface)',
        border: 'var(--theme-border)',
        'code-bg': 'var(--theme-code-bg)',
        'code-text': 'var(--theme-code-text)',
      },
      fontFamily: {
        heading: ['"Inter"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px rgba(0,0,0,0.1)',
        lg: '0 10px 15px rgba(0,0,0,0.1)',
        xl: '0 20px 25px rgba(0,0,0,0.15)',
      }
    },
  },
  plugins: [],
}
