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
    <div className="flex gap-2">
      <button
        onClick={() => decide("APPROVE")}
        className="bg-black text-white rounded-full px-4 py-2 text-xs font-medium"
      >
        อนุมัติ
      </button>
      <button
        onClick={() => decide("REJECT")}
        className="border border-black/20 rounded-full px-4 py-2 text-xs font-medium"
      >
        ปฏิเสธ
      </button>
    </div>
  );
}
