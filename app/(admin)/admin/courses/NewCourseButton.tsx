"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCourseButton({ subjects }: { subjects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function create() {
    if (subjects.length === 0) {
      alert("ยังไม่มีวิชา (Subject) ในระบบ กรุณาสร้างวิชาก่อน");
      return;
    }
    const title = prompt("ชื่อคอร์สใหม่:");
    if (!title?.trim()) return;
    setLoading(true);
    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId: subjects[0].id, title }),
    });
    setLoading(false);
    if (res.ok) {
      const course = await res.json();
      router.push(`/admin/courses?course=${course.id}`);
      router.refresh();
    }
  }

  return (
    <button
      onClick={create}
      disabled={loading}
      className="text-sm font-semibold text-ink bg-panel px-4 py-3 rounded-xl hover:bg-border-light transition-all duration-150 active:scale-[0.97] disabled:opacity-50"
    >
      + เพิ่มคอร์สใหม่
    </button>
  );
}
