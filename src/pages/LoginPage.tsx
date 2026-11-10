import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Scale, Eye, EyeOff, ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";

/* ── SVG mountain landscape background ────────────────────────────────── */
/* Layered Ethiopian highlands at dusk with deep blue tones and a warm gold
   glow — evokes the Bale Mountains region without requiring an external
   image file. Uses preserveAspectRatio="xMidYMid slice" for full coverage. */
function MountainBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1200 800"
      aria-hidden="true"
    >
      <defs>
        {/* Sky gradient — deep blue to lighter atmospheric blue */}
        <linearGradient id="login-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0a1f3d" />
          <stop offset="35%"  stopColor="#0f2d56" />
          <stop offset="65%"  stopColor="#1a3d6b" />
          <stop offset="100%" stopColor="#264b7a" />
        </linearGradient>
        {/* Mountain layer gradients — from far (lightest) to near (darkest) */}
        <linearGradient id="login-mtn-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#2d5a8f" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#0f2d56" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="login-mtn-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#1e4f8f" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0a1f3d" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="login-mtn-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#0f2d56" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#050f1f" stopOpacity="0.95" />
        </linearGradient>
        {/* Warm gold glow for the sun/moon */}
        <radialGradient id="login-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"  stopColor="#C9A227" stopOpacity="0.25" />
          <stop offset="50%" stopColor="#C9A227" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#C9A227" stopOpacity="0" />
        </radialGradient>
        {/* Dark overlay at bottom for text readability */}
        <linearGradient id="login-overlay" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#050f1f" stopOpacity="0" />
          <stop offset="50%"  stopColor="#050f1f" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#050f1f" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="1200" height="800" fill="url(#login-sky)" />

      {/* Gold glow (sun/moon) */}
      <circle cx="920" cy="180" r="200" fill="url(#login-glow)" />
      <circle cx="920" cy="180" r="50" fill="#C9A227" opacity="0.12" />

      {/* Distant mountain range */}
      <path
        d="M0,440 L120,390 L240,420 L360,360 L480,400 L600,370 L720,390 L840,350 L960,380 L1080,340 L1200,360 L1200,800 L0,800 Z"
        fill="url(#login-mtn-far)"
      />

      {/* Mid mountain range */}
      <path
        d="M0,520 L80,480 L160,500 L260,450 L380,470 L500,430 L620,460 L740,420 L860,450 L980,410 L1100,440 L1200,420 L1200,800 L0,800 Z"
        fill="url(#login-mtn-mid)"
      />

      {/* Near mountain range */}
      <path
        d="M0,600 L70,570 L150,585 L240,540 L340,560 L440,520 L540,545 L660,510 L780,535 L900,500 L1020,520 L1140,495 L1200,510 L1200,800 L0,800 Z"
        fill="url(#login-mtn-near)"
      />

      {/* Foreground hills */}
      <path
        d="M0,680 L60,665 L140,670 L220,650 L320,660 L420,645 L520,655 L620,640 L720,650 L820,635 L920,645 L1020,630 L1120,640 L1200,635 L1200,800 L0,800 Z"
        fill="#050f1f"
        opacity="0.9"
      />

      {/* Bottom dark overlay for text readability */}
      <rect width="1200" height="800" fill="url(#login-overlay)" />
    </svg>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
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
      {/* ══ LEFT: Institutional Branding Panel ════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col overflow-hidden bg-[#0a1f3d]">
        {/* SVG mountain landscape background */}
        <div className="absolute inset-0 login-bg-enter">
          <MountainBackground />
        </div>

        {/* Gadaa geometric pattern overlay */}
        <div className="absolute inset-0 gadaa-pattern opacity-[0.12]" />

        {/* Gold top accent strip */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent opacity-60" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full px-12 xl:px-16 py-10">
          {/* ── Logo ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 login-brand-enter">
            <div className="relative w-11 h-11 shrink-0">
              <div className="absolute inset-0 bg-[var(--color-gold)] rotate-45 rounded-md" />
              <div className="absolute inset-1.5 bg-[#0a1f3d] rotate-45 rounded-sm" />
              <Scale size={18} className="absolute inset-0 m-auto text-[var(--color-gold)] z-10" />
            </div>
            <div>
              <span className="font-display text-xl font-bold text-white tracking-wide block leading-none">OTCMS</span>
              <span className="text-[10px] text-white/40 tracking-[0.2em] uppercase mt-0.5 block">Bale Robe City</span>
            </div>
          </div>

          {/* ── Center branding block ──────────────────────────────────── */}
          <div className="login-brand-enter" style={{ animationDelay: "0.15s" }}>
            {/* Gold divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-0.5 bg-[var(--color-gold)]" />
              <div className="w-1.5 h-1.5 bg-[var(--color-gold)] rotate-45" />
            </div>

            <h1 className="font-display text-3xl xl:text-[2.75rem] text-white leading-[1.15] mb-5 max-w-lg">
              Preserving Tradition.
              <br />
              Promoting Justice.
              <br />
              <span className="text-[var(--color-gold)]">Strengthening Community.</span>
            </h1>

            <p className="text-white/55 text-[15px] leading-relaxed max-w-md mb-8">
              A digital platform designed to modernize Oromo traditional court administration
              through efficient case management, transparent processes, and accessible
              justice services for the community.
            </p>

            {/* Three pillars */}
            <div className="flex gap-8">
              {[
                { label: "Justice",        icon: <Scale size={14} /> },
                { label: "Community",       icon: <ShieldCheck size={14} /> },
                { label: "Reconciliation", icon: <Scale size={14} /> },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full border border-[var(--color-gold)]/30 flex items-center justify-center text-[var(--color-gold)]/70">
                    {item.icon}
                  </div>
                  <span className="text-white/65 text-sm font-medium tracking-wide">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Footer ────────────────────────────────────────────────── */}
          <div className="login-brand-enter" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center gap-2 text-white/30 text-xs tracking-wide mb-1">
              <div className="w-4 h-px bg-white/20" />
              <span>Bale Robe City — Oromia, Ethiopia</span>
            </div>
            <p className="text-white/20 text-[11px] tracking-wide">
              Oromo Traditional Court Management System · Proclamation 240/2021
            </p>
          </div>
        </div>
      </div>

      {/* ══ RIGHT: Login Authentication Card ════════════════════════════ */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center bg-[var(--color-bg)] px-6 py-12 relative overflow-hidden">
        {/* Subtle decorative pattern on the right side */}
        <div className="absolute inset-0 gadaa-pattern opacity-[0.03] pointer-events-none" />

        <div className="w-full max-w-sm relative z-10">
          {/* ── Mobile logo (visible on small screens) ────────────────── */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="relative w-10 h-10 shrink-0">
              <div className="absolute inset-0 bg-[var(--color-primary)] rotate-45 rounded-md" />
              <div className="absolute inset-1.5 bg-[var(--color-primary-dark)] rotate-45 rounded-sm" />
              <Scale size={16} className="absolute inset-0 m-auto text-white z-10" />
            </div>
            <div>
              <span className="font-display text-lg font-bold text-[var(--color-ink)] block leading-none">OTCMS</span>
              <span className="text-[9px] text-[var(--color-muted)] tracking-[0.15em] uppercase">Bale Robe City</span>
            </div>
          </div>

          {/* ── Login card ────────────────────────────────────────────── */}
          <div className="login-card-enter">
            {/* Heading */}
            <h2 className="font-display text-[1.75rem] text-[var(--color-ink)] mb-1.5">Welcome back</h2>
            <p className="text-sm text-[var(--color-muted)] mb-8">
              Sign in to access the Oromo Traditional Court Management System.
            </p>

            {/* Error alert */}
            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] px-4 py-3.5 animate-fade-in">
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
                <div className="relative group">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-faint)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-[var(--color-line)] bg-white pl-10 pr-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-faint)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-[var(--color-ink)]">
                    Password
                  </label>
                  <a href="#" className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-light)] hover:underline transition-colors">
                    Forgot password?
                  </a>
                </div>
                <div className="relative group">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-faint)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-[var(--color-line)] bg-white pl-10 pr-11 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-faint)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all"
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
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--color-line)] accent-[var(--color-primary)] cursor-pointer"
                />
                <span className="text-sm text-[var(--color-muted)]">Remember me</span>
              </label>

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] py-3 text-base font-medium text-white shadow-lg shadow-[var(--color-primary)]/20 hover:bg-[var(--color-primary-light)] hover:shadow-xl hover:shadow-[var(--color-primary)]/30 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            {/* Security note */}
            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[var(--color-faint)]">
              <Lock size={11} />
              <span>Secure Access</span>
              <span className="text-[var(--color-line-strong)]">|</span>
              <span>Authorized Users Only</span>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-10 text-center text-[11px] text-[var(--color-faint)]">
            © {new Date().getFullYear()} Oromo Traditional Court · Bale Robe City, Ethiopia
          </p>
        </div>
      </div>
    </div>
  );
}
