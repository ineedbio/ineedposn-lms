import { requireAdmin } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();
  // Show exactly what was saved (empty = using the default), not the merged value.
  const [rows, merged] = await Promise.all([prisma.setting.findMany(), getSettings()]);
  const saved = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return <SettingsClient saved={saved} defaults={merged} />;
}
