import { redirect } from "next/navigation";

// Payment happens in the course page's buy box now (same as the Apps Script site).
export default function CheckoutPage({ searchParams }: { searchParams: { course?: string } }) {
  redirect(searchParams.course ? `/courses/${encodeURIComponent(searchParams.course)}#sec-buy` : "/");
}
