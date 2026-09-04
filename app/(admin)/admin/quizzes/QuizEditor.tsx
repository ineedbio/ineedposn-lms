"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Choice = { id: string; text: string };
type Question = {
  id: string;
  text: string;
  type: "MCQ" | "SHORT_ANSWER";
  choices: Choice[] | null;
  correctAnswer: string;
  explanation: string | null;
};
type Quiz = {
  id: string;
  title: string;
  timeLimit: number;
  passScore: number;
  isMockExam: boolean;
  lesson: { id: string; title: string } | null;
  questions: Question[];
  _count: { attempts: number };
};

const inputCls =
  "h-10 rounded-lg border-[1.5px] border-border px-3 text-[13px] bg-white focus:outline-none focus:border-ink transition";

export default function QuizEditor({ quiz }: { quiz: Quiz }) {
  const router = useRouter();
  const [title, setTitle] = useState(quiz.title);
  const [minutes, setMinutes] = useState(Math.round(quiz.timeLimit / 60));
  const [passScore, setPassScore] = useState(quiz.passScore);

  async function saveMeta(patch: Record<string, unknown>) {
    await fetch(`/api/admin/quizzes/${quiz.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  }

  async function deleteQuiz() {
    if (!confirm("ลบข้อสอบชุดนี้? คำถามทั้งหมดจะถูกลบด้วย")) return;
    const res = await fetch(`/api/admin/quizzes/${quiz.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "ลบไม่สำเร็จ");
      return;
    }
    router.push("/admin/quizzes");
    router.refresh();
  }

  async function addQuestion(type: "MCQ" | "SHORT_ANSWER") {
    const text = prompt("โจทย์คำถาม:");
    if (!text?.trim()) return;

    let choices: Choice[] | undefined;
    let correctAnswer = "";

    if (type === "MCQ") {
      const raw = prompt("ตัวเลือก (คั่นด้วย | เช่น A|B|C|D):");
      if (!raw?.trim()) return;
      choices = raw.split("|").map((t, i) => ({ id: String(i + 1), text: t.trim() }));
      const correctIdx = prompt(
        `ข้อที่ถูกต้อง (พิมพ์หมายเลข 1-${choices.length}):\n` +
          choices.map((c, i) => `${i + 1}. ${c.text}`).join("\n")
      );
      const idx = Number(correctIdx) - 1;
      if (!choices[idx]) {
        alert("หมายเลขไม่ถูกต้อง ยกเลิกการเพิ่มคำถาม");
        return;
      }
      correctAnswer = choices[idx].id;
    } else {
      const answer = prompt("คำตอบที่ถูกต้อง:");
      if (!answer?.trim()) return;
      correctAnswer = answer.trim();
    }

    const explanation = prompt("คำอธิบายเฉลย (ไม่บังคับ เว้นว่างได้):") ?? undefined;

    const res = await fetch(`/api/admin/quizzes/${quiz.id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, type, choices, correctAnswer, explanation }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "เพิ่มคำถามไม่สำเร็จ");
      return;
    }
    router.refresh();
  }

  async function deleteQuestion(qid: string) {
    if (!confirm("ลบคำถามนี้?")) return;
    await fetch(`/api/admin/quizzes/${quiz.id}/questions/${qid}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-extrabold tracking-[-0.02em]">แก้ไขข้อสอบ</h2>
        <button onClick={deleteQuiz} className="text-[13px] font-semibold text-muted hover:text-ink transition">
          ลบข้อสอบนี้
        </button>
      </div>

      {quiz.lesson && (
        <p className="text-xs text-muted -mt-4">ผูกกับบทเรียน: {quiz.lesson.title}</p>
      )}
      {quiz._count.attempts > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 -mt-2">
          มีนักเรียนทำข้อสอบชุดนี้ไปแล้ว {quiz._count.attempts} คน — แก้คำถามที่มีคนตอบแล้วอาจทำให้คะแนนเก่าไม่ตรงกับเฉลยใหม่
        </p>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-secondary">ชื่อข้อสอบ</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => saveMeta({ title })}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-secondary">เวลาทำ (นาที)</label>
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            onBlur={() => saveMeta({ timeLimitMinutes: minutes })}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-secondary">เกณฑ์ผ่าน (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={passScore}
            onChange={(e) => setPassScore(Number(e.target.value))}
            onBlur={() => saveMeta({ passScore })}
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3.5 pt-5 border-t border-border-light">
        <div className="flex justify-between items-center">
          <div className="text-base font-bold">คำถาม ({quiz.questions.length})</div>
          <div className="flex gap-2">
            <button
              onClick={() => addQuestion("MCQ")}
              className="text-[13px] font-semibold text-ink bg-panel px-4 py-2 rounded-pill hover:bg-border-light transition-all duration-150 active:scale-[0.96]"
            >
              + คำถามแบบเลือกตอบ
            </button>
            <button
              onClick={() => addQuestion("SHORT_ANSWER")}
              className="text-[13px] font-semibold text-ink bg-panel px-4 py-2 rounded-pill hover:bg-border-light transition-all duration-150 active:scale-[0.96]"
            >
              + คำถามแบบเติมคำตอบ
            </button>
          </div>
        </div>

        {quiz.questions.map((q, i) => (
          <div key={q.id} className="flex flex-col gap-2 p-3.5 rounded-2xl bg-panel">
            <div className="flex justify-between items-start gap-3">
              <div className="text-[14px] font-semibold">
                {i + 1}. {q.text}
              </div>
              <button onClick={() => deleteQuestion(q.id)} className="text-[13px] text-muted hover:text-ink flex-shrink-0">
                ลบ
              </button>
            </div>
            {q.type === "MCQ" && q.choices ? (
              <div className="flex flex-col gap-1 pl-4">
                {q.choices.map((c) => (
                  <div
                    key={c.id}
                    className={`text-[13px] ${c.id === q.correctAnswer ? "font-bold text-ink" : "text-secondary"}`}
                  >
                    {c.id === q.correctAnswer ? "✓ " : "· "}
                    {c.text}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-secondary pl-4">คำตอบที่ถูกต้อง: {q.correctAnswer}</div>
            )}
            {q.explanation && <div className="text-xs text-muted pl-4">เฉลย: {q.explanation}</div>}
          </div>
        ))}
        {quiz.questions.length === 0 && <p className="text-muted text-sm">ยังไม่มีคำถาม</p>}
      </div>
    </div>
  );
}
