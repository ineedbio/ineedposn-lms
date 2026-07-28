import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0B0C",
        paper: "#FFFFFF",
        gray: "#F5F5F7",
      },
    },
  },
  plugins: [],
};
export default config;
