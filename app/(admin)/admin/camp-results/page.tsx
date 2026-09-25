import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CampResultsClient from "./CampResultsClient";

export const dynamic = "force-dynamic";

export default async function CampResultsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  // ดึงข้อมูล สอวน. จาก Neon DB
  const record = await prisma.themeSetting.findUnique({
    where: { key: "posn_camp1_results" },
  });
  const initialData = record?.value ? JSON.parse(record.value) : [];

  return <CampResultsClient initialData={initialData} />;
}