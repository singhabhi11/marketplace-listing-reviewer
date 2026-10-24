import React from "react";
import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  FileCheck2,
  BookOpen,
  History,
  Settings,
  ShieldCheck,
  Activity,
  Users,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, isAdmin, isReviewer, isSeller } = useAuth();

  // Role-aware navigation items
  const navItems = [
    {
      name: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
      roles: ["administrator", "reviewer", "seller"],
    },
    {
      name: "Listings Catalog",
      path: "/listings",
      icon: Package,
      roles: ["administrator", "reviewer", "seller"],
    },
    {
      name: "New Listing",
      path: "/listings/new",
      icon: PlusCircle,
      roles: ["administrator", "reviewer", "seller"],
    },
    {
      name: "Batch Review",
      path: "/batch",
      icon: FileCheck2,
      roles: ["administrator", "reviewer"],
    },
    {
      name: "Policy Library",
      path: "/policies",
      icon: BookOpen,
      roles: ["administrator", "reviewer"],
    },
    {
      name: "Review History",
      path: "/audit",
      icon: History,
      roles: ["administrator", "reviewer"],
    },
    {
      name: "Reports & Analytics",
      path: "/reports",
      icon: Activity,
      roles: ["administrator"],
    },
    {
      name: "User Management",
      path: "/users",
      icon: Users,
      roles: ["administrator"],
    },
    {
      name: "System Settings",
      path: "/settings",
      icon: Settings,
      roles: ["administrator"],
    },
  ];

  const currentRole = user?.role || "reviewer";
  const visibleItems = navItems.filter((item) =>
    item.roles.includes(currentRole),
  );

  const initials = user?.name
    ? user.name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    : "U";

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-700 gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shadow-blue-500/20">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white tracking-tight block text-base leading-tight">
              ListingGuard
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-wider uppercase block">
              Quality & Policy
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${isActive
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750 hover:text-slate-900 dark:hover:text-slate-100"
                  }`
                }
              >
                <Icon size={18} className="shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card at bottom of sidebar linking to Profile */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40">
          <Link
            to="/profile"
            onClick={onClose}
            className="flex items-center gap-3 group p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase shrink-0 shadow-xs">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {user?.name || "User"}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="inline-block px-1.5 py-0.2 text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950 rounded">
                  {user?.role || "reviewer"}
                </span>
                <span className="text-[10px] text-slate-400">Profile →</span>
              </div>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
};
