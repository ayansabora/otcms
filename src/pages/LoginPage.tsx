import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Lock, Mail } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";

/* ═══════════════════════════════════════════════════════════════════════════
   OTCMS Cultural Emblem — Shield-shaped badge with Abbaa Gadaa figure,
   Gadaa cycle circles, and scales of justice. Deep burgundy + gold.
   ═══════════════════════════════════════════════════════════════════════════ */
function OtcmsEmblem({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 200 240" fill="none" aria-label="OTCMS Emblem">
      <defs>
        <linearGradient id="em-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A1518" />
          <stop offset="100%" stopColor="#2A0E10" />
        </linearGradient>
        <linearGradient id="em-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8C84A" />
          <stop offset="100%" stopColor="#C9A227" />
        </linearGradient>
        <radialGradient id="em-glow" cx="0.5" cy="0.35" r="0.5">
          <stop offset="0%" stopColor="#E8C84A" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#C9A227" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Shield */}
      <path d="M100 4 L196 28 L196 120 Q196 180 100 236 Q4 180 4 120 L4 28 Z"
            fill="url(#em-shield)" stroke="url(#em-gold)" strokeWidth="2.5" />
      <path d="M100 14 L186 34 L186 118 Q186 172 100 222 Q14 172 14 118 L14 34 Z"
            fill="none" stroke="#C9A227" strokeWidth="0.5" opacity="0.4" />
      {/* Figure glow */}
      <ellipse cx="100" cy="80" rx="60" ry="50" fill="url(#em-glow)" />
      {/* Abbaa Gadaa figure — dignified silhouette */}
      {/* Head */}
      <ellipse cx="100" cy="52" rx="14" ry="16" fill="url(#em-gold)" opacity="0.9" />
      {/* Traditional headwear */}
      <path d="M86 48 Q86 34 100 32 Q114 34 114 48 Q114 42 110 40 L90 40 Q86 42 86 48 Z"
            fill="url(#em-gold)" />
      <circle cx="100" cy="33" r="3" fill="#E8C84A" />
      {/* Neck */}
      <rect x="96" y="66" width="8" height="10" fill="url(#em-gold)" opacity="0.7" />
      {/* Shoulders with traditional shawl */}
      <path d="M70 82 Q70 76 76 74 L88 72 Q94 78 100 78 Q106 78 112 72 L124 74 Q130 76 130 82
               L132 100 Q132 104 128 104 L72 104 Q68 104 68 100 Z"
            fill="url(#em-gold)" opacity="0.85" />
      {/* Shawl drape lines */}
      <path d="M82 82 L82 100 M92 82 L92 100 M108 82 L108 100 M118 82 L118 100"
            stroke="#4A1518" strokeWidth="0.6" opacity="0.3" />
      {/* Staff of authority */}
      <line x1="134" y1="60" x2="134" y2="100" stroke="#E8C84A" strokeWidth="1.5" opacity="0.6" />
      <circle cx="134" cy="58" r="2.5" fill="#E8C84A" opacity="0.7" />
      {/* Gadaa concentric circles (8-year cycle) */}
      <g transform="translate(100, 132)">
        <circle r="22" fill="none" stroke="url(#em-gold)" strokeWidth="1" opacity="0.6" />
        <circle r="16" fill="none" stroke="url(#em-gold)" strokeWidth="0.8" opacity="0.5" />
        <circle r="10" fill="none" stroke="url(#em-gold)" strokeWidth="0.6" opacity="0.4" />
        <circle r="4" fill="none" stroke="url(#em-gold)" strokeWidth="0.5" opacity="0.3" />
        <g stroke="url(#em-gold)" strokeWidth="0.5" opacity="0.35">
          <line x1="0" y1="-22" x2="0" y2="-26" /><line x1="15.5" y1="-15.5" x2="18.4" y2="-18.4" />
          <line x1="22" y1="0" x2="26" y2="0" /><line x1="15.5" y1="15.5" x2="18.4" y2="18.4" />
          <line x1="0" y1="22" x2="0" y2="26" /><line x1="-15.5" y1="15.5" x2="-18.4" y2="18.4" />
          <line x1="-22" y1="0" x2="-26" y2="0" /><line x1="-15.5" y1="-15.5" x2="-18.4" y2="-18.4" />
        </g>
      </g>
      {/* Scales of justice */}
      <g transform="translate(100, 180)">
        <line x1="0" y1="-12" x2="0" y2="20" stroke="url(#em-gold)" strokeWidth="1.5" opacity="0.7" />
        <circle cx="0" cy="-12" r="2.5" fill="url(#em-gold)" opacity="0.8" />
        <line x1="-18" y1="-6" x2="18" y2="-6" stroke="url(#em-gold)" strokeWidth="1.2" opacity="0.6" />
        <line x1="-18" y1="-6" x2="-22" y2="6" stroke="url(#em-gold)" strokeWidth="0.6" opacity="0.5" />
        <line x1="-18" y1="-6" x2="-14" y2="6" stroke="url(#em-gold)" strokeWidth="0.6" opacity="0.5" />
        <line x1="18" y1="-6" x2="22" y2="6" stroke="url(#em-gold)" strokeWidth="0.6" opacity="0.5" />
        <line x1="18" y1="-6" x2="14" y2="6" stroke="url(#em-gold)" strokeWidth="0.6" opacity="0.5" />
        <path d="M-24 4 Q-18 10 -12 4" fill="none" stroke="url(#em-gold)" strokeWidth="1" opacity="0.5" />
        <path d="M12 4 Q18 10 24 4" fill="none" stroke="url(#em-gold)" strokeWidth="1" opacity="0.5" />
        <line x1="-8" y1="20" x2="8" y2="20" stroke="url(#em-gold)" strokeWidth="1.5" opacity="0.7" />
      </g>
      <text x="100" y="214" textAnchor="middle" fontFamily="serif" fontSize="11" fontWeight="bold"
            fill="url(#em-gold)" letterSpacing="2">OTCMS</text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Cultural Background — Deep burgundy gradient with large Abbaa Gadaa
   silhouette, Gadaa patterns, and gold accent borders.
   ═══════════════════════════════════════════════════════════════════════════ */
function CulturalBackground() {
  return (
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1200 800" aria-hidden="true">
      <defs>
        {/* Deep burgundy gradient background */}
        <linearGradient id="cult-bg" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%"   stopColor="#1A0D0E" />
          <stop offset="40%"  stopColor="#2A1012" />
          <stop offset="70%"  stopColor="#3A1618" />
          <stop offset="100%" stopColor="#4A1518" />
        </linearGradient>
        <radialGradient id="cult-glow" cx="0.7" cy="0.3" r="0.6">
          <stop offset="0%"   stopColor="#C9A227" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#C9A227" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cult-figure" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#E8C84A" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#C9A227" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="cult-overlay" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1A0D0E" stopOpacity="0.3" />
          <stop offset="50%"  stopColor="#1A0D0E" stopOpacity="0" />
          <stop offset="100%" stopColor="#1A0D0E" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Background fill */}
      <rect width="1200" height="800" fill="url(#cult-bg)" />
      {/* Warm gold glow */}
      <rect width="1200" height="800" fill="url(#cult-glow)" />

      {/* Large stylized Abbaa Gadaa silhouette (background figure) */}
      <g transform="translate(820, 150) scale(3.5)" opacity="0.5">
        {/* Head */}
        <ellipse cx="50" cy="30" rx="22" ry="26" fill="url(#cult-figure)" />
        {/* Headwear */}
        <path d="M28 24 Q28 2 50 0 Q72 2 72 24 Q72 16 66 14 L34 14 Q28 16 28 24 Z"
              fill="url(#cult-figure)" />
        <circle cx="50" cy="-2" r="5" fill="#E8C84A" opacity="0.08" />
        {/* Neck */}
        <rect x="44" y="54" width="12" height="18" fill="url(#cult-figure)" />
        {/* Shoulders with shawl */}
        <path d="M20 90 Q20 80 30 76 L44 70 Q47 80 50 80 Q53 80 56 70 L70 76 Q80 80 80 90
                 L84 130 Q84 136 78 136 L22 136 Q16 136 16 130 Z"
              fill="url(#cult-figure)" />
        {/* Shawl lines */}
        <g stroke="#E8C84A" strokeWidth="0.8" opacity="0.06">
          <line x1="34" y1="90" x2="34" y2="130" />
          <line x1="42" y1="90" x2="42" y2="130" />
          <line x1="58" y1="90" x2="58" y2="130" />
          <line x1="66" y1="90" x2="66" y2="130" />
        </g>
        {/* Staff */}
        <line x1="86" y1="50" x2="86" y2="130" stroke="#E8C84A" strokeWidth="2" opacity="0.06" />
        <circle cx="86" cy="48" r="4" fill="#E8C84A" opacity="0.06" />
      </g>

      {/* Gadaa concentric circles (large, top-left) */}
      <g transform="translate(180, 180)" opacity="0.08">
        <circle r="80" fill="none" stroke="#C9A227" strokeWidth="1.5" />
        <circle r="60" fill="none" stroke="#C9A227" strokeWidth="1" />
        <circle r="40" fill="none" stroke="#C9A227" strokeWidth="0.8" />
        <circle r="20" fill="none" stroke="#C9A227" strokeWidth="0.6" />
        <g stroke="#C9A227" strokeWidth="0.5">
          <line x1="0" y1="-80" x2="0" y2="-94" />
          <line x1="57" y1="-57" x2="67" y2="-67" />
          <line x1="80" y1="0" x2="94" y2="0" />
          <line x1="57" y1="57" x2="67" y2="67" />
          <line x1="0" y1="80" x2="0" y2="94" />
          <line x1="-57" y1="57" x2="-67" y2="67" />
          <line x1="-80" y1="0" x2="-94" y2="0" />
          <line x1="-57" y1="-57" x2="-67" y2="-67" />
        </g>
      </g>

      {/* Bottom dark overlay */}
      <rect width="1200" height="800" fill="url(#cult-overlay)" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LoginPage
   ═══════════════════════════════════════════════════════════════════════════ */
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
      {/* ══ LEFT: Cultural Branding Panel ════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col overflow-hidden bg-[#1A0D0E]">
        {/* SVG cultural background */}
        <div className="absolute inset-0 login-bg-enter">
          <CulturalBackground />
        </div>

        {/* Gadaa geometric pattern overlay */}
        <div className="absolute inset-0 gadaa-pattern opacity-[0.08]" />

        {/* Gold top accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A227] to-transparent opacity-50" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full px-12 xl:px-16 py-10">
          {/* ── Top: Emblem + Name ────────────────────────────────────── */}
          <div className="flex items-center gap-4 login-brand-enter">
            <OtcmsEmblem size={52} />
            <div>
              <span className="font-display text-lg font-bold text-[#E8C84A] tracking-wide block leading-tight">
                OTCMS
              </span>
              <span className="text-[10px] text-white/40 tracking-[0.15em] uppercase mt-0.5 block">
                Bale Robe City · Oromia
              </span>
            </div>
          </div>

          {/* ── Center: Cultural Welcome ──────────────────────────────── */}
          <div className="login-brand-enter" style={{ animationDelay: "0.15s" }}>
            {/* Gold divider with diamond */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-px bg-[#C9A227]" />
              <div className="w-2 h-2 bg-[#C9A227] rotate-45" />
              <div className="w-3 h-px bg-[#C9A227]/50" />
            </div>

            {/* Afaan Oromo welcome */}
            <p className="font-display text-2xl text-[#E8C84A] mb-2 tracking-wide italic">
              Baga Nagaa Dhuftan!
            </p>

            <h1 className="font-display text-2xl xl:text-[2rem] text-white leading-[1.25] mb-4 max-w-lg">
              Oromo Traditional Court
              <br />
              <span className="text-[#E8C84A]">Management System</span>
            </h1>

            <p className="text-white/55 text-[15px] leading-relaxed max-w-md mb-6">
              Preserving Oromo cultural heritage, strengthening traditional justice,
              and promoting community reconciliation through modern digital technology.
            </p>

            {/* Gadaa pillars */}
            <div className="flex gap-6">
              {[
                { label: "Gadaa",         sublabel: "Heritage" },
                { label: "Heera",          sublabel: "Justice" },
                { label: "Nagaa",          sublabel: "Reconciliation" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full border border-[#C9A227]/30 flex items-center justify-center">
                    <div className="w-2 h-2 bg-[#C9A227]/60 rotate-45" />
                  </div>
                  <div>
                    <p className="text-white/75 text-sm font-medium leading-tight">{item.label}</p>
                    <p className="text-white/35 text-[10px] tracking-wide">{item.sublabel}</p>
                  </div>
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
              Proclamation 240/2021 · Gadaa Traditional Justice System
            </p>
          </div>
        </div>
      </div>

      {/* ══ RIGHT: Login Authentication Card ════════════════════════════ */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center bg-[#FAF8F3] px-6 py-12 relative overflow-hidden">
        {/* Subtle gadaa pattern */}
        <div className="absolute inset-0 gadaa-pattern opacity-[0.03] pointer-events-none" />

        <div className="w-full max-w-sm relative z-10">
          {/* ── Emblem (visible on all screens) ──────────────────────── */}
          <div className="flex flex-col items-center mb-6 login-brand-enter">
            <div className="relative">
              <OtcmsEmblem size={72} />
            </div>
            <div className="text-center mt-2">
              <p className="font-display text-base font-bold text-[#4A1518] tracking-wide leading-tight">
                Oromo Traditional Court
              </p>
              <p className="text-[10px] text-[#8B5E3C] tracking-[0.15em] uppercase mt-0.5">
                Management System
              </p>
            </div>
          </div>

          {/* ── Mobile-only name (hidden on desktop where left panel shows) */}
          <div className="lg:hidden text-center mb-4">
            <p className="font-display text-sm text-[#C9A227] italic">Baga Nagaa Dhuftan!</p>
          </div>

          {/* ── Login card ────────────────────────────────────────────── */}
          <div className="login-card-enter">
            {/* Heading */}
            <h2 className="font-display text-[1.6rem] text-[#2A1012] mb-1">Welcome back</h2>
            <p className="text-sm text-[#8B5E3C] mb-7">
              Sign in to access the Oromo Traditional Court Management System.
            </p>

            {/* Error alert */}
            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200/50 bg-red-50 px-4 py-3.5 animate-fade-in">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0 mt-1.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#2A1012] mb-1.5">
                  Email address
                </label>
                <div className="relative group">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4A1518] transition-colors" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-[#E5DDD0] bg-white pl-10 pr-4 py-3 text-sm text-[#2A1012] placeholder:text-gray-400 outline-none focus:border-[#4A1518] focus:ring-2 focus:ring-[#4A1518]/10 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-[#2A1012]">
                    Password
                  </label>
                  <a href="#" className="text-xs text-[#4A1518] hover:text-[#6B1F23] hover:underline transition-colors">
                    Forgot password?
                  </a>
                </div>
                <div className="relative group">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4A1518] transition-colors" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-[#E5DDD0] bg-white pl-10 pr-11 py-3 text-sm text-[#2A1012] placeholder:text-gray-400 outline-none focus:border-[#4A1518] focus:ring-2 focus:ring-[#4A1518]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#8B5E3C] transition-colors"
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
                  className="w-4 h-4 rounded border-[#E5DDD0] accent-[#4A1518] cursor-pointer"
                />
                <span className="text-sm text-[#8B5E3C]">Remember me</span>
              </label>

              {/* Submit button — deep burgundy with gold hover */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#4A1518] py-3 text-base font-medium text-white shadow-lg shadow-[#4A1518]/20 hover:bg-[#5C1A1D] hover:shadow-xl hover:shadow-[#4A1518]/30 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
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
            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
              <Lock size={11} />
              <span>Secure Access</span>
              <span className="text-gray-300">|</span>
              <span>Authorized Users Only</span>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-10 text-center text-[11px] text-gray-400">
            © {new Date().getFullYear()} Oromo Traditional Court · Bale Robe City, Ethiopia
          </p>
        </div>
      </div>
    </div>
  );
}
