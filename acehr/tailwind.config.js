/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4CAF87',
          dark: '#3D9370',
          light: '#E8F8F1',
          text: '#2E9E6D',
        },
        warn: { DEFAULT: '#E8833A', light: '#FFF7ED' },
        danger: { DEFAULT: '#E24B4A', light: '#FEF2F2' },
        indigoish: { DEFAULT: '#4F46E5', light: '#EEF2FF' },
        canvas: '#F5F6FA',
        hairline: '#E5E7EB',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: { card: '12px' },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,0.04)' },
    },
  },
  plugins: [],
}
