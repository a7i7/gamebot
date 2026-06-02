"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, LogOut } from "lucide-react";

import { clearToken, getEmailFromToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Gamepad2, ListChecks } from "lucide-react";

const navItems = [
  { href: "/", icon: Gamepad2, label: "Games" },
  { href: "/submissions", icon: ListChecks, label: "Submissions" },
];

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setEmail(getEmailFromToken());
  }, []);

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 h-14 flex items-center border-b border-border bg-background px-4 gap-4">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-foreground hover:bg-accent transition-colors">
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0 pt-14">
          <nav className="space-y-1 px-3 py-4">
            {navItems.map(({ href, icon: Icon, label }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
        <span className="text-lg">🎮</span>
        <span>Gamebot Arena</span>
      </Link>

      <div className="ml-auto flex items-center gap-3">
        {email && (
          <span className="text-sm text-muted-foreground hidden sm:block">
            {email}
          </span>
        )}
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
