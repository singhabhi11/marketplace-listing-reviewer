import React from 'react';
import { Menu, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ onOpenSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 md:hidden"
          aria-label="Open navigation sidebar"
        >
          <Menu size={20} />
        </button>
        <div className="hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-medium text-slate-500">
            Policy Engine: Active & Grounded
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Shield size={14} className="text-blue-600" />
          <span className="hidden sm:inline">Signed in as</span>
          <strong className="text-slate-900 font-semibold">{user?.email}</strong>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200 hover:border-rose-200"
          title="Sign out"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
