import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { baht, subjectKey } from "@/lib/site";

export const dynamic = "force-dynamic";

// Start of "today" and "this month" in Thai time, as UTC Date objects.
function bangkokStarts() {
  const offset = 7 * 3600_000;
  const now = new Date(Date.now() + offset);
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - offset;
  const month = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - offset;
  return { today: new Date(day), month: new Date(month) };
}

function Kpi({ label, value, sub, tone, href }: { label: string; value: string; sub: string; tone?: string; href?: string }) {
  const body = (
    <>
      <span className="text-[13px] text-secondary">{label}</span>
      <b className="text-[28px] font-bold leading-tight tabular-nums">{value}</b>
      <span className="text-[12.5px] text-muted">{sub}</span>
    </>
  );
  const cls = `grid gap-0.5 rounded-2xl border p-4 no-underline ${tone ?? "border-border"}`;
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

export default async function AdminDashboard() {
  await requireAdmin();
  const { today, month } = bangkokStarts();

  const [pending, oldest, usersTotal, usersToday, monthPays, activeEnrolls, subjects] = await Promise.all([
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.payment.findFirst({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "STUDENT", createdAt: { gte: today } } }),
    prisma.payment.findMany({
      where: { status: "APPROVED", reviewedAt: { gte: month } },
      select: { amount: true, course: { select: { subjectId: true } } },
    }),
    prisma.enrollment.count({ where: { status: "ACTIVE" } }),
    prisma.subject.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true, slug: true } }),
  ]);

  const revenue = monthPays.reduce((a, p) => a + p.amount, 0);
  const bySubject = subjects
    .map((s) => {
      const rows = monthPays.filter((p) => p.course.subjectId === s.id);
      return { ...s, count: rows.length, revenue: rows.reduce((a, p) => a + p.amount, 0) };
    })
    .filter((s) => s.count > 0 || subjects.length <= 4);
  const max = Math.max(1, ...bySubject.map((s) => s.revenue));

  return (
    <div className="grid gap-5 px-6 py-7 md:px-8">
      <h1 className="text-[26px] font-bold">ภาพรวม</h1>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
        <Kpi
          href="/admin/payments"
          label="รอตรวจสลิป"
          value={String(pending)}
          sub={oldest ? `เก่าสุด ${oldest.createdAt.toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" })}` : "ไม่มีคำขอค้าง"}
          tone={pending ? "border-chem bg-chem/10" : undefined}
        />
        <Kpi label="สมาชิกทั้งหมด" value={usersTotal.toLocaleString()} sub={`+${usersToday} วันนี้`} tone="border-bio/30 bg-bio/10" />
        <Kpi label="รายได้เดือนนี้" value={baht(revenue).replace("ฟรี", "฿0")} sub={`${monthPays.length} รายการที่อนุมัติ`} tone="border-phys/30 bg-phys/10" />
        <Kpi label="สิทธิ์เรียนที่ใช้งานอยู่" value={activeEnrolls.toLocaleString()} sub="นักเรียน × คอร์ส" tone="border-math/30 bg-math/10" />
      </div>

      <h3 className="mt-2 text-[17px] font-bold">รายได้ตามวิชา · เดือนนี้</h3>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-panel text-left text-[13px] text-secondary">
            <tr>
              <th className="px-4 py-2.5 font-medium">วิชา</th>
              <th className="px-4 py-2.5 text-right font-medium">ลงทะเบียน</th>
              <th className="px-4 py-2.5 text-right font-medium">รายได้</th>
              <th className="w-[40%] px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {bySubject.map((s) => (
              <tr key={s.id} className={`s-${subjectKey(s)} border-t border-border`}>
                <td className="px-4 py-3">
                  <i className="mr-2 inline-block h-2 w-2 rounded-full bg-accent" />
                  {s.name}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{s.count}</td>
                <td className="px-4 py-3 text-right tabular-nums">฿{s.revenue.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="h-2 overflow-hidden rounded-full bg-panel-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((s.revenue / max) * 100)}%` }} />
                  </div>
                </td>
              </tr>
            ))}
            {bySubject.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-secondary">เดือนนี้ยังไม่มีรายการที่อนุมัติ</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
