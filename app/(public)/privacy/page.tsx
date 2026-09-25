import LegalPage from "@/components/LegalPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "นโยบายความเป็นส่วนตัว · INeedBio" };

export default function Page() {
  return <LegalPage kind="privacy" />;
}
