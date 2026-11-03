import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Droplets,
  Zap,
  Filter,
  Bell,
  Scale,
  Info,
  Cpu,
} from "lucide-react";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/" },
  { label: "Water Quality", icon: Droplets, path: "/water" },
  { label: "Pump & Load", icon: Zap, path: "/pump" },
  { label: "Filter Health", icon: Filter, path: "/filters" },
  { label: "Prediction Model", icon: Cpu, path: "/model" },
  { label: "Alerts", icon: Bell, path: "/alerts" },
  { label: "Compare", icon: Scale, path: "/compare" },
  { label: "About", icon: Info, path: "/about" },
] as const;

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-16 md:w-60 flex-col border-r border-[#1e3a5f] bg-[#0d1929] transition-all">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 md:px-5 py-5">
        <Droplets className="h-7 w-7 shrink-0 text-cyan-400" />
        <div className="hidden md:block">
          <h1 className="text-lg font-bold leading-tight text-cyan-400">
            FilterPulse
          </h1>
          <span className="text-xs text-gray-500">atomQUEST 2026</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-2 flex flex-1 flex-col gap-1 px-2 md:px-3">
        {navItems.map(({ label, icon: Icon, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-l-2 border-cyan-400 bg-cyan-500/10 text-cyan-400"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="hidden md:inline">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="hidden md:block px-5 py-4">
        <p className="text-xs text-gray-600">Track 2: Water Purifier</p>
      </div>
    </aside>
  );
}
