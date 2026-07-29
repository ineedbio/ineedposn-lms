import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1d1d1f",
        paper: "#ffffff",
        panel: "#f5f5f7",
        secondary: "#6e6e73",
        muted: "#98989d",
        border: "#d2d2d7",
        "border-light": "#e5e5e7",
        "dark-hover": "#3a3a3c",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
        pill: "980px",
      },
    },
  },
  plugins: [],
};
export default config;
