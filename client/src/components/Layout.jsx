import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const OWNER_CORE_NAV = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/lrs", label: "History", icon: "🚚", end: false },
  { to: "/settings", label: "Settings", icon: "⚙️", end: true },
];

const OWNER_REPORTS_NAV = [
  { to: "/reports", label: "Dashboard", icon: "📊", end: true },
  { to: "/inspections", label: "Inspections", icon: "📝", end: false },
  { to: "/reconciliation", label: "Reconciliation", icon: "💳", end: true },
  { to: "/settings", label: "Settings", icon: "⚙️", end: true },
];

const REPORTS_ZONE_PREFIXES = ["/reports", "/inspections", "/reconciliation"];

const ROLE_CONFIG = {
  owner: {
    icon: "🏢",
    brand: "Siddheshwer",
    subtitle: "Logistics ERP",
    showQuickEntry: true,
    showActiveShift: false,
  },
  security: {
    icon: "🛡",
    brand: "Siddheshwer Transport",
    subtitle: "Gate Security",
    showQuickEntry: false,
    showActiveShift: true,
    navItems: [
      { to: "/gate", label: "Gate Control", icon: "🚧", end: true },
      { to: "/gate/log", label: "Departure Log", icon: "📋", end: true },
    ],
  },
  receiver: {
    icon: "📦",
    brand: "Siddheshwer Transport",
    subtitle: "Receiving / Warehouse",
    showQuickEntry: false,
    showActiveShift: true,
    navItems: [
      { to: "/delivery", label: "Incoming Deliveries", icon: "📦", end: true },
      { to: "/delivery/log", label: "Delivery Log", icon: "📋", end: true },
    ],
  },
};
ROLE_CONFIG.dispatcher = ROLE_CONFIG.owner;

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const config = ROLE_CONFIG[user?.role] || ROLE_CONFIG.owner;

  const isOwner = user?.role === "owner" || user?.role === "dispatcher";
  const inReportsZone = REPORTS_ZONE_PREFIXES.some((p) => location.pathname.startsWith(p));
  const navItems = isOwner ? (inReportsZone ? OWNER_REPORTS_NAV : OWNER_CORE_NAV) : config.navItems;

  return (
    <div className="flex h-screen overflow-hidden bg-canvas-soft font-sans">
      <nav className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface border-r border-hairline p-lg space-y-md z-40">
        <div className="flex items-center space-x-md mb-xl">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-xl">
            {config.icon}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-primary leading-tight">{config.brand}</h1>
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide">
              {config.subtitle}
            </p>
          </div>
        </div>

        <ul className="flex-1 space-y-sm">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center space-x-md px-md py-md rounded-xl transition-all ${
                    isActive
                      ? "text-primary font-semibold bg-secondary-container/30"
                      : "text-on-surface-variant hover:bg-surface-container"
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {config.showQuickEntry && (
          <button
            onClick={() => navigate("/lrs/new")}
            className="w-full py-md px-lg bg-primary hover:bg-primary-press text-on-primary font-medium rounded-full transition-colors flex items-center justify-center space-x-sm shadow-sm"
          >
            <span>Quick Entry</span>
          </button>
        )}

        <div className="mt-auto border-t border-hairline pt-md">
          {config.showActiveShift && (
            <div className="px-md py-sm mb-xs rounded-xl bg-primary-fixed/40 flex items-center gap-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-primary-deep uppercase tracking-wide">
                Active Shift
              </span>
            </div>
          )}
          <div className="px-md py-sm text-sm text-on-surface-variant">
            {user?.name} <span className="text-xs">({user?.employeeId})</span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center space-x-md px-md py-sm text-on-surface-variant hover:bg-surface-container rounded-xl transition-all"
          >
            <span>⏏</span>
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 ml-0 md:ml-64 bg-canvas-soft h-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
