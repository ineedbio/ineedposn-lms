import Link from "next/link";
import CourseCover from "./CourseCover";
import { baht, duration, subjectKey } from "@/lib/site";

export type TileCourse = {
  slug: string;
  title: string;
  description: string;
  price: number;
  fullPrice?: number | null;
  level?: string | null;
  coverImage: string | null;
  subject: { slug: string; name: string };
  lessonCount: number;
  totalSeconds: number;
};

/** Course card used on the home page grid and the student dashboard. */
export default function CourseTile({ course, badge, href }: { course: TileCourse; badge?: React.ReactNode; href?: string }) {
  return (
    <Link
      href={href ?? `/courses/${course.slug}`}
      className={`s-${subjectKey(course.subject)} group flex flex-col overflow-hidden rounded-card border border-border bg-paper no-underline transition duration-200 hover:-translate-y-0.5 hover:border-secondary`}
    >
      <CourseCover course={course}>
        {course.fullPrice && (
          <span className="absolute left-3 top-3 rounded-pill bg-no px-2.5 py-0.5 text-xs font-semibold text-white">ลด ฿{(course.fullPrice - course.price).toLocaleString()}</span>
        )}
        {course.level && (
          <span className="absolute bottom-3 right-3 rounded-pill bg-paper/90 px-2.5 py-0.5 text-xs font-semibold text-accent">{course.level}</span>
        )}
      </CourseCover>
      <div className="flex flex-1 flex-col gap-1.5 px-[18px] pb-[18px] pt-4">
        {course.coverImage && <span className="text-[13px] font-semibold text-accent">{course.subject.name}</span>}
        <h3 className="text-xl font-bold leading-snug">{course.title}</h3>
        <p className="line-clamp-2 text-sm text-secondary">{course.description}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
          <span className="text-[17px] font-semibold tabular-nums">
            {course.fullPrice && <span className="mr-1.5 text-[0.8em] font-normal text-muted line-through">฿{course.fullPrice.toLocaleString()}</span>}
            {baht(course.price)}
          </span>
          {badge ?? (
            <span className="text-[13.5px] text-muted">
              {course.lessonCount} ตอน{course.totalSeconds ? ` · ${duration(course.totalSeconds)}` : ""}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
