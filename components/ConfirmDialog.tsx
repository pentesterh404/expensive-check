"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    isDestructive = false,
    onConfirm,
    onCancel,
    isLoading = false
}: ConfirmDialogProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    // Use portal to ensure it's on top of everything
    if (typeof document === "undefined") return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.4)", // Slate-900 with opacity
                backdropFilter: "blur(4px)",
                zIndex: 10000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20
            }}
            onClick={onCancel}
        >
            <div
                className="card"
                style={{
                    width: "min(400px, 100%)",
                    padding: 24,
                    margin: "0 auto",
                    background: "var(--panel-solid)",
                    boxShadow: "var(--shadow-xl)",
                    border: "1px solid var(--line)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: "1.125rem", color: "var(--ink)", fontWeight: 700 }}>
                        {title}
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.5 }}>
                        {message}
                    </p>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
                    <button
                        type="button"
                        className="button secondary"
                        disabled={isLoading}
                        onClick={onCancel}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className="button"
                        disabled={isLoading}
                        style={{
                            background: isDestructive ? "var(--error)" : "var(--primary)",
                            borderColor: isDestructive ? "var(--error)" : "var(--primary)",
                            color: "#fff"
                        }}
                        onClick={onConfirm}
                    >
                        {isLoading ? "Processing..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
