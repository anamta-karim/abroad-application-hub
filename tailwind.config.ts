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
        canvas: "#EAF1F8",
        ink: {
          deep: "#132238",
          DEFAULT: "#1E324A",
          muted: "#536B84",
          subtle: "#8499B0",
        },
        brand: {
          DEFAULT: "#3E72A6",
          hover: "#315C88",
          light: "#E5EFF9",
          dark: "#265582",
        },
        teal: {
          DEFAULT: "#3BA99C",
          hover: "#2F8E82",
          light: "#E4F6F4",
          dark: "#1F7368",
        },
        glass: {
          surface: "rgba(255, 255, 255, 0.72)",
          strong: "rgba(255, 255, 255, 0.85)",
          border: "rgba(255, 255, 255, 0.82)",
          borderSubtle: "rgba(255, 255, 255, 0.65)",
        },
        border: {
          DEFAULT: "rgba(205, 220, 235, 0.75)",
          subtle: "rgba(225, 235, 245, 0.6)",
        },
      },
      fontFamily: {
        heading: [
          '"Manrope"',
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        sans: [
          '"DM Sans"',
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(40, 70, 120, 0.06), 0 1px 2px rgba(255, 255, 255, 0.9) inset",
        glassCard: "0 4px 20px rgba(40, 70, 120, 0.04), 0 1px 2px rgba(255, 255, 255, 0.9) inset",
        stage: "0 20px 60px rgba(50, 80, 130, 0.08), 0 1px 3px rgba(255, 255, 255, 0.95) inset",
      },
    },
  },
  plugins: [],
};

export default config;
