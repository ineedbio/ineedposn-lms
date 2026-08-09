"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const GRADE_OPTIONS = ["มัธยมศึกษาปีที่ 4", "มัธยมศึกษาปีที่ 5", "มัธยมศึกษาปีที่ 6", "อื่น ๆ"];

const inputClass =
  "h-12 rounded-xl border-[1.5px] border-border px-4 text-[15px] focus:outline-none focus:border-ink transition";
const labelClass = "text-[13px] font-semibold text-ink";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({ gradeLevel: GRADE_OPTIONS[0] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(name: string, value: string) {
    setForm((f) => ({ ...f, [name]: value }));
  }

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
    <div className="flex-1 flex items-center justify-center px-6 pt-10 pb-20">
      <div className="w-full max-w-[520px] flex flex-col gap-8">
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-[32px] font-extrabold tracking-[-0.02em]">สมัครสมาชิก</h1>
          <p className="text-base text-secondary">เริ่มต้นเข้าใจชีววิทยาในแบบที่ไม่ลืม</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>ชื่อจริง</label>
              <input
                type="text"
                required
                placeholder="ชื่อจริง"
                onChange={(e) => set("firstName", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>นามสกุล</label>
              <input
                type="text"
                required
                placeholder="นามสกุล"
                onChange={(e) => set("lastName", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>ชื่อเล่น</label>
              <input
                type="text"
                placeholder="ชื่อเล่น"
                onChange={(e) => set("nickname", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>ระดับชั้น</label>
              <select
                value={form.gradeLevel}
                onChange={(e) => set("gradeLevel", e.target.value)}
                className={`${inputClass} bg-white`}
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>โรงเรียน</label>
            <input
              type="text"
              placeholder="ชื่อโรงเรียน"
              onChange={(e) => set("school", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>เบอร์โทร</label>
            <input
              type="tel"
              placeholder="08X-XXX-XXXX"
              onChange={(e) => set("phone", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>อีเมล</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              onChange={(e) => set("email", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>รหัสผ่าน</label>
            <input
              type="password"
              required
              placeholder="อย่างน้อย 8 ตัวอักษร"
              onChange={(e) => set("password", e.target.value)}
              className={inputClass}
            />
          </div>
          <button
            disabled={loading}
            className="mt-2 h-[50px] rounded-pill bg-ink text-white text-base font-semibold flex items-center justify-center hover:bg-dark-hover transition disabled:opacity-50"
          >
            {loading ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
          </button>
        </form>

        <div className="text-center text-sm text-secondary">
          มีบัญชีอยู่แล้ว?{" "}
          <Link href="/login" className="font-semibold text-ink">
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}
