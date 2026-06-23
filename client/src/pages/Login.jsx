import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const MODES = {
  office: {
    label: "🏢 Office",
    placeholder: "Ex: EMP-4920",
    cta: "Sign In to Dashboard",
    demo: "EMP-4920 / dispatch123",
    home: "/",
  },
  security: {
    label: "🛡 Security",
    placeholder: "Ex: SEC-1001",
    cta: "Sign In to Gate Control",
    demo: "SEC-1001 / gate123",
    home: "/gate",
  },
  receiver: {
    label: "📦 Receiver",
    placeholder: "Ex: REC-2001",
    cta: "Sign In to Deliveries",
    demo: "REC-2001 / receive123",
    home: "/delivery",
  },
};

const HOME_BY_ROLE = {
  security: "/gate",
  receiver: "/delivery",
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("office");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(employeeId, password);
      navigate(HOME_BY_ROLE[user.role] || "/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const active = MODES[mode];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-lg py-huge bg-gradient-to-br from-primary-fixed/40 via-surface to-canvas-cream/30 font-sans">
      <div className="mb-xxl text-center w-full max-w-md flex flex-col items-center">
        <h1 className="text-3xl text-brand-dark-900 tracking-tight flex items-center justify-center gap-sm font-semibold">
          <span>❄️</span>
          SIDDHESHWER TRANSPORT
        </h1>
        <div className="mt-sm inline-flex items-center gap-xs px-md py-xs rounded-full bg-surface-container border border-hairline">
          <span className="text-xs text-tertiary uppercase tracking-wider">
            🛡 Entry Management Portal
          </span>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-md p-xxl relative overflow-hidden border border-hairline">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary via-magenta to-ruby" />
        <h2 className="text-2xl text-brand-dark-900 mb-lg text-center font-medium">Sign In</h2>

        <div className="flex gap-xs bg-surface-container rounded-full p-xxs mb-lg">
          {Object.entries(MODES).map(([key, m]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`flex-1 py-sm rounded-full text-xs sm:text-sm font-medium transition-colors ${
                mode === key ? "bg-surface-container-lowest shadow-sm text-primary" : "text-on-surface-variant"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <form className="flex flex-col gap-lg" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-xs">
            <label className="text-sm text-on-surface-variant ml-xs" htmlFor="employee-id">
              Employee ID
            </label>
            <input
              id="employee-id"
              className="w-full border border-hairline bg-surface-bright rounded-lg py-md px-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={active.placeholder}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="flex flex-col gap-xs">
            <label className="text-sm text-on-surface-variant ml-xs" htmlFor="password">
              Password
            </label>
            <div className="relative flex items-center">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="w-full border border-hairline bg-surface-bright rounded-lg py-md px-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-md text-ink-mute hover:text-primary text-xs"
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-md w-full bg-primary hover:bg-primary-press text-on-primary font-medium py-md px-xl rounded-full transition-all flex items-center justify-center gap-sm disabled:opacity-60"
          >
            {loading ? "Signing in…" : active.cta}
            <span>→</span>
          </button>
        </form>

        <div className="mt-xl pt-lg border-t border-hairline flex items-center justify-center gap-xs text-xs text-ink-secondary">
          <span>🚚</span>
          <span>A/p. Kuruli, Tal. Khed, Dist. Pune - 410 501</span>
        </div>
      </div>

      <p className="mt-xl text-xs text-on-surface-variant">Demo credentials: {active.demo}</p>
    </div>
  );
}
