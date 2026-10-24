import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Settings,
  Shield,
  Layers,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Cpu,
  Lock,
} from 'lucide-react';

export const SettingsPage = () => {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [newCatInput, setNewCatInput] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/policies/settings');
      if (res.data.success) {
        setSettings(res.data.data);
      }
    } catch (err) {
      setErrorMsg('Failed to load platform settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleAddCategory = () => {
    const trimmed = newCatInput.trim();
    if (trimmed && !settings.supportedCategories.includes(trimmed)) {
      setSettings({
        ...settings,
        supportedCategories: [...settings.supportedCategories, trimmed],
      });
      setNewCatInput('');
    }
  };

  const handleRemoveCategory = (catToRemove) => {
    setSettings({
      ...settings,
      supportedCategories: settings.supportedCategories.filter((c) => c !== catToRemove),
    });
  };

  const handleThresholdChange = (field, val) => {
    setSettings({
      ...settings,
      validationThresholds: {
        ...settings.validationThresholds,
        [field]: parseFloat(val) || 0,
      },
    });
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only administrators can modify platform configuration.');
      return;
    }
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.patch('/policies/settings', {
        supportedCategories: settings.supportedCategories,
        validationThresholds: settings.validationThresholds,
      });
      if (res.data.success) {
        setSuccessMsg('Marketplace settings and validation rules successfully saved.');
        setSettings(res.data.data);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Platform Configuration</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage supported product categories, deterministic validation thresholds, and security parameters.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Categories Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers size={16} className="text-blue-600" />
              <span>Configurable Supported Categories</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Listings categorized outside this list are flagged by the deterministic engine.
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Add new category (e.g. Garden & Patio)..."
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
              className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-600"
            >
              Add
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {settings.supportedCategories?.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-600"
            >
              <span>{cat}</span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(cat)}
                  className="text-slate-400 hover:text-rose-600 font-bold ml-1"
                >
                  &times;
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Deterministic Validation Engine Settings Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
          <Sliders size={16} className="text-blue-600" />
          <span>Deterministic Validation Thresholds</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Minimum Title Length (characters)
            </label>
            <input
              type="number"
              disabled={!isAdmin}
              value={settings.validationThresholds?.minTitleLength ?? 10}
              onChange={(e) => handleThresholdChange('minTitleLength', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Maximum Title Length (characters)
            </label>
            <input
              type="number"
              disabled={!isAdmin}
              value={settings.validationThresholds?.maxTitleLength ?? 150}
              onChange={(e) => handleThresholdChange('maxTitleLength', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Minimum Description Length (characters)
            </label>
            <input
              type="number"
              disabled={!isAdmin}
              value={settings.validationThresholds?.minDescLength ?? 30}
              onChange={(e) => handleThresholdChange('minDescLength', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Maximum Description Length (characters)
            </label>
            <input
              type="number"
              disabled={!isAdmin}
              value={settings.validationThresholds?.maxDescLength ?? 5000}
              onChange={(e) => handleThresholdChange('maxDescLength', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Maximum Single Listing Price Threshold (USD)
            </label>
            <input
              type="number"
              disabled={!isAdmin}
              value={settings.validationThresholds?.maxPrice ?? 100000}
              onChange={(e) => handleThresholdChange('maxPrice', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Duplicate Similarity Detection Sensitivity (0.0 to 1.0)
            </label>
            <input
              type="number"
              step="0.05"
              min="0.1"
              max="1.0"
              disabled={!isAdmin}
              value={settings.validationThresholds?.duplicateSimilarityThreshold ?? 0.8}
              onChange={(e) => handleThresholdChange('duplicateSimilarityThreshold', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 disabled:opacity-60"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Note: Duplicate detection uses hybrid token & Levenshtein similarity. High values (0.8+) minimize false positives.
            </span>
          </div>
        </div>
      </div>

      {/* Security & AI Provider Status Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
          <Cpu size={16} className="text-blue-600" />
          <span>AI Architecture & Security Safeguards</span>
        </h2>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 flex items-start gap-3">
            <Lock size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 dark:text-white block font-semibold">Zero Frontend Credential Exposure</strong>
              <span>
                All AI requests, prompt sanitization, and policy retrieval are executed strictly on the backend. No provider API keys or tokens are ever sent to client browsers.
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 flex items-start gap-3">
            <Shield size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 dark:text-white block font-semibold">Prompt Injection Defense Boundary</strong>
              <span>
                Listing data is strictly demarked in <code>&lt;listing_data&gt;</code> tags and treated as untrusted data. Instructions inside listing fields cannot override policy review rules.
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 flex items-start gap-3">
            <Cpu size={16} className="text-purple-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 dark:text-white block font-semibold">Automatic Deterministic Fallback</strong>
              <span>
                When external LLM providers are unavailable, timed out, or unconfigured, the system automatically runs the deterministic heuristic rule engine and flags fallback status without hallucinating.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
