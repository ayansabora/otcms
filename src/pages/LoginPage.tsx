import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import { Button } from "../components/Button";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-[var(--color-forest)] text-white px-16 py-16">
        <p className="font-display text-xl">OTCMS</p>
        <div className="max-w-md">
          <h1 className="font-display text-4xl leading-tight mb-4">
            Oromoo Traditional Court Management System
          </h1>
          <p className="text-white/70 text-[15px] leading-relaxed">
            Supporting Gadaa-based traditional justice for Bale Robe City —
            case records, elder-panel review, and hearing schedules, kept
            secure and organized.
          </p>
        </div>
        <p className="text-xs text-white/40">Bale Robe City Court Administration</p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <h2 className="font-display text-2xl mb-1">Sign in</h2>
          <p className="text-sm text-[var(--color-muted)] mb-8">Enter your court account credentials.</p>

          {error && (
            <div className="mb-4 rounded-sm border border-[var(--color-status-danger)]/30 bg-[var(--color-status-danger)]/5 px-3 py-2 text-sm text-[var(--color-status-danger)]">
              {error}
            </div>
          )}

          <label className="block text-sm font-medium mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm mb-4 outline-none focus:border-[var(--color-forest)]"
          />

          <label className="block text-sm font-medium mb-1" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm mb-6 outline-none focus:border-[var(--color-forest)]"
          />

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
