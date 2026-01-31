import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Layered depth system
        base: {
          DEFAULT: "#060a13", // Deepest background
          50: "#0a0f1a",      // Primary background
          100: "#0f1629",     // Elevated surfaces
          200: "#151d32",     // Cards, panels
          300: "#1a2540",     // Interactive elements
        },
        // Enhanced slate with better contrast
        slate: {
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        // Accent colors
        accent: {
          DEFAULT: "#6366f1", // Indigo
          light: "#818cf8",
          dark: "#4f46e5",
          glow: "rgba(99, 102, 241, 0.4)",
        },
        // Status colors with better saturation
        urgent: {
          DEFAULT: "#ef4444",
          light: "#fca5a5",
          dark: "#b91c1c",
          glow: "rgba(239, 68, 68, 0.3)",
        },
        warning: {
          DEFAULT: "#f59e0b",
          light: "#fcd34d",
          dark: "#b45309",
        },
        success: {
          DEFAULT: "#10b981",
          light: "#6ee7b7",
          dark: "#047857",
          glow: "rgba(16, 185, 129, 0.3)",
        },
        // Cyber teal - secondary accent
        teal: {
          DEFAULT: "#14b8a6",
          light: "#5eead4",
          dark: "#0d9488",
          glow: "rgba(20, 184, 166, 0.3)",
        },
        // Legacy support
        navy: {
          900: "#0a192f",
          800: "#112240",
          700: "#233554",
          600: "#1e3a8a",
        },
        brand: {
          500: "#6366f1",
          600: "#4f46e5",
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-accent': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
        'gradient-subtle': 'linear-gradient(180deg, rgba(99, 102, 241, 0.08) 0%, transparent 100%)',
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(99, 102, 241, 0.15)',
        'glow-md': '0 0 25px rgba(99, 102, 241, 0.2)',
        'glow-lg': '0 0 40px rgba(99, 102, 241, 0.25)',
        'glow-urgent': '0 0 20px rgba(239, 68, 68, 0.3)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.3)',
        'elevated': '0 4px 20px rgba(0, 0, 0, 0.4)',
        'card': '0 2px 10px rgba(0, 0, 0, 0.3), 0 0 1px rgba(255, 255, 255, 0.05)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 1px rgba(99, 102, 241, 0.2)',
        'lift': '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.1)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(99, 102, 241, 0.15)' },
          '50%': { boxShadow: '0 0 25px rgba(99, 102, 241, 0.3)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      borderColor: {
        'glow': 'rgba(99, 102, 241, 0.3)',
      },
    },
  },
  plugins: [],
};
export default config;
