"use client";

import { useEffect, useState, ReactNode } from "react";

interface SettingsLayoutClientProps {
    children: ReactNode;
    navItems: { id: string; label: string; icon: ReactNode }[];
}

export function SettingsLayoutClient({ children, navItems }: SettingsLayoutClientProps) {
    const [activeSection, setActiveSection] = useState("");

    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: "-20% 0px -70% 0px",
            threshold: 0,
        };

        const observerCallback = (entries: IntersectionObserverEntry[]) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        navItems.forEach((item) => {
            const element = document.getElementById(item.id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, [navItems]);

    return (
        <div className="settings-grid">
            {/* Side Navigation */}
            <aside className="settings-nav">
                {navItems.map((item) => (
                    <a
                        key={item.id}
                        href={`#${item.id}`}
                        className={`settings-nav-item ${activeSection === item.id ? "active" : ""}`}
                        onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                            setActiveSection(item.id);
                        }}
                    >
                        {item.icon}
                        {item.label}
                    </a>
                ))}
            </aside>

            {/* Main Content Sections */}
            <main style={{ display: "grid", gap: "64px" }}>
                {children}
            </main>
        </div>
    );
}
