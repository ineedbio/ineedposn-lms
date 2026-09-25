"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spin, useZ1 } from "./client";

/** "ทำเครื่องหมายว่าดูจบ" / "✓ ดูจบแล้ว" toggle. */
export function DoneButton({ lessonId, done, hasNext }: { lessonId: string; done: boolean; hasNext: boolean }) {
  const router = useRouter();
  const { toast } = useZ1();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={`pill${done ? " ghost" : ""}`}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId, done: !done }) });
        if (!res.ok) {
          toast((await res.json().catch(() => ({}))).error || "บันทึกไม่สำเร็จ", true);
          setBusy(false);
          return;
        }
        if (!done && hasNext) toast("เยี่ยม! ไปตอนถัดไปได้เลย");
        setBusy(false);
        router.refresh();
      }}
    >
      {busy ? <Spin /> : done ? "✓ ดูจบแล้ว" : "ทำเครื่องหมายว่าดูจบ"}
    </button>
  );
}

/** The student's email drifting over the video every 9 s (discourages screen recording). */
export function Watermark({ text }: { text: string }) {
  const [pos, setPos] = useState({ top: "12%", left: "8%" });
  useEffect(() => {
    const t = setInterval(() => setPos({ top: `${8 + Math.random() * 78}%`, left: `${4 + Math.random() * 60}%` }), 9000);
    return () => clearInterval(t);
  }, []);
  return <span className="wm" style={pos}>{text}</span>;
}
