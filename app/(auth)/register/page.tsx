"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FIELDS: { name: string; label: string; type?: string }[] = [
  { name: "firstName", label: "ชื่อจริง" },
  { name: "lastName", label: "นามสกุล" },
  { name: "nickname", label: "ชื่อเล่น" },
  { name: "school", label: "โรงเรียน" },
  { name: "gradeLevel", label: "ระดับชั้น" },
  { name: "phone", label: "เบอร์โทรศัพท์" },
  { name: "email", label: "Email", type: "email" },
  { name: "password", label: "Password", type: "password" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.[0] ?? data.error ?? "สมัครไม่สำเร็จ");
      return;
    }
    router.push(`/verify-otp?email=${encodeURIComponent(form.email ?? "")}`);
  }

  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-6">สมัครสมาชิก</h1>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm mb-5">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label className="block text-xs text-ink/60 mb-1">{f.label}</label>
            <input
              type={f.type ?? "text"}
              required={["firstName", "lastName", "email", "password"].includes(f.name)}
              onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
              className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
        ))}
        <button
          disabled={loading}
          className="w-full bg-black text-white rounded-full py-3 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
        </button>
      </form>
    </main>
  );
}
