"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const kicked = params.get("kicked") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      if (res.error.includes("EMAIL_NOT_VERIFIED")) {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
        return;
      }
      if (res.error.includes("TOO_MANY_ATTEMPTS")) {
        setError("เข้าสู่ระบบผิดหลายครั้งเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง");
        return;
      }
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-[400px] flex flex-col gap-8">
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-[32px] font-extrabold tracking-[-0.02em]">เข้าสู่ระบบ</h1>
          <p className="text-base text-secondary">ยินดีต้อนรับกลับมา</p>
        </div>

        {kicked && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            บัญชีนี้ถูกใช้งานจากอุปกรณ์อื่น เซสชันนี้จึงถูกตัดออก
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-ink">อีเมล</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl border-[1.5px] border-border px-4 text-[15px] focus:outline-none focus:border-ink transition"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-ink">รหัสผ่าน</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl border-[1.5px] border-border px-4 text-[15px] focus:outline-none focus:border-ink transition"
            />
          </div>
          <Link href="/forgot-password" className="text-[13px] text-secondary self-end">
            ลืมรหัสผ่าน?
          </Link>
          <button
            disabled={loading}
            className="mt-2 h-[50px] rounded-pill bg-ink text-white text-base font-semibold flex items-center justify-center hover:bg-dark-hover hover:shadow-md transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div className="text-center text-sm text-secondary">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="font-semibold text-ink">
            สมัครสมาชิก
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
