import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1d1d1f",
        paper: "#ffffff",
        panel: "#f6f5f3",
        secondary: "#6e6e73",
        muted: "#98989d",
        border: "#d8d5d0",
        "border-light": "#eae7e2",
        "dark-hover": "#3a3a3c",
        // Warm accent (from the mascot's ginger fur) — used sparingly for
        // primary actions/highlights so the site doesn't read as flat
        // black-and-white; everything else stays on the neutral scale above.
        accent: "#C1652F",
        "accent-hover": "#A6521F",
        "accent-soft": "#FBF0E7",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        card: "22px",
        pill: "980px",
      },
      boxShadow: {
        // Ambient depth for resting cards/buttons — subtler than Tailwind's
        // default `shadow` so panels don't look stiff/flat even before hover.
        soft: "0 1px 2px rgba(29,29,31,0.04), 0 6px 20px rgba(29,29,31,0.05)",
        "soft-lg": "0 4px 10px rgba(29,29,31,0.06), 0 16px 40px rgba(29,29,31,0.10)",
      },
    },
  },
  plugins: [],
};
export default config;
