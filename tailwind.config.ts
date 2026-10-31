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
        paper: "#F7F6F2",
        forest: {
          DEFAULT: "#315C4B",
          hover: "#26493B",
          light: "#E3ECE6",
        },
        sage: {
          DEFAULT: "#DCE7DF",
          dark: "#B8C9BC",
        },
        ink: {
          DEFAULT: "#252A27",
          muted: "#626B65",
        },
        rule: "#D9DED9",
        surface: "#FFFFFF",
        error: "#9E3D36",
        warning: "#8A5B18",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
