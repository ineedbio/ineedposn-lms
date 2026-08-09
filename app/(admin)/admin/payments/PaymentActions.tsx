"use client";

import { useRouter } from "next/navigation";

export default function PaymentActions({ paymentId }: { paymentId: string }) {
  const router = useRouter();

  async function decide(decision: "APPROVE" | "REJECT") {
    const reason = decision === "REJECT" ? prompt("เหตุผลที่ปฏิเสธ:") ?? "" : undefined;
    await fetch(`/api/payments/${paymentId}/verify`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, reason }),
    });
    router.refresh();
  }

  return (
    <div className="flex gap-2.5 flex-shrink-0">
      <button
        onClick={() => decide("APPROVE")}
        className="px-5 py-2.5 rounded-pill bg-ink text-white text-sm font-semibold hover:bg-dark-hover hover:shadow-md transition-all duration-150 active:scale-[0.96]"
      >
        อนุมัติ
      </button>
      <button
        onClick={() => decide("REJECT")}
        className="px-5 py-2.5 rounded-pill bg-white border border-border text-ink text-sm font-semibold hover:bg-panel transition-all duration-150 active:scale-[0.96]"
      >
        ปฏิเสธ
      </button>
    </div>
  );
}
