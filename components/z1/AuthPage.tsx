import { AuthLink, OpenAuthOnLoad } from "./client";

/** Stand-alone auth URL: opens the auth modal over a short explainer (the Apps Script site only had the modal). */
export default function AuthPage({ mode, email }: { mode: "login" | "signup" | "forgot" | "otp"; email?: string }) {
  return (
    <>
      <OpenAuthOnLoad mode={mode} email={email} />
      <div className="empty" style={{ marginBlock: 60 }}>
        <p>เข้าสู่ระบบหรือสมัครสมาชิกเพื่อเรียนต่อ</p>
        <div className="rowx" style={{ justifyContent: "center" }}>
          <AuthLink mode="login" className="pill ghost">เข้าสู่ระบบ</AuthLink>
          <AuthLink mode="signup" className="pill">สมัครสมาชิก</AuthLink>
        </div>
      </div>
    </>
  );
}
