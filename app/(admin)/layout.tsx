import AdminSidebar from "@/components/AdminSidebar";
import { Toaster } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pending = await prisma.payment.count({ where: { status: "PENDING" } });
  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[230px_minmax(0,1fr)]">
      <AdminSidebar pending={pending} />
      <main className="min-w-0">{children}</main>
      <Toaster />
    </div>
  );
}
