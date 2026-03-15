import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#047857",
        secondary: "#f5f5f4",
        accent: "#f59e0b",
        destructive: "#be123c",
        tierra: {
          50: "#f7f5f0",
          100: "#ebe6da",
          200: "#d9cfb8",
          300: "#c4b592",
          400: "#b39d73",
          500: "#a68d62",
          600: "#8f734d",
          700: "#735940",
          800: "#5f4b38",
          900: "#4f4032",
        },
        verde: {
          50: "#f0f9f0",
          100: "#dbf0dc",
          200: "#bae1bc",
          300: "#8dcc91",
          400: "#5aaf61",
          500: "#389342",
          600: "#2a7635",
          700: "#245e2c",
          800: "#204c26",
          900: "#1b3f22",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "0.75rem",
        "2xl": "0.75rem",
      },
      fontFamily: {
        sans: ["Inter", "Geist Sans", "system-ui", "Segoe UI", "sans-serif"],
        display: ["Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
