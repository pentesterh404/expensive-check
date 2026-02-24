"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
  { href: "/categories", label: "Categories" },
  { href: "/settings", label: "Settings" },
  { href: "/user-manager", label: "User Manager" }
];

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const visibleLinks = isAdmin ? links : links.filter((l) => l.href !== "/user-manager");

  return (
    <aside className="sidebar">
      <div className="brand">
        Expense Tracker
        <small>Telegram Expense Tracker</small>
      </div>
      <nav className="nav" aria-label="Main">
        {visibleLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname === link.href ? "active" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
