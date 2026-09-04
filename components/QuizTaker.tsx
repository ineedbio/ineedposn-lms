"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Button, { LinkButton } from "@/components/Button";

type Choice = { id: string; text: string };
type Question = {
  id: string;
  text: string;
  type: "MCQ" | "SHORT_ANSWER";
  choices: Choice[] | null;
};
type ReviewItem = {
  questionId: string;
  yourAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string | null;
};
type Result = { score: number; isPassed: boolean; total: number; correctCount: number; review: ReviewItem[] };

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function QuizTaker({
  quizId,
  title,
  timeLimit,
  passScore,
  questions,
  backHref,
}: {
  quizId: string;
  title: string;
  timeLimit: number;
  passScore: number;
  questions: Question[];
  backHref: string;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const submittedRef = useRef(false);

  async function submit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/quizzes/${quizId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "ส่งคำตอบไม่สำเร็จ");
        submittedRef.current = false;
        return;
      }
      setResult(data);
    } catch {
      setError("ส่งคำตอบไม่สำเร็จ กรุณาลองใหม่");
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (result) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          submit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (result) {
    const byId = new Map(result.review.map((r) => [r.questionId, r]));
    return (
      <div className="max-w-[900px] mx-auto px-6 py-14 flex flex-col gap-8">
        <div
          className={`p-8 rounded-3xl shadow-soft text-center flex flex-col items-center gap-2 ${
            result.isPassed ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          }`}
        >
          <div className={`text-sm font-semibold ${result.isPassed ? "text-green-700" : "text-red-700"}`}>
            {result.isPassed ? "ผ่านเกณฑ์ 🎉" : "ยังไม่ผ่านเกณฑ์"}
          </div>
          <div className="text-5xl font-extrabold tracking-[-0.02em]">{result.score}%</div>
          <div className="text-sm text-secondary">
            ตอบถูก {result.correctCount}/{result.total} ข้อ · เกณฑ์ผ่าน {passScore}%
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {questions.map((q, i) => {
            const r = byId.get(q.id);
            if (!r) return null;
            return (
              <div
                key={q.id}
                className={`p-4 rounded-2xl border shadow-soft ${
                  r.isCorrect ? "border-green-200 bg-green-50/40" : "border-red-200 bg-red-50/40"
                }`}
              >
                <div className="text-[14px] font-semibold mb-2">
                  {i + 1}. {q.text}
                </div>
                {q.type === "MCQ" && q.choices ? (
                  <div className="flex flex-col gap-1 pl-4 text-[13px]">
                    {q.choices.map((c) => {
                      const isCorrectChoice = c.id === r.correctAnswer;
                      const isYourChoice = c.id === r.yourAnswer;
                      return (
                        <div
                          key={c.id}
                          className={
                            isCorrectChoice
                              ? "font-bold text-green-700"
                              : isYourChoice
                                ? "font-bold text-red-700"
                                : "text-secondary"
                          }
                        >
                          {isCorrectChoice ? "✓ " : isYourChoice ? "✗ " : "· "}
                          {c.text}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[13px] pl-4 flex flex-col gap-0.5">
                    <div className={r.isCorrect ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
                      คำตอบของคุณ: {r.yourAnswer || "(ไม่ได้ตอบ)"}
                    </div>
                    {!r.isCorrect && <div className="text-secondary">คำตอบที่ถูกต้อง: {r.correctAnswer}</div>}
                  </div>
                )}
                {r.explanation && <div className="text-xs text-muted pl-4 mt-1.5">เฉลย: {r.explanation}</div>}
              </div>
            );
          })}
        </div>

        <LinkButton href={backHref} variant="secondary" size="sm" className="self-center">
          กลับไปเรียนต่อ
        </LinkButton>
      </div>
    );
  }

  const answeredCount = Object.values(answers).filter((v) => v.trim().length > 0).length;

  return (
    <div className="max-w-[900px] mx-auto px-6 py-14 flex flex-col gap-8">
      <div className="flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur py-3 z-10">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.02em]">{title}</h1>
          <p className="text-sm text-secondary mt-1">
            ตอบแล้ว {answeredCount}/{questions.length} ข้อ
          </p>
        </div>
        <div
          className={`text-lg font-bold px-4 py-2 rounded-pill shadow-soft transition-colors duration-200 ${
            timeLeft <= 60 ? "bg-red-50 text-red-700" : "bg-accent-soft text-accent"
          }`}
        >
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}

      <div className="flex flex-col gap-5">
        {questions.map((q, i) => (
          <div key={q.id} className="p-5 rounded-2xl bg-panel shadow-soft flex flex-col gap-3">
            <div className="text-[15px] font-semibold">
              {i + 1}. {q.text}
            </div>
            {q.type === "MCQ" && q.choices ? (
              <div className="flex flex-col gap-2">
                {q.choices.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2.5 text-[14px] cursor-pointer p-2 rounded-lg hover:bg-white transition-colors"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={c.id}
                      checked={answers[q.id] === c.id}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: c.id }))}
                      className="accent-accent"
                    />
                    {c.text}
                  </label>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                placeholder="พิมพ์คำตอบของคุณ"
                className="h-11 rounded-lg border-[1.5px] border-border px-3 text-[14px] bg-white focus:outline-none focus:border-accent transition"
              />
            )}
          </div>
        ))}
      </div>

      <Button onClick={submit} disabled={submitting} size="md" className="self-center px-10">
        {submitting ? "กำลังส่ง..." : "ส่งคำตอบ"}
      </Button>
    </div>
  );
}
