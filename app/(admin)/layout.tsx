import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[230px_minmax(0,1fr)]">
      <AdminSidebar />
      <main className="min-w-0">{children}</main>
    </div>
  );
}
