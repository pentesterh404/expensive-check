"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
} | null;

function initialsFromUser(user: SessionUser) {
  if (!user) return "?";
  const source = (user.displayName?.trim() || user.email).replace(/\s+/g, " ");
  const parts = source.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!user) return null;

  return (
    <div className="user-menu" aria-label="User menu">
      <button type="button" className="avatar-btn" aria-haspopup="menu">
        {initialsFromUser(user)}
      </button>
      <div className="user-dropdown" role="menu">
        <div className="user-dropdown-head">
          <strong>{user.displayName || "Account"}</strong>
          <small>{user.email}</small>
        </div>
        <Link href="/account" className="user-dropdown-item" role="menuitem">
          Account Profile
        </Link>
        <button
          type="button"
          className="user-dropdown-item danger"
          role="menuitem"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
              router.refresh();
            });
          }}
        >
          {isPending ? "Logging out..." : "Logout"}
        </button>
      </div>
    </div>
  );
}
