/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: '#1a2b4a',
        land: '#2d5a27',
        ui: {
          bg: '#0f1623',
          panel: '#1a2236',
          border: '#2a3750',
          accent: '#3b82f6',
          hover: '#60a5fa',
        }
      },
      animation: {
        'shake': 'shake 0.1s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 1s ease-in-out infinite',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
