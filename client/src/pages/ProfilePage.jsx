import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  User,
  Mail,
  Shield,
  Building,
  Lock,
  Moon,
  Sun,
  Monitor,
  Bell,
  CheckCircle2,
  AlertCircle,
  Save,
  Check,
  Award,
  Layers,
  Clock,
} from 'lucide-react';

export const ProfilePage = () => {
  const { user, updateProfile, changePassword, theme, setTheme } = useAuth();

  // Profile fields state
  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [notifications, setNotifications] = useState(
    user?.notificationPreferences || {
      reviewDecisions: true,
      changesRequested: true,
      weeklySummary: false,
    }
  );
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Activity stats
  const [activityStats, setActivityStats] = useState(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setDepartment(user.department || '');
      if (user.notificationPreferences) {
        setNotifications(user.notificationPreferences);
      }
    }
  }, [user]);

  useEffect(() => {
    // Load personal review metrics
    const fetchPersonalStats = async () => {
      try {
        const res = await api.get('/reports/analytics');
        if (res.data.success) {
          setActivityStats(res.data.data);
        }
      } catch (e) {
        // Fallback silently if not available
      }
    };
    fetchPersonalStats();
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);

    try {
      await updateProfile({
        name,
        department,
        notificationPreferences: notifications,
        theme,
      });
      setProfileSuccess('Profile details saved successfully.');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }

    setPwLoading(true);
    try {
      await changePassword({ currentPassword, newPassword, confirmPassword });
      setPwSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSuccess(''), 4000);
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleNotificationToggle = (key) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const roleBadgeColors = {
    administrator: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    reviewer: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    seller: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner / Avatar Header */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-md shadow-blue-500/20">
              {initials}
            </div>
            <span
              className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] ${
                user?.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
              }`}
              title={`Status: ${user?.status || 'active'}`}
            >
              ✓
            </span>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {user?.name || 'Authorized Member'}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border self-center sm:self-auto ${
                  roleBadgeColors[user?.role] || roleBadgeColors.reviewer
                }`}
              >
                {user?.role || 'reviewer'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Mail size={14} className="text-slate-400" />
                <span>{user?.email}</span>
              </div>
              {user?.department && (
                <div className="flex items-center gap-1.5">
                  <Building size={14} className="text-slate-400" />
                  <span>{user.department}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" />
                <span>
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Banner */}
        {activityStats && (
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Catalog Listings</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {activityStats.summary?.totalListings ?? 0}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Approved Listings</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {activityStats.summary?.approvedListings ?? 0}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Reviews Run</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {activityStats.summary?.totalReviewsRun ?? 0}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Avg Turnaround</p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                {activityStats.summary?.avgTurnaroundSeconds ?? 1.4}s
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Profile Details & Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Information Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <User size={18} className="text-blue-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Profile Information</h2>
            </div>

            {profileSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{profileSuccess}</span>
              </div>
            )}
            {profileError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{profileError}</span>
              </div>
            )}

            <form id="profileForm" onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Email is managed by administrator</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Department / Team
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Trust & Safety, Catalog Operations"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Assigned Platform Role
                </label>
                <input
                  type="text"
                  value={user?.role?.toUpperCase() || 'REVIEWER'}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
            </form>
          </div>

          <button
            type="submit"
            form="profileForm"
            disabled={profileLoading}
            className="mt-6 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            <span>{profileLoading ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </div>

        {/* Change Password Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <Lock size={18} className="text-blue-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Security & Password</h2>
            </div>

            {pwSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{pwSuccess}</span>
              </div>
            )}
            {pwError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{pwError}</span>
              </div>
            )}

            <form id="pwForm" onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repeat new password"
                  minLength={8}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>
            </form>
          </div>

          <button
            type="submit"
            form="pwForm"
            disabled={pwLoading}
            className="mt-6 w-full py-2.5 px-4 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-medium rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Lock size={16} />
            <span>{pwLoading ? 'Updating Password...' : 'Update Password'}</span>
          </button>
        </div>
      </div>

      {/* Preferences Section: Theme and Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appearance Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
            <Sun size={18} className="text-amber-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Theme & Appearance</h2>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Customize the interface theme for high-contrast auditing sessions.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-semibold transition-all ${
                theme === 'light'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <Sun size={20} className={theme === 'light' ? 'text-blue-600' : 'text-slate-400'} />
              <span>Light Mode</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-semibold transition-all ${
                theme === 'dark'
                  ? 'border-blue-500 bg-slate-900 text-blue-400 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <Moon size={20} className={theme === 'dark' ? 'text-blue-400' : 'text-slate-400'} />
              <span>Dark Mode</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-semibold transition-all ${
                theme === 'system'
                  ? 'border-blue-600 bg-blue-50 dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <Monitor size={20} className={theme === 'system' ? 'text-blue-600' : 'text-slate-400'} />
              <span>System</span>
            </button>
          </div>
        </div>

        {/* Notifications Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
            <Bell size={18} className="text-purple-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Notification Preferences</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Review Decisions
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Receive alerts when your listing is approved or rejected
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifications.reviewDecisions}
                onChange={() => handleNotificationToggle('reviewDecisions')}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Changes Requested
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Notify immediately when a reviewer flags issues to fix
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifications.changesRequested}
                onChange={() => handleNotificationToggle('changesRequested')}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Weekly Compliance Digest
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Weekly summary of catalog health and policy updates
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifications.weeklySummary}
                onChange={() => handleNotificationToggle('weeklySummary')}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
