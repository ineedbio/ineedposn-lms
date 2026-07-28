import { prisma } from "./prisma";

/**
 * Called whenever an admin creates a new Subject. Every other part of the
 * system (course listing, homepage promo blocks, revenue reporting) reads
 * data by joining through subjectId, so as long as this scaffolding exists,
 * nothing else needs manual setup when a subject is added.
 */
export async function provisionSubject(input: {
  name: string;
  slug: string;
  colorTheme?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const subject = await tx.subject.create({
      data: {
        name: input.name,
        slug: input.slug,
        colorTheme: input.colorTheme ?? "#0B0B0C",
      },
    });

    // Default category so a course can be created immediately.
    await tx.category.create({
      data: {
        name: "ทั่วไป",
        subjectId: subject.id,
      },
    });

    // Empty promo block for this subject's homepage tile — admin fills in
    // image/text later via the Design Studio, no code required.
    await tx.pageBlock.create({
      data: {
        page: "home",
        order: 999, // admin reorders via drag-and-drop after
        type: "subject_promo",
        subjectId: subject.id,
        isPublished: false,
        contentJson: {
          headline: `คอร์ส${input.name}`,
          subtext: "",
          image: null,
        },
      },
    });

    return subject;
  });
}

/**
 * Revenue-by-subject report — automatically includes any subject that
 * exists, no hardcoded subject list to maintain.
 */
export async function getRevenueBySubject() {
  const subjects = await prisma.subject.findMany({
    include: {
      courses: {
        include: {
          payments: { where: { status: "APPROVED" } },
        },
      },
    },
  });

  return subjects.map((s) => ({
    subjectId: s.id,
    subjectName: s.name,
    totalRevenue: s.courses
      .flatMap((c) => c.payments)
      .reduce((sum, p) => sum + p.amount, 0),
    courseCount: s.courses.length,
  }));
}
