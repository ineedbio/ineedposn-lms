"use client";

import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";

const ICONS: Record<Mode, JSX.Element> = {
  system: <path d="M3 5h18v11H3zM8 20h8M12 16v4" />,
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  dark: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
};
const LABELS: Record<Mode, string> = { system: "ตามเครื่อง", light: "สว่าง", dark: "มืด" };

/** Three-way theme switch (follow OS / light / dark), saved per browser. */
export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setMode(t === "light" || t === "dark" ? t : "system");
  }, []);

  function pick(m: Mode) {
    setMode(m);
    const root = document.documentElement;
    if (m === "system") delete root.dataset.theme;
    else root.dataset.theme = m;
    try {
      if (m === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", m);
    } catch {}
  }

  return (
    <div role="group" aria-label="ธีมของเว็บ" className="inline-flex rounded-pill border border-border bg-paper p-0.5">
      {(Object.keys(ICONS) as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => pick(m)}
          aria-pressed={mode === m}
          aria-label={LABELS[m]}
          title={LABELS[m]}
          className={`grid h-7 w-[30px] place-items-center rounded-pill transition-colors max-[560px]:w-[26px] ${
            mode === m ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICONS[m]}
          </svg>
        </button>
      ))}
    </div>
  );
}
