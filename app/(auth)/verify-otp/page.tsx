import AuthPage from "@/components/z1/AuthPage";

export default function Page({ searchParams }: { searchParams: { email?: string } }) {
  return <AuthPage mode="otp" email={searchParams.email} />;
}
