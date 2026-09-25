"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminHeader, Badge, Btn, Empty, api, inputCls, thDate, toast, useConfirm } from "@/components/admin/ui";

type U = {
  id: string;
  name: string;
  nickname: string;
  email: string;
  phone: string;
  school: string;
  grade: string;
  role: string;
  banned: boolean;
  courses: string[];
  device: string;
  lastLogin: string | null;
};

export default function UsersClient({ users, q, me }: { users: U[]; q: string; me: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const { confirm, confirmNode } = useConfirm();

  async function act(u: U, action: "reset" | "admin" | "student" | "ban" | "unban") {
    const n = u.nickname || u.name;
    const cfg = {
      reset: [`ล้างอุปกรณ์ของ ${n}?`, `${n} จะออกจากระบบ แล้วเข้าสู่ระบบจากเครื่องใหม่ได้`, "ล้างอุปกรณ์"],
      admin: [`ตั้ง ${n} เป็นแอดมิน?`, "แอดมินอนุมัติสลิป แก้คอร์ส และจัดการผู้ใช้ได้ทั้งหมด", "ตั้งเป็นแอดมิน"],
      student: [`ถอดสิทธิ์แอดมินของ ${n}?`, `${n} จะเข้าหลังบ้านไม่ได้อีก`, "ถอดแอดมิน"],
      ban: [`ระงับบัญชี ${n}?`, `${n} จะถูกออกจากระบบทันทีและเข้าสู่ระบบไม่ได้จนกว่าจะยกเลิก`, "ระงับบัญชี"],
      unban: [`ยกเลิกการระงับ ${n}?`, `${n} จะเข้าสู่ระบบได้ตามปกติ`, "ยกเลิกระงับ"],
    }[action];
    if (!(await confirm({ title: cfg[0], body: cfg[1], ok: cfg[2], danger: action === "ban" }))) return;
    const body =
      action === "reset" ? { action } : action === "admin" || action === "student" ? { action: "role", role: action === "admin" ? "ADMIN" : "STUDENT" } : { action: "ban", banned: action === "ban" };
    try {
      await api(`/api/admin/users/${u.id}`, "PATCH", body);
      toast("เรียบร้อย");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  return (
    <div className="grid gap-5 px-6 py-7 md:px-8">
      <AdminHeader title="ผู้ใช้" />
      <form
        className="flex flex-wrap gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(query.trim() ? `/admin/users?q=${encodeURIComponent(query.trim())}` : "/admin/users");
        }}
      >
        <input className={`${inputCls} max-w-[360px]`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาชื่อ อีเมล เบอร์ หรือโรงเรียน" />
        <Btn type="submit" variant="ghost" small>ค้นหา</Btn>
      </form>
      {users.length ? (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-panel text-left text-[13px] text-secondary">
              <tr>
                <th className="px-4 py-2.5 font-medium">ชื่อ</th>
                <th className="px-4 py-2.5 font-medium">โรงเรียน</th>
                <th className="px-4 py-2.5 font-medium">คอร์สที่มีสิทธิ์</th>
                <th className="px-4 py-2.5 font-medium">อุปกรณ์ที่ใช้อยู่</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border align-top">
                  <td className="px-4 py-3">
                    {u.name}
                    {u.nickname && ` (${u.nickname})`} {u.role === "ADMIN" && <Badge tone="inv">แอดมิน</Badge>} {u.banned && <Badge tone="no">ระงับ</Badge>}
                    <div className="text-[12.5px] text-muted">{u.email}{u.phone ? ` · ${u.phone}` : ""}</div>
                  </td>
                  <td className="px-4 py-3">
                    {u.school || "–"}
                    <div className="text-[12.5px] text-muted">{u.grade}</div>
                  </td>
                  <td className="px-4 py-3 text-[13.5px]">{u.courses.length ? u.courses.map((c) => <div key={c}>{c}</div>) : <span className="text-muted">–</span>}</td>
                  <td className="px-4 py-3 text-[13.5px]">
                    {u.device ? (
                      <>
                        {u.device}
                        {u.lastLogin && <div className="text-[12.5px] text-muted">ตั้งแต่ {thDate(u.lastLogin, true)}</div>}
                      </>
                    ) : (
                      <span className="text-muted">ไม่ได้เข้าสู่ระบบ</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {u.id === me ? (
                        <span className="text-[12.5px] text-muted">บัญชีของคุณ</span>
                      ) : (
                        <>
                          {u.device && <Btn variant="quiet" small onClick={() => act(u, "reset")}>ล้างอุปกรณ์</Btn>}
                          <Btn variant="quiet" small onClick={() => act(u, u.role === "ADMIN" ? "student" : "admin")}>{u.role === "ADMIN" ? "ถอดแอดมิน" : "ตั้งเป็นแอดมิน"}</Btn>
                          <Btn variant={u.banned ? "quiet" : "danger"} small onClick={() => act(u, u.banned ? "unban" : "ban")}>{u.banned ? "ยกเลิกระงับ" : "ระงับ"}</Btn>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>ไม่พบผู้ใช้</Empty>
      )}
      {confirmNode}
    </div>
  );
}
