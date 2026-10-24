import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ onOpenSidebar }) => {
  const { user, logout, theme, setTheme } = useAuth();

  const isDarkActive =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleTheme = () => {
    if (isDarkActive) {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const roleLabels = {
    administrator: 'Administrator',
    reviewer: 'Reviewer',
    seller: 'Seller',
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 md:hidden"
          aria-label="Open navigation sidebar"
        >
          <Menu size={20} />
        </button>
        <div className="hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Policy Engine: Active & Grounded
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title={`Switch to ${isDarkActive ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {isDarkActive ? (
            <Sun size={18} className="text-amber-400" />
          ) : (
            <Moon size={18} className="text-slate-600 dark:text-slate-300" />
          )}
        </button>

        {/* Profile Avatar Pill */}
        <Link
          to="/profile"
          className="flex items-center gap-2.5 p-1.5 pr-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
          title="Manage Profile & Settings"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold uppercase shadow-xs">
            {initials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
              {user?.name || 'User'}
            </p>
            <span className="text-[10px] text-slate-400 dark:text-slate-400 capitalize">
              {roleLabels[user?.role] || user?.role || 'Reviewer'}
            </span>
          </div>
        </Link>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors border border-slate-200 dark:border-slate-600 hover:border-rose-200 dark:hover:border-rose-800"
          title="Sign out"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
