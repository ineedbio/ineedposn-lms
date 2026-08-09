import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePromptPayQR } from "@/lib/promptpay";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import CheckoutForm from "./CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { course?: string };
}) {
  const slug = searchParams.course;
  if (!slug) notFound();

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) redirect(`/login`);

  const course = await prisma.course.findUnique({ where: { slug } });
  if (!course || !course.isPublished) notFound();

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });
  if (enrollment?.status === "ACTIVE") redirect(`/learn/${course.id}`);

  if (enrollment?.status === "PENDING") {
    return (
      <div className="max-w-[500px] mx-auto px-6 py-20 text-center flex flex-col items-center gap-4">
        <h1 className="text-2xl font-extrabold tracking-[-0.02em]">รอตรวจสอบการชำระเงิน</h1>
        <p className="text-secondary text-[15px]">
          คุณส่งคำขอลงทะเบียนคอร์สนี้ไว้แล้ว ทีมงานกำลังตรวจสอบสลิป
        </p>
        <Link
          href="/dashboard"
          className="mt-2 h-[46px] px-8 rounded-pill bg-ink text-white text-sm font-semibold flex items-center justify-center hover:bg-dark-hover transition-all duration-150 active:scale-[0.97]"
        >
          ไปที่ห้องเรียนของฉัน
        </Link>
      </div>
    );
  }

  const promptpayId = process.env.PROMPTPAY_ID;
  const qrDataUrl = promptpayId ? await generatePromptPayQR(promptpayId, course.price) : null;

  return (
    <div className="max-w-[900px] mx-auto px-6 md:px-12 pt-14 pb-24">
      <h1 className="text-[32px] font-extrabold tracking-[-0.02em] mb-2">ชำระเงิน</h1>
      <p className="text-secondary text-[15px] mb-10">โอนเงินแล้วแนบสลิปเพื่อรอทีมงานอนุมัติ</p>

      <div className="grid md:grid-cols-[minmax(0,1fr)_320px] gap-10">
        <div className="flex flex-col gap-8">
          <div className="border border-border-light rounded-card p-7 flex flex-col items-center gap-4 text-center">
            <div className="text-[13px] font-semibold text-secondary">สแกนเพื่อชำระผ่าน PromptPay</div>
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="PromptPay QR" className="w-56 h-56" />
            ) : (
              <div className="w-56 h-56 rounded-xl bg-panel flex items-center justify-center text-muted text-xs text-center p-4">
                ยังไม่ได้ตั้งค่าบัญชี PromptPay รับเงิน — ติดต่อผู้ดูแลระบบ
              </div>
            )}
            <div className="text-2xl font-extrabold tracking-[-0.02em]">
              ฿{course.price.toLocaleString()}
            </div>
          </div>

          <CheckoutForm courseId={course.id} />
        </div>

        <div className="md:sticky md:top-24 h-fit border border-border-light rounded-card p-7 flex flex-col gap-4">
          <div className="text-[13px] font-semibold text-secondary">สรุปคำสั่งซื้อ</div>
          <div className="text-lg font-bold">{course.title}</div>
          <div className="border-t border-border-light pt-4 flex items-center justify-between text-base font-semibold">
            <span>ยอดชำระ</span>
            <span>฿{course.price.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
