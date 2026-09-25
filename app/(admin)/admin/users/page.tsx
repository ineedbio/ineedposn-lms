import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  await requireAdmin();
  const me = ((await getServerSession(authOptions))?.user as any)?.id as string;
  const q = (searchParams.q ?? "").trim();
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: ["firstName", "lastName", "nickname", "email", "phone", "school"].map((k) => ({ [k]: { contains: q, mode: "insensitive" as const } })),
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { enrollments: { where: { status: "ACTIVE" }, include: { course: { select: { title: true } } } } },
  });
  return (
    <UsersClient
      q={q}
      me={me}
      users={users.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        nickname: u.nickname ?? "",
        email: u.email,
        phone: u.phone ?? "",
        school: u.school ?? "",
        grade: u.gradeLevel ?? "",
        role: u.role,
        banned: u.isBanned,
        courses: u.enrollments.map((e) => e.course.title),
        device: u.currentSessionId ? u.currentDeviceInfo || "เข้าสู่ระบบอยู่" : "",
        lastLogin: u.lastLoginAt?.toISOString() ?? null,
      }))}
    />
  );
}
