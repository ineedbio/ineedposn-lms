import Link from "next/link";
import Image from "next/image";

/** "INeedBio" wordmark with the mascot; "Bio" in the biology green like the Apps Script site. */
export default function Logo({ href = "/", suffix }: { href?: string; suffix?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-[19px] font-bold tracking-[-0.02em] text-ink no-underline">
      <Image src="/ineedbio-logo.png" alt="" width={30} height={30} className="rounded-full" />
      <span>
        INeed<span className="font-normal text-bio">Bio</span>
      </span>
      {suffix && <span className="ml-1 text-[13px] font-medium text-muted">{suffix}</span>}
    </Link>
  );
}
