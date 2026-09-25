import type { TileCourse } from "@/components/CourseTile";

// Prisma `include` for everything a course tile needs (lesson count + total length).
export const tileInclude = {
  subject: { select: { slug: true, name: true } },
  lessons: { select: { duration: true } },
} as const;

type WithTile = {
  slug: string;
  title: string;
  description: string;
  price: number;
  fullPrice: number | null;
  subtitle: string | null;
  level: string | null;
  coverImage: string | null;
  subject: { slug: string; name: string };
  lessons: { duration: number | null }[];
};

export function toTile(c: WithTile): TileCourse {
  return {
    slug: c.slug,
    title: c.title,
    description: c.subtitle || c.description,
    price: c.price,
    fullPrice: c.fullPrice && c.fullPrice > c.price ? c.fullPrice : null,
    level: c.level,
    coverImage: c.coverImage,
    subject: c.subject,
    lessonCount: c.lessons.length,
    totalSeconds: c.lessons.reduce((a, l) => a + (l.duration ?? 0), 0),
  };
}
