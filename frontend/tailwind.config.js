/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: { colors: { eco: { 50:'#effcf5',100:'#d8f8e5',500:'#20a464',600:'#15834d',700:'#11663e',900:'#123b2a' } } } },
  plugins: []
}
