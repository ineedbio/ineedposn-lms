import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import PaymentActions from "./PaymentActions";

export default async function AdminPaymentsPage() {
  // Defense in depth: middleware already blocks non-admins from /admin/*,
  // but the page (and every mutation it triggers) checks again independently.
  await requireAdmin();

  const [pending, processed] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "PENDING" },
      include: { user: true, course: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.payment.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      include: { user: true, course: true },
      orderBy: { reviewedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <main className="px-14 pt-12 pb-24 max-w-[1200px]">
      <h1 className="text-[32px] font-extrabold tracking-[-0.02em] mb-2">คำขอชำระเงิน</h1>
      <p className="text-base text-secondary mb-10">ตรวจสอบสลิปและอนุมัติการลงทะเบียนคอร์ส</p>

      <div className="flex flex-col gap-2 mb-14">
        <div className="text-sm font-bold text-secondary mb-2">รอตรวจสอบ ({pending.length})</div>
        {pending.map((p) => (
          <div key={p.id} className="flex items-center gap-6 p-5 rounded-[18px] bg-panel">
            <div className="w-[70px] h-[70px] flex-shrink-0 rounded-xl bg-white border border-dashed border-border flex items-center justify-center text-muted text-[10px] overflow-hidden">
              {p.slipImageUrl ? (
                <a href={p.slipImageUrl} target="_blank" rel="noreferrer" className="w-full h-full">
                  <img src={p.slipImageUrl} alt="สลิป" className="w-full h-full object-cover" />
                </a>
              ) : (
                "สลิป"
              )}
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <div className="text-base font-bold">
                {p.user.firstName} {p.user.lastName}
              </div>
              <div className="text-sm text-secondary">
                {p.course.title} · อ้างอิง {p.promptpayRef}
              </div>
            </div>
            <div className="text-lg font-extrabold w-[110px]">฿{p.amount.toLocaleString()}</div>
            <PaymentActions paymentId={p.id} />
          </div>
        ))}
        {pending.length === 0 && (
          <div className="p-10 rounded-[18px] bg-panel text-center text-secondary text-[15px]">
            ไม่มีคำขอที่รอตรวจสอบ
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-sm font-bold text-secondary mb-2">ดำเนินการแล้ว</div>
        {processed.map((p) => (
          <div key={p.id} className="flex items-center gap-6 px-5 py-4 rounded-[18px] border border-border-light">
            <div className="flex-1 text-[15px] font-semibold">
              {p.user.firstName} {p.user.lastName}
            </div>
            <div className="flex-1 text-sm text-secondary">{p.course.title}</div>
            <div className={`text-sm font-bold ${p.status === "APPROVED" ? "text-ink" : "text-muted"}`}>
              {p.status === "APPROVED" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว"}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
