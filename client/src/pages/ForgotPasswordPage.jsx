import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ShieldCheck, Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.success) {
        setMessage(res.data.message || 'Password reset token generated successfully.');
        if (res.data.resetToken) {
          setResetToken(res.data.resetToken);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process password reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-8 text-center bg-gradient-to-b from-blue-50/60 dark:from-slate-700/40 to-white dark:to-slate-800 border-b border-slate-100 dark:border-slate-700">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-md shadow-blue-500/20">
            <ShieldCheck size={26} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Forgot Password</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enter your account email to receive a password reset token
          </p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-400">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                <span>{message}</span>
              </div>
              {resetToken && (
                <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mb-1">
                    Security Token (Dev Mode):
                  </p>
                  <code className="block p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded font-mono text-[11px] break-all select-all">
                    {resetToken}
                  </code>
                  <button
                    type="button"
                    onClick={() => navigate(`/reset-password/${resetToken}`)}
                    className="mt-3 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>Proceed to Reset Password</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {!resetToken && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@marketplace.local"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? 'Processing...' : 'Send Reset Instructions'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <ArrowLeft size={14} />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
