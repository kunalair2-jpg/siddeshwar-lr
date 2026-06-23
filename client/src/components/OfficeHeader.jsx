import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const TABS = [
  { to: "/lrs/new", label: "Direct Dispatch" },
  { to: "/reports", label: "Reports" },
  { to: "/lrs", label: "History" },
];

export default function OfficeHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) navigate(`/lrs?search=${encodeURIComponent(search.trim())}`);
  }

  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-hairline">
      <div className="flex items-center justify-between px-xl h-16 gap-xl">
        <nav className="flex items-center gap-xl flex-shrink-0">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end
              className={({ isActive }) =>
                `text-sm font-semibold pb-1 border-b-2 transition-colors ${
                  isActive
                    ? "text-primary border-primary"
                    : "text-on-surface-variant border-transparent hover:text-primary"
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <form onSubmit={handleSearch} className="flex-1 max-w-md relative hidden md:block">
          <span className="absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search LR / Vehicle / Driver"
            className="w-full pl-huge pr-md py-sm bg-surface-container-low border border-hairline rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </form>

        <div className="flex items-center gap-md flex-shrink-0">
          <button className="p-sm text-on-surface-variant hover:text-primary transition-colors" title="Notifications">
            🔔
          </button>
          <button className="p-sm text-on-surface-variant hover:text-primary transition-colors" title="Sync">
            ☁️
          </button>
          <div className="h-6 w-px bg-hairline" />
          <button
            onClick={() => navigate("/lrs/new")}
            className="px-xl py-sm bg-primary hover:bg-primary-press text-on-primary rounded-full font-medium text-sm transition-all"
          >
            New LR
          </button>
          <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-sm font-semibold">
            {user?.name?.[0] || "U"}
          </div>
        </div>
      </div>
    </header>
  );
}
