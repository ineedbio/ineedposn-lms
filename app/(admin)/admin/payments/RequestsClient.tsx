"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminHeader, Btn, Empty, Field, Modal, api, inputCls, thDate, toast } from "@/components/admin/ui";

export type ReqRow = {
  id: string;
  name: string;
  nickname: string;
  email: string;
  course: string;
  amount: number;
  ref: string;
  slip: string | null;
  note: string | null;
  reason: string | null;
  status: string;
  at: string;
};

const TABS = [
  ["pending", "รอตรวจ"],
  ["approved", "อนุมัติแล้ว"],
  ["rejected", "ปฏิเสธแล้ว"],
] as const;

export default function RequestsClient({ tab, rows, courses }: { tab: string; rows: ReqRow[]; courses: { id: string; title: string; price: number }[] }) {
  const router = useRouter();
  const [slip, setSlip] = useState<ReqRow | null>(null);
  const [grant, setGrant] = useState(false);
  const pending = tab === "pending";

  return (
    <div className="grid gap-5 px-6 py-7 md:px-8">
      <AdminHeader title="คำขอเข้าเรียน">
        <Btn variant="ghost" small onClick={() => setGrant(true)}>+ เพิ่มสิทธิ์ให้ผู้ใช้เอง</Btn>
      </AdminHeader>

      <div role="group" className="inline-flex w-fit gap-0.5 rounded-pill border border-border bg-paper p-[3px]">
        {TABS.map(([k, label]) => (
          <Link
            key={k}
            href={`/admin/payments${k === "pending" ? "" : `?tab=${k}`}`}
            aria-pressed={tab === k}
            className={`rounded-pill px-3.5 py-1 text-[13.5px] no-underline ${tab === k ? "bg-accent text-on-accent" : "text-secondary hover:text-ink"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {pending && <p className="text-sm text-secondary">เปิดดูสลิป ตรวจยอดและชื่อบัญชีให้ตรงก่อนอนุมัติ เมื่ออนุมัติแล้ว นักเรียนได้อีเมลแจ้งและเข้าเรียนได้ทันที</p>}

      {rows.length ? (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-panel text-left text-[13px] text-secondary">
              <tr>
                <th className="px-4 py-2.5 font-medium">นักเรียน</th>
                <th className="px-4 py-2.5 font-medium">คอร์ส</th>
                <th className="px-4 py-2.5 text-right font-medium">ยอด</th>
                <th className="px-4 py-2.5 font-medium">{pending ? "ส่งเมื่อ" : "ตัดสินเมื่อ"}</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-4 py-3">
                    {r.name}
                    <div className="text-[12.5px] text-muted">{r.nickname} · {r.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {r.course}
                    {(r.note || r.reason) && <div className="text-[12.5px] text-muted">{r.note || `เหตุผล: ${r.reason}`}</div>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">฿{r.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[12.5px] text-muted">{thDate(r.at, true)}</td>
                  <td className="px-4 py-3 text-right">
                    {r.slip ? (
                      <Btn small variant={pending ? "primary" : "quiet"} onClick={() => setSlip(r)}>{pending ? "ตรวจสลิป" : "ดูสลิป"}</Btn>
                    ) : pending ? (
                      <Btn small onClick={() => setSlip(r)}>ตรวจ</Btn>
                    ) : (
                      <span className="text-[12.5px] text-muted">ไม่มีสลิป</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>{pending ? "ไม่มีคำขอค้าง ตรวจครบแล้ว" : "ยังไม่มีรายการ"}</Empty>
      )}

      {slip && <SlipModal r={slip} onClose={() => setSlip(null)} onDone={() => { setSlip(null); router.refresh(); }} />}
      {grant && <GrantModal courses={courses} onClose={() => setGrant(false)} onDone={() => { setGrant(false); router.push("/admin/payments?tab=approved"); router.refresh(); }} />}
    </div>
  );
}

function SlipModal({ r, onClose, onDone }: { r: ReqRow; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"" | "APPROVE" | "REJECT">("");
  const pending = r.status === "PENDING";

  async function decide(decision: "APPROVE" | "REJECT") {
    if (decision === "REJECT" && !reason.trim()) {
      toast("ใส่เหตุผลก่อนปฏิเสธ", true);
      document.getElementById("rej-reason")?.focus();
      return;
    }
    setBusy(decision);
    try {
      await api(`/api/payments/${r.id}/verify`, "PATCH", { decision, reason: reason.trim() || undefined });
      toast(decision === "APPROVE" ? `อนุมัติแล้ว ส่งอีเมลแจ้ง ${r.nickname} แล้ว` : "ปฏิเสธแล้ว ส่งอีเมลแจ้งเหตุผลแล้ว");
      onDone();
    } catch (e) {
      toast((e as Error).message, true);
      setBusy("");
    }
  }

  return (
    <Modal wide title={`สลิปของ ${r.nickname}`} sub={`${r.course} · ต้องโอน ฿${r.amount.toLocaleString()} · อ้างอิง ${r.ref}`} onClose={onClose}>
      {r.slip ? (
        <a href={r.slip} target="_blank" rel="noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.slip} alt="สลิปการโอน" className="mx-auto max-h-[60vh] rounded-xl border border-border object-contain" />
        </a>
      ) : (
        <p className="rounded-xl bg-panel px-4 py-6 text-center text-sm text-secondary">คำขอนี้ไม่มีรูปสลิป</p>
      )}
      {pending ? (
        <div className="grid gap-3">
          <Field label="เหตุผล (ใส่เมื่อปฏิเสธ นักเรียนจะเห็นในอีเมล)">
            <input id="rej-reason" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ยอดโอนไม่ครบ" />
          </Field>
          <div className="flex justify-end gap-2.5">
            <Btn variant="danger" busy={busy === "REJECT"} disabled={!!busy} onClick={() => decide("REJECT")}>ปฏิเสธ</Btn>
            <Btn busy={busy === "APPROVE"} disabled={!!busy} onClick={() => decide("APPROVE")}>อนุมัติ</Btn>
          </div>
        </div>
      ) : (
        r.reason && <p className="text-sm text-secondary">เหตุผลที่ปฏิเสธ: {r.reason}</p>
      )}
    </Modal>
  );
}

function GrantModal({ courses, onClose, onDone }: { courses: { id: string; title: string }[]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ email: "", courseId: courses[0]?.id ?? "", amount: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api("/api/admin/grant", "POST", { ...f, amount: Number(f.amount) || 0 });
      toast("เพิ่มสิทธิ์แล้ว ส่งอีเมลแจ้งนักเรียนแล้ว");
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal title="เพิ่มสิทธิ์เข้าเรียน" sub="ใช้เมื่อนักเรียนโอนผ่านช่องทางอื่น หรือให้สิทธิ์ฟรี ผู้ใช้ต้องสมัครสมาชิกก่อน" onClose={onClose}>
      <form className="grid gap-3.5" onSubmit={submit}>
        <Field label="อีเมลของนักเรียน">
          <input type="email" required className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label="คอร์ส">
          <select className={inputCls} value={f.courseId} onChange={(e) => setF({ ...f, courseId: e.target.value })}>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="ยอดที่รับ (บาท)">
            <input inputMode="numeric" className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="0 ถ้าให้ฟรี" />
          </Field>
          <Field label="หมายเหตุ">
            <input className={inputCls} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="เช่น โอนผ่าน IG" />
          </Field>
        </div>
        {err && <p className="text-sm text-no">{err}</p>}
        <Btn type="submit" busy={busy} className="justify-self-start">เพิ่มสิทธิ์</Btn>
      </form>
    </Modal>
  );
}
