import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "Inter", "sans-serif"],
        display: ["Cormorant Garamond", "serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#6C63FF",
          50:  "#F0EFFF",
          100: "#E1DEFF",
          200: "#C4BDFF",
          300: "#A69CFF",
          400: "#897BFF",
          500: "#6C63FF",
          600: "#4F45E0",
          700: "#3D34B8",
          800: "#2B2490",
          900: "#191568",
        },
      },
    },
  },
  plugins: [],
};

export default config;
