import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* "active" is hardcoded until more admin pages exist alongside Payments */}
      <AdminSidebar active="/admin/payments" />
      <main className="flex-1">{children}</main>
    </div>
  );
}
