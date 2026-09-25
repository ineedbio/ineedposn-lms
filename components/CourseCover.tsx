import { subjectShort } from "@/lib/site";

type Props = {
  course: { coverImage?: string | null; subject: { slug?: string | null; name?: string | null } };
  className?: string;
  big?: boolean;
  children?: React.ReactNode;
};

/** 16:9 course cover: the uploaded image, or a typographic tile in the subject's accent color. */
export default function CourseCover({ course, className = "", big, children }: Props) {
  if (course.coverImage) {
    return (
      <span className={`relative block aspect-video overflow-hidden bg-accent-soft ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={course.coverImage} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        {children}
      </span>
    );
  }
  return (
    <span className={`relative flex aspect-video flex-col justify-end overflow-hidden bg-accent px-5 py-[18px] text-on-accent ${className}`}>
      <small className="absolute right-4 top-3.5 text-xs font-medium opacity-75">INeedBio</small>
      <b className={`font-bold leading-none tracking-[-0.02em] ${big ? "text-[clamp(64px,9vw,104px)]" : "text-[clamp(40px,5vw,54px)]"}`}>
        {subjectShort(course.subject)}
      </b>
      {children}
    </span>
  );
}
