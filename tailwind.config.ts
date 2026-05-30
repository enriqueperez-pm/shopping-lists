import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        ink: {
          DEFAULT: "#153131",
          muted: "#2a4545",
          faint: "#3d5555",
        },
        pantry: {
          DEFAULT: "#047857",
          light: "#d1fae5",
        },
        list: {
          DEFAULT: "#334155",
        },
        cart: {
          DEFAULT: "#92400e",
        },
        saved: {
          DEFAULT: "#075985",
          bg: "#e0f2fe",
        },
        trust: {
          DEFAULT: "#153131",
        },
        brand: {
          50: "#f6eff5",
          100: "#ecdae8",
          200: "#d7b6cf",
          300: "#c08eb2",
          400: "#a76893",
          500: "#5e2e55",
          600: "#54294c",
          700: "#4a2443",
          800: "#3b1d36",
          900: "#2f172c",
        },
        danger: {
          DEFAULT: "#b91c1c",
          bg: "#fef2f2",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(21,49,49,.06), 0 1px 2px rgba(21,49,49,.04)",
      },
      borderRadius: {
        xl: "14px",
      },
    },
  },
  plugins: [],
};
export default config;
