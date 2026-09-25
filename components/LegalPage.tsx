import Link from "next/link";
import { legalText } from "@/lib/legal";
import { getSettings } from "@/lib/settings";
import { MdLite } from "./z1/client";

/** /terms and /privacy (port of viewLegal() from the Apps Script site). */
export default async function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  const text = legalText(kind, await getSettings());
  return (
    <div className="legal">
      <div className="rowx" style={{ marginBottom: 10 }}>
        <Link className="chip" href="/terms" aria-pressed={kind === "terms"}>ข้อตกลงการใช้งาน</Link>
        <Link className="chip" href="/privacy" aria-pressed={kind === "privacy"}>นโยบายความเป็นส่วนตัว</Link>
      </div>
      <MdLite text={text} />
    </div>
  );
}
