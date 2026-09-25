import Link from "next/link";
import LegalText from "./LegalText";
import { legalText } from "@/lib/legal";
import { getSettings } from "@/lib/settings";

const TABS = [
  ["terms", "ข้อตกลงการใช้งาน"],
  ["privacy", "นโยบายความเป็นส่วนตัว"],
] as const;

/** /terms and /privacy: the admin-edited text (or the default), with a switch between the two. */
export default async function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  const text = legalText(kind, await getSettings());
  return (
    <main className="mx-auto max-w-[760px] px-4 pb-16 pt-9">
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(([k, label]) => (
          <Link
            key={k}
            href={`/${k}`}
            aria-pressed={k === kind}
            className={`rounded-pill border px-4 py-1.5 text-sm no-underline ${k === kind ? "border-accent bg-accent text-on-accent" : "border-border text-secondary"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <LegalText text={text} />
    </main>
  );
}
