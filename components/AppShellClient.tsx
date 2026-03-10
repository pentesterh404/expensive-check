"use client";

import { ReactNode } from "react";
import { useSidebar } from "./SidebarProvider";
import { AppNav } from "@/components/AppNav";
import { UserMenu } from "@/components/UserMenu";
import { PlusIcon } from "@heroicons/react/24/outline";

export function AppShellClient({
    children,
    showTopbar = true,
    title = "ExpensePro",
    subtitle = "Management Console",
    user,
    isAdmin
}: {
    children: ReactNode;
    showTopbar?: boolean;
    title?: string;
    subtitle?: string;
    user: any;
    isAdmin: boolean;
}) {
    const { isCollapsed } = useSidebar();

    return (
        <div className={`app-shell ${isCollapsed ? "collapsed" : ""}`}>
            <AppNav isAdmin={isAdmin} user={user} />
            <main className="main">
                {showTopbar ? (
                    <header className="topbar">
                        <div>
                            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--ink)", margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
                            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted)" }}>{subtitle}</p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <UserMenu user={user} />
                        </div>
                    </header>
                ) : null}
                {children}
            </main>
        </div>
    );
}
