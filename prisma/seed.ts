import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("ChangeMe123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@ineedposn.com" },
    update: {},
    create: {
      email: "admin@ineedposn.com",
      password: adminPassword,
      firstName: "Admin",
      lastName: "INeedPOSN",
      role: "ADMIN",
      emailVerified: true,
    },
  });

  const biology = await prisma.subject.upsert({
    where: { slug: "biology" },
    update: {},
    create: { name: "Biology", slug: "biology", colorTheme: "#1D7A4C" },
  });

  const camp1 = await prisma.category.upsert({
    where: { id: "seed-category-camp1" },
    update: {},
    create: { id: "seed-category-camp1", name: "Camp 1", subjectId: biology.id },
  });

  const course = await prisma.course.upsert({
    where: { slug: "biology-camp-1" },
    update: {},
    create: {
      title: "สอวน. Biology — Camp 1",
      slug: "biology-camp-1",
      description: "ปูพื้นเซลล์และพันธุศาสตร์ ครอบคลุมทุกหัวข้อสำคัญของค่าย 1",
      price: 1200,
      isPublished: true,
      subjectId: biology.id,
      categoryId: camp1.id,
    },
  });

  const lesson = await prisma.lesson.create({
    data: {
      title: "Cell Respiration (ETC)",
      order: 1,
      type: "VIDEO",
      youtubeUrl: "https://www.youtube.com/embed/REPLACE_WITH_UNLISTED_ID",
      duration: 2700,
      courseId: course.id,
    },
  });

  await prisma.quiz.create({
    data: {
      title: "Cell Cycle Quiz",
      timeLimit: 600,
      passScore: 70,
      lessonId: lesson.id,
      questions: {
        create: [
          {
            text: "Which phase of the cell cycle is characterized by DNA replication?",
            type: "MCQ",
            choices: [
              { id: "a", text: "G1 phase" },
              { id: "b", text: "S phase" },
              { id: "c", text: "G2 phase" },
              { id: "d", text: "M phase" },
            ],
            correctAnswer: "b",
          },
        ],
      },
    },
  });

  console.log("Seeded. Admin login: admin@ineedposn.com / ChangeMe123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
