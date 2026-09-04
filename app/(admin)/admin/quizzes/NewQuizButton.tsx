"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewQuizButton({ lessons }: { lessons: { id: string; label: string }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function create() {
    const title = prompt("ชื่อข้อสอบ/แบบทดสอบใหม่:");
    if (!title?.trim()) return;

    let lessonId: string | null = null;
    let isMockExam = true;

    if (lessons.length > 0) {
      const attach = confirm(
        "ผูกข้อสอบนี้กับบทเรียนใดบทเรียนหนึ่งไหม? (ตกลง = ผูกกับบทเรียน / ยกเลิก = สร้างเป็นข้อสอบจำลองแยกต่างหาก)"
      );
      if (attach) {
        const listText = lessons.map((l, i) => `${i + 1}. ${l.label}`).join("\n");
        const choice = prompt(`เลือกบทเรียน (พิมพ์หมายเลข):\n${listText}`);
        const idx = Number(choice) - 1;
        if (lessons[idx]) {
          lessonId = lessons[idx].id;
          isMockExam = false;
        }
      }
    }

    setLoading(true);
    const res = await fetch("/api/admin/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        timeLimitMinutes: 30,
        passScore: 50,
        isMockExam,
        lessonId,
      }),
    });
    setLoading(false);
    if (res.ok) {
      const quiz = await res.json();
      router.push(`/admin/quizzes?quiz=${quiz.id}`);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "สร้างไม่สำเร็จ");
    }
  }

  return (
    <button
      onClick={create}
      disabled={loading}
      className="text-sm font-semibold text-ink bg-panel px-4 py-3 rounded-xl hover:bg-border-light transition-all duration-150 active:scale-[0.97] disabled:opacity-50"
    >
      + สร้างข้อสอบใหม่
    </button>
  );
}
