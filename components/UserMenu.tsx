"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

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
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestAt, setLatestAt] = useState<string | null>(null);
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [items, setItems] = useState<
    Array<{
      id: string;
      message?: string;
      text: string;
      createdAt: string;
      expense: { amount: number; description: string | null; status: string } | null;
    }>
  >([]);

  const sinceStorageKey = useMemo(() => {
    if (!user) return "";
    return `notif_seen_at_${user.id}`;
  }, [user]);

  useEffect(() => {
    if (!user || !sinceStorageKey) return;
    const existing = localStorage.getItem(sinceStorageKey);
    const initialSeen = existing ?? new Date().toISOString();
    if (!existing) localStorage.setItem(sinceStorageKey, initialSeen);
    setSeenAt(initialSeen);
  }, [user, sinceStorageKey]);

  useEffect(() => {
    if (!user || !sinceStorageKey) return;
    let mounted = true;

    const load = async () => {
      setIsNotifLoading(true);
      try {
        const since = localStorage.getItem(sinceStorageKey) ?? new Date(0).toISOString();
        const res = await fetch(`/api/notifications?since=${encodeURIComponent(since)}`, {
          cache: "no-store"
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !mounted) return;
        setUnreadCount(Number(data.unreadCount ?? 0));
        setLatestAt(typeof data.latestAt === "string" ? data.latestAt : null);
        setItems(Array.isArray(data.items) ? data.items : []);
      } finally {
        if (mounted) setIsNotifLoading(false);
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 12000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [user, sinceStorageKey]);

  if (!user) return null;

  function markAllAsRead() {
    if (!sinceStorageKey) return;
    const nextSeen = latestAt ?? new Date().toISOString();
    localStorage.setItem(sinceStorageKey, nextSeen);
    setSeenAt(nextSeen);
    setUnreadCount(0);
  }

  function isNewItem(createdAt: string) {
    if (!seenAt) return false;
    return new Date(createdAt).getTime() > new Date(seenAt).getTime();
  }

  return (
    <div className="user-menu" aria-label="User menu">
      <div className="notif-menu">
        <button type="button" className="notif-btn" aria-haspopup="menu" title="Notifications">
          🔔
          {unreadCount > 0 ? <span className="notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
        </button>
        <div className="notif-dropdown" role="menu">
          <div className="user-dropdown-head" style={{ borderBottomStyle: "dashed" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <strong>Notifications</strong>
              <button
                type="button"
                className="user-dropdown-item"
                style={{ width: "auto", padding: "4px 8px", fontSize: "0.8rem" }}
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            </div>
            <small>
              {isNotifLoading ? "Loading..." : unreadCount > 0 ? `${unreadCount} new from Telegram` : "No new updates"}
            </small>
          </div>
          <div className="notif-list">
            {items.length === 0 ? (
              <div className="notif-item muted">No Telegram data yet.</div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="notif-item">
                  <div className="notif-title-row">
                    {isNewItem(item.createdAt) ? <span className="notif-new-dot" title="New notification" /> : null}
                    <div className="notif-title">
                      {item.message || item.expense?.description || item.text || "Telegram message"}
                    </div>
                  </div>
                  <small className="muted">
                    {new Date(item.createdAt).toLocaleString("en-US")}
                  </small>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="profile-menu">
        <button type="button" className="avatar-btn" aria-haspopup="menu">
          {initialsFromUser(user)}
        </button>
        <div className="profile-dropdown" role="menu">
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
    </div>
  );
}
