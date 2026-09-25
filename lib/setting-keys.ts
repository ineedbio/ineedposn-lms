// Keys editable from หลังบ้าน → ตั้งค่า. Kept free of server imports so client components can use it.
export const SETTING_KEYS = [
  "hero_eyebrow", "hero_title", "hero_subtitle", "announcement", "promptpay_id", "promptpay_name",
  "contact_ig", "contact_phone", "admin_emails", "terms_text", "privacy_text",
  "enroll_open", "enroll_closed_message",
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];
export type Settings = Record<SettingKey, string>;
