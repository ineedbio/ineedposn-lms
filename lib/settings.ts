import { cache } from "react";
import { prisma } from "./prisma";
import { SETTING_KEYS, type SettingKey, type Settings } from "./setting-keys";

export { SETTING_KEYS, type SettingKey, type Settings };

// Every key editable from หลังบ้าน → ตั้งค่า, with the value used when the admin
// hasn't set one yet.
export const SETTING_DEFAULTS: Settings = {
  hero_eyebrow: "INeedBio Online",
  hero_title: "ติวเข้ม ม.ปลาย|กับ INeedBio",
  hero_subtitle: "คอร์สเดียว เรียนได้ตลอดชีพ ไม่มีการลบคลิป",
  announcement: "",
  promptpay_id: process.env.PROMPTPAY_ID ?? "",
  promptpay_name: "",
  contact_ig: "ineedbiochem",
  contact_phone: "091-025-6171",
  admin_emails: process.env.ADMIN_NOTIFICATION_EMAIL ?? "",
  terms_text: "",
  privacy_text: "",
};


/** All settings merged over the defaults; cached for the duration of one request. */
export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await prisma.setting.findMany();
  const out = { ...SETTING_DEFAULTS };
  for (const r of rows) if (r.key in out && r.value !== "") out[r.key as SettingKey] = r.value;
  return out;
});
