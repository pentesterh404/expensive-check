"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { useSidebar } from "./SidebarProvider";
import {
  HomeIcon,
  BanknotesIcon,
  TagIcon,
  Cog6ToothIcon,
  UsersIcon,
  ArrowsRightLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon
} from "@heroicons/react/24/outline";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/expenses", label: "Expenses", icon: BanknotesIcon },
  { href: "/categories", label: "Categories", icon: TagIcon },
  { href: "/settings", label: "Settings", icon: Cog6ToothIcon },
  { href: "/user-manager", label: "User Manager", icon: UsersIcon }
] as const;

const compareLink = { href: "/compare", label: "Compare Months", icon: ArrowsRightLeftIcon } as const;

function initialsFromUser(user: any) {
  if (!user) return "?";
  const source = (user.displayName?.trim() || user.email).replace(/\s+/g, " ");
  const parts = source.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function AppNav({ isAdmin, user }: { isAdmin: boolean; user: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { isCollapsed, toggleSidebar, isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useSidebar();
  const visibleLinks = isAdmin ? links : links.filter((l) => l.href !== "/user-manager");

  const handleLogout = () => {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
      closeMobileMenu();
    });
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`sidebar desktop-only ${isCollapsed ? "collapsed" : ""}`}>
        <div className="brand" title={isCollapsed ? "ExpensePro" : ""}>
          <div style={{ width: 32, height: 32, background: 'var(--primary)', borderRadius: 8, display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0 }}>
            <BanknotesIcon width={20} height={20} />
          </div>
          {!isCollapsed && (
            <div className="brand-text">
              ExpensePro
              <small>Smart Tracker</small>
            </div>
          )}
        </div>

        <nav className="nav" aria-label="Main">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={pathname === link.href ? "active" : undefined}
                title={isCollapsed ? link.label : ""}
              >
                <Icon width={20} height={20} />
                {!isCollapsed && <span>{link.label}</span>}
              </Link>
            );
          })}
          <Link
            href={compareLink.href}
            className={pathname === compareLink.href ? "active" : undefined}
            title={isCollapsed ? compareLink.label : ""}
          >
            <compareLink.icon width={20} height={20} />
            {!isCollapsed && <span>{compareLink.label}</span>}
          </Link>
        </nav>

        <button
          onClick={toggleSidebar}
          className="sidebar-toggle"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRightIcon width={16} height={16} />
          ) : (
            <ChevronLeftIcon width={16} height={16} />
          )}
        </button>
      </aside>

      {/* Mobile Header & Menu */}
      <aside className="sidebar mobile-only">
        <div className="brand">
          <div style={{ width: 32, height: 32, background: 'var(--primary)', borderRadius: 8, display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0 }}>
            <BanknotesIcon width={20} height={20} />
          </div>
          <div className="brand-text">
            ExpensePro
            <small>Smart Tracker</small>
          </div>
        </div>

        <button
          className="mobile-menu-btn"
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? (
            <XMarkIcon width={24} height={24} />
          ) : (
            <Bars3Icon width={24} height={24} />
          )}
        </button>

        <div className={`mobile-menu-overlay ${isMobileMenuOpen ? "open" : ""}`}>
          <nav className="mobile-nav">
            {visibleLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`mobile-nav-link ${pathname === link.href ? "active" : ""}`}
                  onClick={closeMobileMenu}
                >
                  <Icon width={22} height={22} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <Link
              href={compareLink.href}
              className={`mobile-nav-link ${pathname === compareLink.href ? "active" : ""}`}
              onClick={closeMobileMenu}
            >
              <compareLink.icon width={22} height={22} />
              <span>{compareLink.label}</span>
            </Link>
          </nav>

          <div className="mobile-user-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
              <div className="mobile-avatar">
                {initialsFromUser(user)}
              </div>
              <div className="mobile-user-info">
                <span>{user?.displayName || "Account"}</span>
                <small>{user?.email}</small>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isPending}
              style={{
                all: 'unset',
                cursor: isPending ? 'wait' : 'pointer',
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--error-light)',
                color: 'var(--error)',
                fontWeight: 600,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: isPending ? 0.7 : 1
              }}
            >
              <ArrowRightOnRectangleIcon width={18} height={18} />
              {isPending ? "..." : "Logout"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
