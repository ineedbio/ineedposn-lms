"use client";

/* Interactive pieces of the public site, ported 1:1 from the Apps Script frontend
   (same markup and class names, styled by app/z1.css). */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { FACULTIES, GRADES, REPEAT_GRADES, UNIS } from "@/lib/z1";

type AuthMode = "login" | "signup" | "otp" | "forgot" | "reset";
type Draft = Record<string, string | boolean>;
type Ctx = {
  toast: (msg: string, bad?: boolean) => void;
  openAuth: (mode: AuthMode, draft?: Draft) => void;
  notice: (title: string, msg: string) => void;
  preview: (youtubeId: string, title: string) => void;
};
const Z1 = createContext<Ctx>({ toast: () => {}, openAuth: () => {}, notice: () => {}, preview: () => {} });
export const useZ1 = () => useContext(Z1);

/* ─── provider: toasts + modal ─── */
export function Z1Provider({ legal, children }: { legal: { terms: string; privacy: string }; children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; msg: string; bad: boolean }[]>([]);
  const [modal, setModal] = useState<{ kind: "auth"; mode: AuthMode; draft: Draft } | { kind: "notice"; title: string; msg: string } | { kind: "legal"; which: "terms" | "privacy"; back: Draft } | { kind: "video"; id: string; title: string } | null>(null);

  const toast = useCallback((msg: string, bad = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, bad }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  const openAuth = useCallback((mode: AuthMode, draft: Draft = {}) => setModal({ kind: "auth", mode, draft }), []);
  const notice = useCallback((title: string, msg: string) => setModal({ kind: "notice", title, msg }), []);
  const preview = useCallback((id: string, title: string) => setModal({ kind: "video", id, title }), []);
  const close = useCallback(() => setModal(null), []);

  // A toast queued right before a full page load (e.g. after logging in on /login).
  useEffect(() => {
    try {
      const m = sessionStorage.getItem("z1-toast");
      if (m) { sessionStorage.removeItem("z1-toast"); toast(m); }
    } catch {}
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setModal(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Z1.Provider value={{ toast, openAuth, notice, preview }}>
      {children}
      <div id="modal">
        {modal && (
          <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && close()}>
            <div className={`modal${modal.kind === "legal" || modal.kind === "video" ? " wide" : ""}`} role="dialog" aria-modal="true">
              {modal.kind === "video" && (
                <>
                  <MHead title={modal.title} sub="ตอนตัวอย่าง ดูได้ฟรี" onClose={close} />
                  <div className="player"><YouTube id={modal.id} /></div>
                </>
              )}
              {modal.kind === "notice" && (
                <>
                  <MHead title={modal.title} onClose={close} />
                  <p className="ink2">{modal.msg}</p>
                  <button className="pill block" onClick={close}>ตกลง</button>
                </>
              )}
              {modal.kind === "legal" && (
                <>
                  <MHead title={modal.which === "terms" ? "ข้อตกลงการใช้งาน" : "นโยบายความเป็นส่วนตัว"} onClose={close} />
                  <div className="legal in-modal"><MdLite text={(modal.which === "terms" ? legal.terms : legal.privacy).replace(/^# .*\n/, "")} /></div>
                  <button className="pill block" onClick={() => setModal({ kind: "auth", mode: "signup", draft: modal.back })}>กลับไปสมัครต่อ</button>
                </>
              )}
              {modal.kind === "auth" && (
                <AuthBody
                  key={modal.mode}
                  mode={modal.mode}
                  draft={modal.draft}
                  onClose={close}
                  go={(mode, draft) => setModal({ kind: "auth", mode, draft: draft ?? {} })}
                  showLegal={(which, back) => setModal({ kind: "legal", which, back })}
                  toast={toast}
                />
              )}
            </div>
          </div>
        )}
      </div>
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast${t.bad ? " bad" : ""}`} role="status">{t.msg}</div>
        ))}
      </div>
    </Z1.Provider>
  );
}

export function MHead({ title, sub, onClose }: { title: ReactNode; sub?: ReactNode; onClose: () => void }) {
  return (
    <div className="mx">
      <div className="stack" style={{ gap: 4 }}>
        <h2>{title}</h2>
        {sub && <p className="ink2 sm">{sub}</p>}
      </div>
      <button className="x" onClick={onClose} aria-label="ปิด">×</button>
    </div>
  );
}

/** "# " heading, "## " subheading, "- " list, other lines paragraphs (same as the Apps Script mdLite). */
export function MdLite({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) out.push(<ul key={out.length}>{list.map((l, i) => <li key={i}>{l}</li>)}</ul>);
    list = [];
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("- ")) { list.push(line.slice(2)); continue; }
    flush();
    if (!line) continue;
    if (line.startsWith("## ")) out.push(<h3 key={out.length}>{line.slice(3)}</h3>);
    else if (line.startsWith("# ")) out.push(<h2 key={out.length}>{line.slice(2)}</h2>);
    else out.push(<p key={out.length}>{line}</p>);
  }
  flush();
  return <>{out}</>;
}

/* ─── form bits (same markup as field() in the Apps Script site) ─── */
export function Field({ label, name, value, onChange, type = "text", auto, mode, ph, hint, list, disabled }: {
  label: string; name: string; value: string; onChange?: (v: string) => void; type?: string; auto?: string; mode?: "tel" | "numeric" | "email";
  ph?: string; hint?: ReactNode; list?: string; disabled?: boolean;
}) {
  const [peek, setPeek] = useState(false);
  const id = "f-" + name;
  const input = (
    <input
      className="i" id={id} name={name} type={type === "password" && peek ? "text" : type} value={value} placeholder={ph}
      autoComplete={auto} inputMode={mode} list={list} disabled={disabled} onChange={(e) => onChange?.(e.target.value)}
    />
  );
  return (
    <label className="f" htmlFor={id}>
      {label}
      {type === "password" ? (
        <span className="pw">{input}<button type="button" onClick={() => setPeek((p) => !p)}>{peek ? "ซ่อน" : "แสดง"}</button></span>
      ) : input}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Select({ label, name, value, options, onChange }: { label: string; name: string; value: string; options: (string | [string, string])[]; onChange: (v: string) => void }) {
  return (
    <label className="f" htmlFor={"f-" + name}>
      {label}
      <select className="i" id={"f-" + name} name={name} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const [v, t] = Array.isArray(o) ? o : [o, o];
          return <option key={v} value={v}>{t}</option>;
        })}
      </select>
    </label>
  );
}

/** "เป้าหมายของน้อง" block, plus "ตอนนี้เรียนอยู่ที่ไหน" for students who finished ม.6. */
export function GoalFields({ v, set }: { v: Record<string, string>; set: (k: string, val: string) => void }) {
  const lf = (name: string, label: string, list: string, ph: string) => (
    <label className="f" htmlFor={"f-" + name}>
      {label}
      <input className="i" id={"f-" + name} name={name} list={list} value={v[name] ?? ""} placeholder={ph} autoComplete="off" onChange={(e) => set(name, e.target.value)} />
    </label>
  );
  return (
    <>
      <datalist id="dl-fac">{FACULTIES.map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="dl-uni">{UNIS.map((x) => <option key={x} value={x} />)}</datalist>
      <div className="gbox" hidden={!REPEAT_GRADES.includes(v.grade)}>
        <b>ตอนนี้เรียนอยู่ที่ไหน (เด็กซิ่ว)</b>
        <span className="hint">ถ้ายังไม่ได้เรียนที่ไหน พิมพ์ว่า &quot;ยังไม่ได้เรียน&quot;</span>
        <div className="row2">
          {lf("currentFaculty", "คณะที่เรียนอยู่", "dl-fac", "เช่น วิศวกรรมศาสตร์")}
          {lf("currentUniversity", "มหาวิทยาลัยที่เรียนอยู่", "dl-uni", "เช่น มหาวิทยาลัยเชียงใหม่")}
        </div>
      </div>
      <div className="gbox">
        <b>เป้าหมายของน้อง</b>
        <div className="row2">
          {lf("dreamFaculty", "คณะในฝัน", "dl-fac", "เช่น แพทยศาสตร์")}
          {lf("dreamUniversity", "มหาวิทยาลัยในฝัน", "dl-uni", "เช่น มหาวิทยาลัยมหิดล")}
        </div>
      </div>
    </>
  );
}

export function Spin() {
  return <span className="spin" />;
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
  return data;
}

function loginError(code: string) {
  if (code.includes("TOO_MANY_ATTEMPTS")) return "เข้าสู่ระบบผิดหลายครั้งเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง";
  if (code.includes("ACCOUNT_BANNED")) return "บัญชีนี้ถูกระงับ กรุณาติดต่อแอดมินทาง IG";
  if (code && code !== "CredentialsSignin" && !/^[A-Z_]+$/.test(code)) return code;
  return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
}

/* ─── auth modal (เข้าสู่ระบบ / สมัครสมาชิก / ยืนยันอีเมล / ลืมรหัสผ่าน) ─── */
function AuthBody({ mode, draft, onClose, go, showLegal, toast }: {
  mode: AuthMode; draft: Draft; onClose: () => void; go: (m: AuthMode, d?: Draft) => void;
  showLegal: (which: "terms" | "privacy", back: Draft) => void; toast: (m: string, bad?: boolean) => void;
}) {
  const router = useRouter();
  const [v, setV] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = { grade: "ม.4" };
    for (const [k, x] of Object.entries(draft)) if (typeof x === "string") o[k] = x;
    return o;
  });
  const [accept, setAccept] = useState(!!draft.accept);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [left, setLeft] = useState(60);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const set = (k: string, val: string) => setV((o) => ({ ...o, [k]: val }));
  const fail = (m: string) => { setErr(m); setBusy(false); };
  const done = (msg: string) => {
    onClose();
    // On the stand-alone auth pages, continue to the student's courses; elsewhere stay on the page.
    if (/^\/(login|register|forgot-password|verify-otp)/.test(window.location.pathname)) {
      try { sessionStorage.setItem("z1-toast", msg); } catch {}
      window.location.href = "/dashboard";
    } else {
      toast(msg);
      router.refresh();
    }
  };

  useEffect(() => {
    if (mode !== "otp" && mode !== "reset") return;
    setTimeout(() => otpRefs.current[0]?.focus(), 40);
    const t = setInterval(() => setLeft((l) => (l > 0 ? l - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "login") {
        const r = await signIn("credentials", { email: v.email ?? "", password: v.password ?? "", redirect: false });
        if (r?.error?.includes("EMAIL_NOT_VERIFIED")) {
          await fetch("/api/auth/verify-otp", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: v.email }) });
          return go("otp", { email: v.email ?? "" });
        }
        if (!r || r.error) return fail(loginError(r?.error ?? ""));
        const me = await fetch("/api/user/profile").then((x) => x.json()).catch(() => ({}));
        return done(`สวัสดี ${me.nickname || me.firstName || ""}`.trim());
      }
      if (mode === "signup") {
        if (!accept) return fail("กรุณาติ๊กยอมรับข้อตกลงการใช้งานและนโยบายความเป็นส่วนตัวก่อน");
        const fd = new FormData();
        const keys = ["firstName", "lastName", "nickname", "school", "phone", "email", "password", "dreamFaculty", "dreamUniversity", "currentFaculty", "currentUniversity"];
        for (const k of keys) fd.append(k, (v[k] ?? "").trim());
        fd.append("gradeLevel", v.grade ?? "");
        fd.append("acceptTerms", "1");
        const r = await post("/api/auth/register", fd);
        return go("otp", { ...v, email: r.email, accept: true });
      }
      if (mode === "forgot") {
        await post("/api/auth/forgot-password", { email: v.email });
        return go("reset", { email: (v.email ?? "").trim().toLowerCase() });
      }
      const code = otp.join("");
      if (code.length !== 6) return fail("กรอกรหัสให้ครบ 6 หลัก");
      if (mode === "otp") {
        const r = await signIn("credentials", { email: v.email ?? "", otp: code, redirect: false });
        if (!r || r.error) {
          setOtp(["", "", "", "", "", ""]);
          otpRefs.current[0]?.focus();
          return fail(r?.error && r.error !== "CredentialsSignin" ? loginError(r.error) : "รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว");
        }
        return done(`สร้างบัญชีแล้ว ยินดีต้อนรับ ${v.nickname || v.firstName || ""}`.trim());
      }
      // reset
      await post("/api/auth/reset-password", { email: v.email, otp: code, newPassword: v.password ?? "" });
      const r = await signIn("credentials", { email: v.email ?? "", password: v.password ?? "", redirect: false });
      if (!r || r.error) { onClose(); toast("ตั้งรหัสผ่านใหม่แล้ว เข้าสู่ระบบได้เลย"); return go("login", { email: v.email ?? "" }); }
      return done("ตั้งรหัสผ่านใหม่แล้ว");
    } catch (e) {
      fail((e as Error).message);
    }
  }

  async function resend() {
    setLeft(60);
    try {
      if (mode === "otp") {
        const res = await fetch("/api/auth/verify-otp", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: v.email }) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "ส่งรหัสไม่สำเร็จ");
      } else await post("/api/auth/forgot-password", { email: v.email });
      toast("ส่งรหัสใหม่แล้ว");
    } catch (e) {
      toast((e as Error).message, true);
      setLeft(0);
    }
  }

  const otpInputs = (
    <div className="otp">
      {otp.map((d, i) => (
        <input
          key={i}
          ref={(el) => { otpRefs.current[i] = el; }}
          value={d}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          aria-label={`หลักที่ ${i + 1}`}
          onChange={(e) => {
            const x = e.target.value.replace(/\D/g, "").slice(-1);
            setOtp((o) => o.map((y, j) => (j === i ? x : y)));
            if (x && i < 5) otpRefs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => { if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus(); }}
          onPaste={(e) => {
            const t = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
            if (!t) return;
            e.preventDefault();
            setOtp((o) => o.map((y, j) => t[j] ?? y));
            otpRefs.current[Math.min(t.length, 5)]?.focus();
          }}
        />
      ))}
    </div>
  );

  const btn = (label: string) => <button className="pill block" disabled={busy}>{busy ? <Spin /> : label}</button>;
  const error = err ? <p className="err">{err}</p> : null;

  if (mode === "login")
    return (
      <>
        <MHead title="ยินดีต้อนรับกลับ" onClose={onClose} />
        <div className="tabs"><button aria-pressed="true">เข้าสู่ระบบ</button><button onClick={() => go("signup")}>สมัครสมาชิก</button></div>
        <form className="form" onSubmit={submit}>
          <Field label="อีเมล" name="email" type="email" auto="email" value={v.email ?? ""} onChange={(x) => set("email", x)} />
          <Field label="รหัสผ่าน" name="password" type="password" auto="current-password" value={v.password ?? ""} onChange={(x) => set("password", x)} />
          {error}
          {btn("เข้าสู่ระบบ")}
        </form>
        <button className="link" style={{ justifySelf: "center" }} onClick={() => go("forgot", { email: v.email ?? "" })}>ลืมรหัสผ่าน</button>
      </>
    );
  if (mode === "signup")
    return (
      <>
        <MHead title="สร้างบัญชี" sub="ใช้อีเมลที่เปิดดูได้จริง ระบบจะส่งรหัสยืนยันไปที่อีเมลนี้" onClose={onClose} />
        <div className="tabs"><button onClick={() => go("login")}>เข้าสู่ระบบ</button><button aria-pressed="true">สมัครสมาชิก</button></div>
        <div className="dots"><i className="on" /><i /></div>
        <form className="form" onSubmit={submit}>
          <div className="row2">
            <Field label="ชื่อ" name="firstName" auto="given-name" value={v.firstName ?? ""} onChange={(x) => set("firstName", x)} />
            <Field label="นามสกุล" name="lastName" auto="family-name" value={v.lastName ?? ""} onChange={(x) => set("lastName", x)} />
          </div>
          <div className="row2">
            <Field label="ชื่อเล่น" name="nickname" value={v.nickname ?? ""} onChange={(x) => set("nickname", x)} />
            <Select label="ระดับชั้น" name="grade" value={v.grade ?? "ม.4"} options={GRADES} onChange={(x) => set("grade", x)} />
          </div>
          <Field label="โรงเรียน (หรือโรงเรียนที่จบมา)" name="school" value={v.school ?? ""} onChange={(x) => set("school", x)} />
          <GoalFields v={v} set={set} />
          <div className="row2">
            <Field label="เบอร์โทร" name="phone" mode="tel" auto="tel" ph="08x-xxx-xxxx" value={v.phone ?? ""} onChange={(x) => set("phone", x)} />
            <Field label="อีเมล" name="email" type="email" auto="email" value={v.email ?? ""} onChange={(x) => set("email", x)} />
          </div>
          <Field label="รหัสผ่าน (อย่างน้อย 8 ตัว)" name="password" type="password" auto="new-password" value={v.password ?? ""} onChange={(x) => set("password", x)} />
          <label className="consent">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
            <span>
              ฉันได้อ่านและยอมรับ{" "}
              <button type="button" className="link" onClick={() => showLegal("terms", { ...v, accept })}>ข้อตกลงการใช้งาน</button> และ{" "}
              <button type="button" className="link" onClick={() => showLegal("privacy", { ...v, accept })}>นโยบายความเป็นส่วนตัว</button> ของ INeedBio
            </span>
          </label>
          {error}
          {btn("ส่งรหัสยืนยันไปที่อีเมล")}
        </form>
      </>
    );
  if (mode === "forgot")
    return (
      <>
        <MHead title="ลืมรหัสผ่าน" sub="กรอกอีเมลที่ใช้สมัคร ระบบจะส่งรหัสสำหรับตั้งรหัสผ่านใหม่" onClose={onClose} />
        <form className="form" onSubmit={submit}>
          <Field label="อีเมล" name="email" type="email" auto="email" value={v.email ?? ""} onChange={(x) => set("email", x)} />
          {error}
          {btn("ส่งรหัส")}
        </form>
        <button className="link" style={{ justifySelf: "center" }} onClick={() => go("login", { email: v.email ?? "" })}>กลับไปเข้าสู่ระบบ</button>
      </>
    );
  return (
    <>
      <MHead title={mode === "otp" ? "ยืนยันอีเมล" : "ตั้งรหัสผ่านใหม่"} onClose={onClose} />
      {mode === "otp" && <div className="dots"><i className="on" /><i className="on" /></div>}
      <p className="ink2">
        ส่งรหัส 6 หลักไปที่ <b style={{ color: "rgb(var(--ink))" }}>{v.email}</b> แล้ว รหัสใช้ได้ภายใน 10 นาที ถ้าไม่เจอให้ดูในโฟลเดอร์สแปม
      </p>
      <form className="form" onSubmit={submit}>
        {otpInputs}
        {mode === "reset" && (
          <Field label="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)" name="password" type="password" auto="new-password" value={v.password ?? ""} onChange={(x) => set("password", x)} />
        )}
        {error}
        {btn(mode === "otp" ? "ยืนยันและสร้างบัญชี" : "ตั้งรหัสผ่านใหม่")}
      </form>
      <button className="link" style={{ justifySelf: "center" }} disabled={left > 0} onClick={resend}>
        {left > 0 ? `ส่งรหัสอีกครั้ง (${left})` : "ส่งรหัสอีกครั้ง"}
      </button>
    </>
  );
}

/** Opens the auth modal on first render (used by /login, /register, /forgot-password, /verify-otp). */
export function OpenAuthOnLoad({ mode, email }: { mode: AuthMode; email?: string }) {
  const { openAuth } = useZ1();
  useEffect(() => { openAuth(mode, email ? { email } : {}); }, [mode, email, openAuth]);
  return null;
}

/* ─── header pieces ─── */
const ICON = {
  auto: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>,
  light: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  dark: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" /></svg>,
};

export function ThemeSwitch() {
  const [mode, setMode] = useState<"auto" | "light" | "dark">("auto");
  const { toast } = useZ1();
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setMode(t === "light" || t === "dark" ? t : "auto");
  }, []);
  const pick = (m: "auto" | "light" | "dark") => {
    setMode(m);
    const r = document.documentElement;
    if (m === "auto") delete r.dataset.theme;
    else r.dataset.theme = m;
    try { if (m === "auto") localStorage.removeItem("theme"); else localStorage.setItem("theme", m); } catch {}
    toast(m === "auto" ? "ใช้ธีมตามเครื่อง" : m === "dark" ? "เปลี่ยนเป็นธีมมืด" : "เปลี่ยนเป็นธีมสว่าง");
  };
  return (
    <div className="thm" role="group" aria-label="ธีม">
      {([["auto", "ตามเครื่อง"], ["light", "ธีมสว่าง"], ["dark", "ธีมมืด"]] as const).map(([k, label]) => (
        <button key={k} type="button" aria-pressed={mode === k} title={label} aria-label={label} onClick={() => pick(k)}>{ICON[k]}</button>
      ))}
    </div>
  );
}

export type NavItem = { href: string; label: string; key: string };

function activeKey(path: string) {
  if (path === "/" || path.startsWith("/courses")) return "home";
  if (path.startsWith("/results")) return "results";
  if (path.startsWith("/dashboard") || path.startsWith("/learn")) return "my";
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/settings")) return "profile";
  return "";
}

export function Nav({ items, mobile }: { items: NavItem[]; mobile?: boolean }) {
  const a = activeKey(usePathname() ?? "/");
  return (
    <nav className={mobile ? "mnav" : "nav"} aria-label={mobile ? "เมนู" : undefined}>
      {items.map((n) => <Link key={n.key} href={n.href} className={a === n.key ? "on" : ""}>{n.label}</Link>)}
    </nav>
  );
}

export function Search() {
  const router = useRouter();
  const [q, setQ] = useState("");
  useEffect(() => { setQ(new URLSearchParams(window.location.search).get("q") ?? ""); }, []);
  return (
    <form className="srch" role="search" onSubmit={(e) => { e.preventDefault(); router.push(q.trim() ? `/?q=${encodeURIComponent(q.trim())}#courses` : "/#courses"); }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
      <input name="q" placeholder="ค้นหาคอร์ส เช่น ชีวะ, A-Level" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
    </form>
  );
}

export function Who({ nickname, fullName, email, avatarUrl, isAdmin }: { nickname: string; fullName: string; email: string; avatarUrl?: string | null; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div className="who" ref={ref}>
      <button id="who-btn" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="av" style={{ position: "relative", overflow: "hidden" }}>
          {nickname.slice(0, 1)}
          {avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </span>
        <span className="sm">{nickname}</span>
      </button>
      {open && (
        <div className="menu" id="who-menu">
          <div className="hd"><b>{fullName}</b><div className="muted">{email}</div></div>
          <Link href="/dashboard" onClick={() => setOpen(false)}>คอร์สของฉัน</Link>
          <Link href="/settings" onClick={() => setOpen(false)}>ข้อมูลส่วนตัว</Link>
          {isAdmin && <Link href="/admin" onClick={() => setOpen(false)}>หลังบ้าน</Link>}
          <button onClick={() => signOut({ callbackUrl: "/" })}>ออกจากระบบ</button>
        </div>
      )}
    </div>
  );
}

export function AuthButtons() {
  const { openAuth } = useZ1();
  return (
    <div className="rowx">
      <button className="pill ghost s" onClick={() => openAuth("login")}>เข้าสู่ระบบ</button>
      <button className="pill s" onClick={() => openAuth("signup")}>สมัครสมาชิก</button>
    </div>
  );
}

/** Any button that opens the login/signup modal. */
export function AuthLink({ mode, className, children }: { mode: AuthMode; className: string; children: ReactNode }) {
  const { openAuth } = useZ1();
  return <button className={className} onClick={() => openAuth(mode)}>{children}</button>;
}

/** Button that shows a notice popup (used while enrollment is closed). */
export function NoticeButton({ className, title, msg, children }: { className: string; title: string; msg: string; children: ReactNode }) {
  const { notice } = useZ1();
  return <button className={className} onClick={() => notice(title, msg)}>{children}</button>;
}

export function Fab({ ig }: { ig: string }) {
  return (
    <div className="fab">
      <a className="ig" href={`https://www.instagram.com/${ig}`} target="_blank" rel="noopener" title="ทักแอดมินทาง IG" aria-label="ทักแอดมินทาง IG">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /></svg>
      </a>
      <button title="กลับขึ้นบน" aria-label="กลับขึ้นบน" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
      </button>
    </div>
  );
}

/** Sets the page's subject accent (like setSubj() on the Apps Script site) on the .z1 wrapper. */
export function SubjectAccent({ subject }: { subject: string }) {
  useEffect(() => {
    const el = document.querySelector(".z1");
    if (!el) return;
    el.classList.add(`s-${subject}`);
    return () => el.classList.remove(`s-${subject}`);
  }, [subject]);
  return null;
}

/** Scrolls to an element id with the header offset (data-jump / data-jump2 on the Apps Script site). */
export function JumpButton({ to, offset = 120, className, children }: { to: string; offset?: number; className?: string; children: ReactNode }) {
  return (
    <button
      className={className}
      onClick={() => {
        const el = document.getElementById(to);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
      }}
    >
      {children}
    </button>
  );
}

export function YouTube({ id }: { id: string }) {
  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1&playsinline=1`}
      title="คลิปเรียน"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

export function PreviewButton({ id, title, className, style, children }: { id: string; title: string; className: string; style?: React.CSSProperties; children: ReactNode }) {
  const { preview } = useZ1();
  return <button className={className} style={style} onClick={() => preview(id, title)}>{children}</button>;
}

/** "เปิดทุกบท / ปิดทุกบท" toggle for the syllabus. */
export function SylAll() {
  const [allOpen, setAllOpen] = useState(false);
  return (
    <button
      className="link"
      onClick={() => {
        const ds = Array.from(document.querySelectorAll<HTMLDetailsElement>(".syl:not(.faq) details"));
        const open = ds.some((d) => !d.open);
        ds.forEach((d) => (d.open = open));
        setAllOpen(open);
      }}
    >
      {allOpen ? "ปิดทุกบท" : "เปิดทุกบท"}
    </button>
  );
}

/** QR + slip upload + send, the buy box on the Apps Script course page. */
export function PayBox({ courseId, price, qr, ppId, ppName }: { courseId: string; price: number; qr: string | null; ppId: string; ppName: string }) {
  const router = useRouter();
  const { toast } = useZ1();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const baht = "฿" + price.toLocaleString("th-TH");
  async function send() {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await post("/api/payments/slip", fd);
      await post("/api/payments", { courseId, slipImageUrl: up.url });
      toast("ส่งสลิปแล้ว แอดมินจะตรวจภายใน 24 ชั่วโมง");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, true);
      setBusy(false);
    }
  }
  return (
    <>
      <ol className="steps">
        <li>สแกน QR พร้อมเพย์ด้วยแอปธนาคาร ยอด {baht}</li>
        <li>แนบรูปสลิปการโอน</li>
        <li>รอแอดมินอนุมัติ ระบบจะส่งอีเมลแจ้ง</li>
      </ol>
      <div className="qrbox">
        <span className="pp">PromptPay</span>
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="QR พร้อมเพย์" style={{ width: 190, maxWidth: "100%" }} />
        ) : (
          <p style={{ padding: "30px 0" }}>โอนเข้าพร้อมเพย์ {ppId}</p>
        )}
        <small>{ppName}<br />ยอด {baht}</small>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (!f.type.startsWith("image/")) return toast("แนบได้เฉพาะรูปภาพ", true);
          setFile(f);
          setUrl(URL.createObjectURL(f));
        }}
      />
      <button className={`drop${url ? " has" : ""}`} type="button" onClick={() => input.current?.click()}>
        {url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="สลิปที่แนบ" />
            <span className="sm">แตะเพื่อเปลี่ยนรูป</span>
          </>
        ) : "แตะเพื่อแนบรูปสลิป"}
      </button>
      <button className="pill block" disabled={!file || busy} onClick={send}>{busy ? <Spin /> : "ส่งสลิปเพื่อยืนยัน"}</button>
    </>
  );
}
