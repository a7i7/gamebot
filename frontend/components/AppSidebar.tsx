"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gamepad2, Trophy, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Gamepad2, label: "Games" },
  { href: "/submissions", icon: Trophy, label: "Submissions" },
  { href: "/test-runs", icon: FlaskConical, label: "Test Runs" },
];

interface AppSidebarProps {
  collapsed: boolean;
}

export function AppSidebar({ collapsed }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col shrink-0 border-r border-border bg-sidebar min-h-screen pt-4 pb-8 transition-[width] duration-200",
        collapsed ? "w-16 px-2" : "w-56 px-3"
      )}
    >
      <nav className="space-y-1 mt-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <div key={href} className="relative group/item">
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  collapsed && "justify-center px-2",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && label}
              </Link>

              {collapsed && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150">
                  <div className="bg-popover text-popover-foreground text-xs font-medium px-2 py-1 rounded-md shadow-md whitespace-nowrap border border-border">
                    {label}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
