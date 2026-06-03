"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Home } from "lucide-react";

import { clearToken, getEmailFromToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setEmail(getEmailFromToken());
  }, []);

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 h-14 flex items-center border-b border-border bg-background px-4 gap-3">
      <Link href="/" aria-label="Home" className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
        <Home className="size-5" />
      </Link>

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
