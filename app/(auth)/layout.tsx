import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-border">
        <div className="mx-auto flex h-[58px] max-w-site items-center justify-between px-4">
          <Logo />
          <ThemeToggle />
        </div>
      </header>
      {children}
    </div>
  );
}
