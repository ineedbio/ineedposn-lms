import LegalPage from "@/components/LegalPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "ข้อตกลงการใช้งาน · INeedBio" };

export default function Page() {
  return <LegalPage kind="terms" />;
}
