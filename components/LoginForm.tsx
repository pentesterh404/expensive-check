"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);

    const payload = {
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
      displayName: String(formData.get("displayName") || "") || undefined
    };

    const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data.error || "Request failed");
      setLoading(false);
      return;
    }

    setMessage("Success. Redirecting to dashboard...");
    router.push("/dashboard");
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="login-card">
      <div>
        <h1 style={{ margin: 0 }}>Expense Tracker</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          Sign in to manage expenses from your Telegram bot
        </p>
      </div>

      <div className="toolbar">
        <button
          type="button"
          className={`button ${mode === "login" ? "" : "secondary"}`}
          disabled={loading}
          onClick={() => setMode("login")}
        >
          Login
        </button>
        <button
          type="button"
          className={`button ${mode === "register" ? "" : "secondary"}`}
          disabled={loading}
          onClick={() => setMode("register")}
        >
          Register
        </button>
      </div>

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await onSubmit(new FormData(event.currentTarget));
        }}
      >
        {mode === "register" && <input name="displayName" placeholder="Display name" />}
        <input type="email" name="email" placeholder="Email" required />
        <input type="password" name="password" placeholder="Password" required />
        <button className="button" disabled={loading}>
          {loading ? (mode === "login" ? "Signing in..." : "Creating account...") : mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </form>

      {message && <div className="card" style={{ padding: 12 }}>{message}</div>}
    </div>
  );
}
