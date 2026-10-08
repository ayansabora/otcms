import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Scale, Eye, EyeOff, ArrowRight, Lock, Mail } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import { Button } from "../components/Button";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      setError(err instanceof ApiError ? err.message : "Unable to sign in. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Cultural Hero Panel ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative flex-col bg-[var(--color-primary-dark)] overflow-hidden">
        {/* Gadaa geometric pattern — full coverage, low opacity */}
        <div className="absolute inset-0 gadaa-pattern opacity-20" />

        {/* Gold accent strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-gold)] via-[var(--color-gold-dark)] to-transparent" />

        {/* Bottom gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-[var(--color-primary-dark)] via-[var(--color-primary-dark)]/60 to-transparent" />

        {/* Centered decorative diamond */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <div className="w-[600px] h-[600px] border-2 border-[var(--color-gold)] rotate-45 rounded-3xl" />
          <div className="absolute w-[400px] h-[400px] border border-[var(--color-gold)] rotate-45 rounded-2xl" />
          <div className="absolute w-[200px] h-[200px] border border-[var(--color-gold)] rotate-45 rounded-xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full px-12 py-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 shrink-0">
              <div className="absolute inset-0 bg-[var(--color-gold)] rotate-45 rounded-md" />
              <div className="absolute inset-2 bg-[var(--color-primary-dark)] rotate-45 rounded-sm" />
              <Scale size={16} className="absolute inset-0 m-auto text-[var(--color-gold)] z-10" />
            </div>
            <span className="font-display text-xl font-bold text-white tracking-wide">OTCMS</span>
          </div>

          {/* Center text block */}
          <div>
            <div className="w-12 h-0.5 bg-[var(--color-gold)] mb-6" />
            <h1 className="font-display text-4xl xl:text-5xl text-white leading-tight mb-4 max-w-md">
              Oromo Traditional Court
              <br />
              <span className="text-[var(--color-gold)]">Management System</span>
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-sm">
              A modern platform supporting Gadaa-based traditional justice — 
              case records, elder-panel review, and hearing management, kept 
              secure and organized.
            </p>

            {/* Three pillars */}
            <div className="flex gap-6 mt-8">
              {["Justice", "Community", "Reconciliation"].map((word) => (
                <div key={word} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[var(--color-gold)] rotate-45 shrink-0" />
                  <span className="text-white/70 text-sm font-medium tracking-wide">{word}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-white/30 text-xs tracking-wide">
            Bale Robe City — Oromia, Ethiopia
          </p>
        </div>
      </div>

      {/* ── Right: Login Form ─────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center bg-[var(--color-bg)] px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="relative w-9 h-9 shrink-0">
              <div className="absolute inset-0 bg-[var(--color-primary)] rotate-45 rounded-sm" />
              <div className="absolute inset-2 bg-[var(--color-primary-dark)] rotate-45 rounded-sm" />
              <Scale size={13} className="absolute inset-0 m-auto text-white z-10" />
            </div>
            <span className="font-display text-lg font-bold text-[var(--color-ink)]">OTCMS</span>
          </div>

          <h2 className="font-display text-3xl text-[var(--color-ink)] mb-1">Welcome back</h2>
          <p className="text-sm text-[var(--color-muted)] mb-8">Sign in to access the court management system.</p>

          {/* Error alert */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] px-4 py-3.5">
              <div className="w-1.5 h-1.5 bg-[var(--color-danger)] rounded-full shrink-0 mt-1.5" />
              <p className="text-sm text-[var(--color-danger)]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-faint)]" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-[var(--color-line)] bg-white pl-10 pr-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-faint)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-[var(--color-ink)]">
                  Password
                </label>
                <a href="#" className="text-xs text-[var(--color-primary)] hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-faint)]" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[var(--color-line)] bg-white pl-10 pr-11 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-faint)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-faint)] hover:text-[var(--color-muted)] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" className="w-4 h-4 rounded border-[var(--color-line)] accent-[var(--color-primary)]" />
              <span className="text-sm text-[var(--color-muted)]">Remember me</span>
            </label>

            {/* Submit */}
            <Button
              type="submit"
              loading={submitting}
              className="w-full py-3 text-base"
              rightIcon={!submitting ? <ArrowRight size={17} /> : undefined}
            >
              {submitting ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          {/* Security note */}
          <p className="mt-8 text-center text-xs text-[var(--color-faint)] flex items-center justify-center gap-1.5">
            <Lock size={11} />
            Your data is secure and encrypted.
          </p>
        </div>
      </div>
    </div>
  );
}
