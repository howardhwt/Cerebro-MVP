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
        sans: ["var(--font-dm-sans)", "sans-serif"],
        display: ["var(--font-outfit)", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: {
          900: "#0a192f",
          800: "#112240",
          700: "#233554",
          600: "#1e3a8a",
        },
        slate: {
          300: "#ccd6f6",
          400: "#a8b2d1",
          500: "#8892b0",
        },
        brand: {
          500: "#0070f3", // Professional Blue
          600: "#005bb5",
        },
      },
      // Animations removed for performance
    },
  },
  plugins: [],
};
export default config;
