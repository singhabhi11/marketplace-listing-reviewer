import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  FileSpreadsheet,
  Download,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Server,
  Zap,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const ReportsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportingListings, setExportingListings] = useState(false);
  const [exportingReviews, setExportingReviews] = useState(false);

  const fetchReportsData = async () => {
    setLoading(true);
    setError('');
    try {
      const [analyticsRes, healthRes] = await Promise.all([
        api.get('/reports/analytics'),
        api.get('/reports/system'),
      ]);

      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.data);
      }
      if (healthRes.data.success) {
        setSystemHealth(healthRes.data.data);
      }
    } catch (err) {
      setError('Failed to fetch reporting analytics and system health.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const handleExportListings = async () => {
    setExportingListings(true);
    try {
      const response = await api.get('/reports/export-listings', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `listings-catalog-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('Failed to export listings CSV report.');
    } finally {
      setExportingListings(false);
    }
  };

  const handleExportReviews = async () => {
    setExportingReviews(true);
    try {
      const response = await api.get('/reports/export-reviews', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-findings-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('Failed to export review findings CSV report.');
    } finally {
      setExportingReviews(false);
    }
  };

  // Recharts Data Prep
  const severityColors = {
    Critical: '#ef4444',
    High: '#f97316',
    Medium: '#eab308',
    Low: '#3b82f6',
  };

  const severityChartData = [
    {
      name: 'Critical',
      count: analytics?.severityBreakdown?.critical ?? 0,
      fill: severityColors.Critical,
    },
    {
      name: 'High',
      count: analytics?.severityBreakdown?.high ?? 0,
      fill: severityColors.High,
    },
    {
      name: 'Medium',
      count: analytics?.severityBreakdown?.medium ?? 0,
      fill: severityColors.Medium,
    },
    {
      name: 'Low',
      count: analytics?.severityBreakdown?.low ?? 0,
      fill: severityColors.Low,
    },
  ];

  const outcomesColors = {
    Approved: '#10b981',
    'Changes Requested': '#a855f7',
    Rejected: '#f43f5e',
    Pending: '#f59e0b',
  };

  const outcomesChartData = [
    {
      name: 'Approved',
      value: analytics?.summary?.approvedListings ?? 0,
      fill: outcomesColors.Approved,
    },
    {
      name: 'Changes Requested',
      value: analytics?.summary?.changesRequestedListings ?? 0,
      fill: outcomesColors['Changes Requested'],
    },
    {
      name: 'Rejected',
      value: analytics?.summary?.rejectedListings ?? 0,
      fill: outcomesColors.Rejected,
    },
    {
      name: 'Pending Review',
      value: analytics?.summary?.pendingReviews ?? 0,
      fill: outcomesColors.Pending,
    },
  ];

  const policyViolationsData = (analytics?.topViolations || []).map((v) => ({
    name: v.policyCitation || 'Uncategorized',
    violations: v.count,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Activity className="text-blue-600" size={26} />
            <span>Compliance Reports & Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Platform audit metrics, policy violation trends, and authorized CSV report exports.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchReportsData}
            disabled={loading}
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-xs transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleExportListings}
            disabled={exportingListings}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" />
            <span>{exportingListings ? 'Exporting...' : 'Export Listings CSV'}</span>
          </button>

          <button
            onClick={handleExportReviews}
            disabled={exportingReviews}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Download size={16} />
            <span>{exportingReviews ? 'Exporting...' : 'Export Audit Findings CSV'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Policy Compliance Rate</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {analytics?.summary?.complianceRate ?? 0}%
            </span>
            <span className="text-xs text-slate-400">of total listings</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${analytics?.summary?.complianceRate ?? 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Total Reviews Executed</span>
            <Activity size={16} className="text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {analytics?.summary?.totalReviewsRun ?? 0}
            </span>
            <span className="text-xs text-slate-400">completed audits</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">Assisted by AI & rule engine</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Avg Turnaround Time</span>
            <Clock size={16} className="text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {analytics?.summary?.avgTurnaroundSeconds ?? 1.2}s
            </span>
            <span className="text-xs text-slate-400">per full audit</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">Real-time retrieval & grounding</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Policy Violations Logged</span>
            <ShieldAlert size={16} className="text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {analytics?.summary?.totalFindingsRecorded ?? 0}
            </span>
            <span className="text-xs text-slate-400">findings</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">Across active catalog items</p>
        </div>
      </div>

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Breakdown Bar Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Findings by Severity Level
              </h2>
              <p className="text-[11px] text-slate-400">
                Classification of policy non-compliance issues
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {severityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Listing Status Donut Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Catalog Status Breakdown
              </h2>
              <p className="text-[11px] text-slate-400">
                Proportion of listings across approval stages
              </p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={outcomesChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {outcomesChartData.map((entry, index) => (
                    <Cell key={`cell-outcome-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconSize={10}
                  wrapperStyle={{ fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Violations Table & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Most Frequent Policy Violations */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden p-6">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Top Policy Citations Triggered
          </h2>
          <p className="text-[11px] text-slate-400 mb-4">
            Grounding references most frequently cited during reviews
          </p>

          <div className="space-y-3">
            {policyViolationsData.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No policy citations recorded yet.</p>
            ) : (
              policyViolationsData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {item.name}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-xs font-bold">
                    {item.violations} violation{item.violations === 1 ? '' : 's'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Diagnostics & AI Status */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
            <Server size={18} className="text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">System Diagnostics</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
              <span className="text-slate-500 dark:text-slate-400">Database Engine</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {systemHealth?.database?.status === 'connected' ? (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    Connected ({systemHealth?.database?.provider || 'MongoDB'})
                  </span>
                ) : (
                  'Disconnected'
                )}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
              <span className="text-slate-500 dark:text-slate-400">LLM Provider</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {systemHealth?.aiProvider?.provider || 'Google Gemini / Gemini 1.5 Flash'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
              <span className="text-slate-500 dark:text-slate-400">API Key Status</span>
              <span
                className={`font-semibold ${
                  systemHealth?.aiProvider?.hasApiKey ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {systemHealth?.aiProvider?.hasApiKey ? 'Configured & Active' : 'Fallback Rules Active'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
              <span className="text-slate-500 dark:text-slate-400">Grounding / RAG</span>
              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                <Zap size={14} /> Active Grounding
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
              <span className="text-slate-500 dark:text-slate-400">System Uptime</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {systemHealth?.uptimeSeconds
                  ? `${Math.floor(systemHealth.uptimeSeconds / 60)}m ${Math.floor(
                      systemHealth.uptimeSeconds % 60
                    )}s`
                  : 'Active'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
