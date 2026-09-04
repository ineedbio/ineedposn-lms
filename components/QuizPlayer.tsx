"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Choice = { id: string; text: string };
type Question = {
  id: string;
  text: string;
  type: "MCQ" | "SHORT_ANSWER";
  choices: Choice[] | null;
};
type QuizData = {
  id: string;
  title: string;
  timeLimit: number;
  passScore: number;
  questions: Question[];
};
type Result = {
  questionId: string;
  correct: boolean;
  correctAnswer: string;
  explanation: string | null;
};
type SubmitResponse = { score: number; isPassed: boolean; passScore: number; results: Result[] };

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function QuizPlayer({ quiz }: { quiz: QuizData }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const submittingRef = useRef(false);

  const resultByQuestion = useMemo(() => {
    const map = new Map<string, Result>();
    result?.results.forEach((r) => map.set(r.questionId, r));
    return map;
  }, [result]);

  async function submit() {
    if (submittingRef.current || result) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "ส่งคำตอบไม่สำเร็จ กรุณาลองใหม่");
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }
      setResult(data);
    } catch {
      setError("ส่งคำตอบไม่สำเร็จ กรุณาลองใหม่");
      submittingRef.current = false;
    }
    setSubmitting(false);
  }

  useEffect(() => {
    if (result) return;
    if (timeLeft <= 0) {
      submit();
      return;
    }
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, result]);

  function retake() {
    setAnswers({});
    setTimeLeft(quiz.timeLimit);
    setResult(null);
    setError("");
    submittingRef.current = false;
  }

  if (result) {
    return (
      <div className="w-full max-w-[800px] bg-white text-ink rounded-2xl p-8 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className={`text-5xl font-extrabold ${result.isPassed ? "text-green-600" : "text-red-600"}`}>
            {result.score}%
          </div>
          <div className="text-lg font-bold">{result.isPassed ? "ผ่านเกณฑ์ 🎉" : "ยังไม่ผ่านเกณฑ์"}</div>
          <div className="text-sm text-secondary">เกณฑ์ผ่าน {result.passScore}%</div>
        </div>

        <div className="flex flex-col gap-4">
          {quiz.questions.map((q, i) => {
            const r = resultByQuestion.get(q.id);
            return (
              <div
                key={q.id}
                className={`p-4 rounded-xl border ${r?.correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
              >
                <div className="text-sm font-semibold mb-1">
                  {i + 1}. {q.text}
                </div>
                <div className="text-sm">
                  คำตอบของคุณ: <span className="font-medium">{answers[q.id] || "(ไม่ได้ตอบ)"}</span>
                </div>
                {!r?.correct && (
                  <div className="text-sm mt-1">
                    เฉลย: <span className="font-medium">{r?.correctAnswer}</span>
                  </div>
                )}
                {r?.explanation && <div className="text-sm text-secondary mt-1">{r.explanation}</div>}
              </div>
            );
          })}
        </div>

        <button
          onClick={retake}
          className="self-center h-11 px-6 rounded-pill bg-ink text-white text-sm font-semibold hover:bg-dark-hover transition-all duration-150 active:scale-95"
        >
          ทำอีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[800px] bg-white text-ink rounded-2xl p-8 flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-extrabold tracking-[-0.02em]">{quiz.title}</h2>
        <div
          className={`text-sm font-bold px-3 py-1.5 rounded-pill ${
            timeLeft <= 30 ? "bg-red-100 text-red-700" : "bg-panel text-ink"
          }`}
        >
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}

      <div className="flex flex-col gap-6">
        {quiz.questions.map((q, i) => (
          <div key={q.id} className="flex flex-col gap-3">
            <div className="text-[15px] font-semibold">
              {i + 1}. {q.text}
            </div>
            {q.type === "MCQ" ? (
              <div className="flex flex-col gap-2">
                {(q.choices ?? []).map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-[1.5px] cursor-pointer transition ${
                      answers[q.id] === c.id ? "border-ink bg-panel" : "border-border hover:border-secondary"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === c.id}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: c.id }))}
                      className="accent-ink"
                    />
                    <span className="text-sm">{c.text}</span>
                  </label>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                placeholder="พิมพ์คำตอบ..."
                className="h-11 rounded-xl border-[1.5px] border-border px-4 text-sm focus:outline-none focus:border-ink transition"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={submit}
        disabled={submitting}
        className="h-12 rounded-pill bg-ink text-white text-base font-semibold hover:bg-dark-hover transition-all duration-150 active:scale-[0.97] disabled:opacity-50"
      >
        {submitting ? "กำลังส่ง..." : "ส่งคำตอบ"}
      </button>
    </div>
  );
}
