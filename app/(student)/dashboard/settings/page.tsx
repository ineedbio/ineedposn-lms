import { redirect } from "next/navigation";

// Password change lives on the profile page now (same as the Apps Script site).
export default function Page() {
  redirect("/settings");
}
