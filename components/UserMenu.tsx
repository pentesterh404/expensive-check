"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { BellIcon } from "@heroicons/react/24/outline";

type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
} | null;

type NotificationItem = {
  id: string;
  message?: string;
  text: string;
  createdAt: string;
  expense: {
    id: string;
    amount: number;
    description: string | null;
    status: string;
    expenseDate: string;
    currency: string;
    tags: string[];
    wallet: string | null;
    categoryName: string | null;
    rawText: string | null;
  } | null;
};

function initialsFromUser(user: SessionUser) {
  if (!user) return "?";
  const source = (user.displayName?.trim() || user.email).replace(/\s+/g, " ");
  const parts = source.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function formatCurrencyVnd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(value);
}

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestAt, setLatestAt] = useState<string | null>(null);
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [items, setItems] = useState<
    NotificationItem[]
  >([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [readItemIds, setReadItemIds] = useState<string[]>([]);

  const sinceStorageKey = useMemo(() => {
    if (!user) return "";
    return `notif_seen_at_${user.id}`;
  }, [user]);
  const readIdsStorageKey = useMemo(() => {
    if (!user) return "";
    return `notif_read_ids_${user.id}`;
  }, [user]);

  useEffect(() => {
    if (!user || !sinceStorageKey) return;
    const existing = localStorage.getItem(sinceStorageKey);
    const initialSeen = existing ?? new Date().toISOString();
    if (!existing) localStorage.setItem(sinceStorageKey, initialSeen);
    setSeenAt(initialSeen);
  }, [user, sinceStorageKey]);

  useEffect(() => {
    if (!user || !readIdsStorageKey) return;
    const raw = localStorage.getItem(readIdsStorageKey);
    if (!raw) {
      setReadItemIds([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setReadItemIds(parsed.filter((id): id is string => typeof id === "string"));
      } else {
        setReadItemIds([]);
      }
    } catch {
      setReadItemIds([]);
    }
  }, [user, readIdsStorageKey]);

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
        setLatestAt(typeof data.latestAt === "string" ? data.latestAt : null);
        const nextItems: NotificationItem[] = Array.isArray(data.items) ? data.items : [];
        setItems(nextItems);

        const readRaw = localStorage.getItem(readIdsStorageKey);
        let readIds: string[] = [];
        if (readRaw) {
          try {
            const parsed = JSON.parse(readRaw);
            if (Array.isArray(parsed)) {
              readIds = parsed.filter((id): id is string => typeof id === "string");
            }
          } catch {
            readIds = [];
          }
        }
        const sinceMs = new Date(since).getTime();
        const unread = nextItems.filter((item) => {
          const isAfterSeen = new Date(item.createdAt).getTime() > sinceMs;
          return isAfterSeen && !readIds.includes(item.id);
        }).length;
        setUnreadCount(unread);
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
  }, [user, sinceStorageKey, readIdsStorageKey]);

  if (!user) return null;

  function persistReadIds(ids: string[]) {
    setReadItemIds(ids);
    if (readIdsStorageKey) {
      localStorage.setItem(readIdsStorageKey, JSON.stringify(ids.slice(0, 200)));
    }
  }

  function markNotificationAsRead(itemId: string) {
    if (readItemIds.includes(itemId)) return;
    const next = [itemId, ...readItemIds];
    persistReadIds(next);
  }

  function markAllAsRead() {
    if (!sinceStorageKey) return;
    const nextSeen = latestAt ?? new Date().toISOString();
    localStorage.setItem(sinceStorageKey, nextSeen);
    setSeenAt(nextSeen);
    setUnreadCount(0);
    persistReadIds([...new Set([...items.map((item) => item.id), ...readItemIds])]);
  }

  function isNewItem(createdAt: string) {
    if (!seenAt) return false;
    return new Date(createdAt).getTime() > new Date(seenAt).getTime();
  }

  function isUnreadItem(item: { id: string; createdAt: string }) {
    return isNewItem(item.createdAt) && !readItemIds.includes(item.id);
  }

  const activeItem = items.find((item) => item.id === activeItemId) ?? null;

  return (
    <div className="user-menu" aria-label="User menu">
      <div className="notif-menu">
        <button
          type="button"
          className={`notif-btn${unreadCount > 0 ? " notif-btn-ringing" : ""}`}
          aria-haspopup="menu"
          title="Notifications"
        >
          <BellIcon aria-hidden="true" width={21} height={21} />
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
                <button
                  key={item.id}
                  type="button"
                  className="notif-item notif-item-btn"
                  onClick={() => {
                    const wasUnread = isUnreadItem(item);
                    if (wasUnread) {
                      markNotificationAsRead(item.id);
                      setUnreadCount((count) => Math.max(0, count - 1));
                    }
                    setActiveItemId(item.id);
                  }}
                  title="Open bill details"
                >
                  <div className="notif-title-row">
                    {isUnreadItem(item) ? <span className="notif-new-dot" title="New notification" /> : null}
                    <div className="notif-title">
                      {item.message || item.expense?.description || item.text || "Telegram message"}
                    </div>
                  </div>
                  <small className="muted">
                    {new Date(item.createdAt).toLocaleString("en-US")}
                  </small>
                </button>
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

      {activeItem && activeItem.expense ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveItemId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.35)",
            zIndex: 90,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
        >
          <section
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(760px, 100%)", maxHeight: "90vh", overflow: "auto" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <h3 style={{ margin: 0 }}>Expense Bill Details</h3>
              <span className="badge">{activeItem.expense.status}</span>
            </div>

            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table>
                <tbody>
                  <tr>
                    <th>Received From Telegram</th>
                    <td>{new Date(activeItem.createdAt).toLocaleString("en-US")}</td>
                  </tr>
                  <tr>
                    <th>Expense Date</th>
                    <td>{new Date(activeItem.expense.expenseDate).toLocaleString("en-US")}</td>
                  </tr>
                  <tr>
                    <th>Description</th>
                    <td>{activeItem.expense.description ?? "-"}</td>
                  </tr>
                  <tr>
                    <th>Category</th>
                    <td>{activeItem.expense.categoryName ?? "-"}</td>
                  </tr>
                  <tr>
                    <th>Amount</th>
                    <td>{formatCurrencyVnd(activeItem.expense.amount)}</td>
                  </tr>
                  <tr>
                    <th>Wallet</th>
                    <td>{activeItem.expense.wallet ?? "-"}</td>
                  </tr>
                  <tr>
                    <th>Tags</th>
                    <td>
                      {activeItem.expense.tags.length
                        ? activeItem.expense.tags.map((tag) => `#${tag}`).join(" ")
                        : "-"}
                    </td>
                  </tr>
                  <tr>
                    <th>Raw Telegram Text</th>
                    <td>{activeItem.expense.rawText ?? activeItem.text ?? "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="toolbar" style={{ marginTop: 12, justifyContent: "flex-end" }}>
              <button className="button secondary" type="button" onClick={() => setActiveItemId(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
