import type { Config } from "tailwindcss";

// Every color resolves to a CSS variable from app/globals.css, so the whole
// site (including dark mode and the per-subject accent) is themed in one place.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
const fixed = (name: string, alpha: number) => `rgb(var(--${name}) / ${alpha})`;

// Neutral scale shared by slate/gray/zinc/neutral/stone so older pages that use
// Tailwind's default grays pick up the theme (and dark mode) too.
const neutral = {
  50: v("bg2"), 100: v("bg3"), 200: v("line"), 300: v("line2"), 400: v("muted"), 500: v("muted"),
  600: v("ink2"), 700: v("ink2"), 800: v("ink"), 900: v("ink"), 950: v("ink"),
};
// A tinted family: soft background for 50–100, faint border for 200–300, the solid tone above.
const family = (solid: string, soft: string) => ({
  50: v(soft), 100: v(soft), 200: fixed(solid, 0.25), 300: fixed(solid, 0.4),
  400: v(solid), 500: v(solid), 600: v(solid), 700: v(solid), 800: v(solid), 900: v(solid), 950: v(solid),
});

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        white: v("bg"),
        black: "#000",
        // Always-white (for text on photos / the dark footer); "white" itself follows the theme background.
        snow: "rgb(255 255 255 / <alpha-value>)",
        ink: v("ink"),
        paper: v("bg"),
        panel: v("bg2"),
        "panel-2": v("bg3"),
        secondary: v("ink2"),
        muted: v("muted"),
        border: v("line"),
        "border-light": v("line"),
        "dark-hover": v("ink2"),
        accent: v("acc"),
        "accent-hover": fixed("acc", 0.86),
        "accent-soft": v("acc-soft"),
        "on-accent": v("on-acc"),
        ok: v("ok"),
        "ok-soft": v("ok-soft"),
        wait: v("wait"),
        "wait-soft": v("wait-soft"),
        no: v("no"),
        "no-soft": v("no-soft"),
        foot: v("foot"),
        bio: v("bio"),
        chem: v("chem"),
        phys: v("phys"),
        math: v("math"),
        slate: neutral,
        gray: neutral,
        zinc: neutral,
        neutral,
        stone: neutral,
        emerald: family("acc", "acc-soft"),
        teal: family("acc", "acc-soft"),
        green: family("ok", "ok-soft"),
        red: family("no", "no-soft"),
        rose: family("no", "no-soft"),
        amber: family("wait", "wait-soft"),
        yellow: family("wait", "wait-soft"),
        orange: family("chem", "chem-soft"),
        blue: family("phys", "phys-soft"),
        sky: family("phys", "phys-soft"),
        indigo: family("phys", "phys-soft"),
        purple: family("math", "math-soft"),
        violet: family("math", "math-soft"),
      },
      fontFamily: {
        sans: ["var(--font-anuphan)", "Leelawadee UI", "Tahoma", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "Menlo", "monospace"],
      },
      borderRadius: {
        card: "16px",
        pill: "999px",
      },
      boxShadow: {
        soft: "0 1px 2px rgb(0 0 0 / 0.04), 0 6px 20px rgb(0 0 0 / 0.05)",
        "soft-lg": "0 4px 10px rgb(0 0 0 / 0.06), 0 16px 40px rgb(0 0 0 / 0.10)",
        pop: "var(--shadow)",
      },
      maxWidth: {
        site: "1080px",
      },
    },
  },
  plugins: [],
};
export default config;
