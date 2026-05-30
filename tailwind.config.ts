import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        title: ["1.0625rem", { lineHeight: "1.35", letterSpacing: "-0.02em", fontWeight: "600" }],
        product: ["0.9875rem", { lineHeight: "1.35", letterSpacing: "0", fontWeight: "500" }],
        body: ["0.875rem", { lineHeight: "1.45", fontWeight: "500" }],
        caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "500" }],
        micro: ["0.6875rem", { lineHeight: "1", letterSpacing: "0.02em", fontWeight: "500" }],
      },
      colors: {
        ink: {
          DEFAULT: "#153131",
          muted: "#3a5252",
          faint: "#6b8282",
        },
        pantry: {
          DEFAULT: "#047857",
          light: "#ecfdf5",
        },
        list: {
          DEFAULT: "#475569",
        },
        cart: {
          DEFAULT: "#92400e",
          light: "#fffbeb",
        },
        saved: {
          DEFAULT: "#075985",
          bg: "#f0f9ff",
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
        soft: "0 1px 2px rgba(21,49,49,0.04), 0 4px 16px rgba(21,49,49,0.04)",
        float: "0 4px 24px rgba(21,49,49,0.08), 0 1px 3px rgba(21,49,49,0.04)",
        card: "0 1px 2px rgba(21,49,49,0.04), 0 2px 8px rgba(21,49,49,0.03)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "200ms",
        toast: "220ms",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
