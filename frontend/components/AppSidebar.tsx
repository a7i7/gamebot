"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gamepad2, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Gamepad2, label: "Games" },
  { href: "/submissions", icon: ListChecks, label: "Submissions" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-sidebar min-h-screen pt-4 pb-8 px-3">
      <nav className="space-y-1 mt-2">
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
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
