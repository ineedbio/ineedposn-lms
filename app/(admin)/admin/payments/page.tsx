import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import RequestsClient, { type ReqRow } from "./RequestsClient";

export const dynamic = "force-dynamic";

const TABS = { pending: "PENDING", approved: "APPROVED", rejected: "REJECTED" } as const;

export default async function AdminPaymentsPage({ searchParams }: { searchParams: { tab?: string } }) {
  // Defense in depth: middleware already blocks non-admins from /admin/*,
  // but the page (and every mutation it triggers) checks again independently.
  await requireAdmin();
  const tab = (searchParams.tab && searchParams.tab in TABS ? searchParams.tab : "pending") as keyof typeof TABS;

  const [rows, courses] = await Promise.all([
    prisma.payment.findMany({
      where: { status: TABS[tab] },
      include: { user: true, course: true },
      orderBy: tab === "pending" ? { createdAt: "asc" } : { reviewedAt: "desc" },
      take: tab === "pending" ? undefined : 100,
    }),
    prisma.course.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], select: { id: true, title: true, price: true } }),
  ]);

  const list: ReqRow[] = rows.map((p) => ({
    id: p.id,
    name: `${p.user.firstName} ${p.user.lastName}`,
    nickname: p.user.nickname ?? p.user.firstName,
    email: p.user.email,
    course: p.course.title,
    amount: p.amount,
    ref: p.promptpayRef,
    slip: p.slipImageUrl,
    note: p.note,
    reason: p.rejectReason,
    status: p.status,
    at: (tab === "pending" ? p.createdAt : p.reviewedAt ?? p.createdAt).toISOString(),
  }));

  return <RequestsClient tab={tab} rows={list} courses={courses} />;
}
