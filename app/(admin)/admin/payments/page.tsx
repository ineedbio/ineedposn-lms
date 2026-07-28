import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import PaymentActions from "./PaymentActions";

export default async function AdminPaymentsPage() {
  // Defense in depth: middleware already blocks non-admins from /admin/*,
  // but the page (and every mutation it triggers) checks again independently.
  await requireAdmin();

  const payments = await prisma.payment.findMany({
    where: { status: "PENDING" },
    include: { user: true, course: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-8">คิวตรวจสอบการชำระเงิน</h1>
      <div className="space-y-3">
        {payments.map((p) => (
          <div key={p.id} className="border border-black/10 rounded-xl p-5 flex items-center justify-between">
            <div>
              <div className="font-medium">
                {p.user.firstName} {p.user.lastName} — {p.course.title}
              </div>
              <div className="text-sm text-ink/50">
                ฿{p.amount.toLocaleString()} · อ้างอิง {p.promptpayRef}
              </div>
              {p.slipImageUrl && (
                <a href={p.slipImageUrl} target="_blank" className="text-xs underline">
                  ดูสลิป
                </a>
              )}
            </div>
            <PaymentActions paymentId={p.id} />
          </div>
        ))}
        {payments.length === 0 && <p className="text-ink/40 text-sm">ไม่มีรายการรอตรวจสอบ</p>}
      </div>
    </main>
  );
}
