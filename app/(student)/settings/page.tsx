import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileForms from "@/components/z1/ProfileForms";
import { ThemeSwitch } from "@/components/z1/client";

export const dynamic = "force-dynamic";

// Port of viewProfile() from the Apps Script site (plus the profile photo this app already had).
export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const id = (session?.user as any)?.id as string | undefined;
  if (!id) redirect("/login");
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) redirect("/login");

  return (
    <>
      <div className="page-h"><span className="mono">บัญชี</span><h1>ข้อมูลส่วนตัว</h1></div>
      <div className="stack" style={{ gap: 20, maxWidth: 640, paddingBottom: 72 }}>
        <ProfileForms
          user={{
            firstName: u.firstName, lastName: u.lastName, nickname: u.nickname ?? "", grade: u.gradeLevel ?? "", school: u.school ?? "",
            phone: u.phone ?? "", email: u.email, avatarUrl: u.avatarUrl ?? "", dreamFaculty: u.dreamFaculty ?? "", dreamUniversity: u.dreamUniversity ?? "",
            currentFaculty: u.currentFaculty ?? "", currentUniversity: u.currentUniversity ?? "",
          }}
        />
        <div className="card spread">
          <div><h3>ธีมของเว็บ</h3><p className="sm ink2">ค่าเริ่มต้นจะสว่างหรือมืดตามการตั้งค่าของเครื่อง</p></div>
          <ThemeSwitch />
        </div>
        <p className="sm muted">
          อ่าน <Link href="/terms">ข้อตกลงการใช้งาน</Link> และ <Link href="/privacy">นโยบายความเป็นส่วนตัว</Link> · ต้องการลบบัญชี ทักแอดมินทาง IG
        </p>
      </div>
    </>
  );
}
