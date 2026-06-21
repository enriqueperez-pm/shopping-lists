import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        body: ["var(--font-roboto)", "system-ui", "sans-serif"],
        editorial: ["var(--font-playfair)", "Georgia", "serif"],
      },
      fontSize: {
        title: ["1.0625rem", { lineHeight: "1.35", letterSpacing: "-0.02em", fontWeight: "600" }],
        product: ["0.9875rem", { lineHeight: "1.35", letterSpacing: "0", fontWeight: "500" }],
        body: ["0.875rem", { lineHeight: "1.45", fontWeight: "500" }],
        caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "500" }],
        micro: ["0.6875rem", { lineHeight: "1", letterSpacing: "0.02em", fontWeight: "500" }],
      },
      colors: {
        flujo: {
          deep: "#1A2238",
          mint: "#00E676",
          lavender: "#7C4DFF",
          gold: "#D4AF37",
          sapphire: "#20B2AA",
          bg: "#F8F9FA",
        },
        ink: {
          DEFAULT: "#1A2238",
          muted: "#4A5568",
          faint: "#718096",
        },
        pantry: {
          DEFAULT: "#00E676",
          light: "#E8FBF0",
        },
        list: {
          DEFAULT: "#4A5568",
        },
        cart: {
          DEFAULT: "#D4AF37",
          light: "#FEF9E7",
        },
        saved: {
          DEFAULT: "#20B2AA",
          bg: "#E6F7F6",
        },
        trust: {
          DEFAULT: "#1A2238",
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
        income: {
          DEFAULT: "#00E676",
          bg: "#E8FBF0",
        },
        expense: {
          DEFAULT: "#dc2626",
          bg: "#fef2f2",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(26,34,56,0.04), 0 4px 16px rgba(26,34,56,0.04)",
        float: "0 4px 24px rgba(26,34,56,0.08), 0 1px 3px rgba(26,34,56,0.04)",
        card: "0 1px 2px rgba(26,34,56,0.04), 0 2px 8px rgba(26,34,56,0.03)",
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
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
