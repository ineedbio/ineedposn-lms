import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import DesignStudio from "./DesignStudio";

export const dynamic = "force-dynamic";

export default async function DesignStudioPage() {
  await requireAdmin();

  const blocks = await prisma.pageBlock.findMany({
    where: { page: "home" },
    orderBy: { order: "asc" },
  });

  return <DesignStudio initialBlocks={blocks as any} />;
}
