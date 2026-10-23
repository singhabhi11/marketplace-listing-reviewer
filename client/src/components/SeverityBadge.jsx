import React from 'react';
import { AlertTriangle, AlertOctagon, Info, AlertCircle } from 'lucide-react';

export const SeverityBadge = ({ severity, size = 'sm' }) => {
  const norm = (severity || 'Medium').toLowerCase();

  const styles = {
    critical: {
      bg: 'bg-red-50 text-red-700 border-red-200',
      icon: AlertOctagon,
      label: 'Critical',
    },
    high: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: AlertTriangle,
      label: 'High',
    },
    medium: {
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: AlertCircle,
      label: 'Medium',
    },
    low: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: Info,
      label: 'Low',
    },
  };

  const current = styles[norm] || styles.medium;
  const IconComponent = current.icon;

  const sizeClasses = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  const iconSize = size === 'lg' ? 16 : 13;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${current.bg} ${sizeClasses}`}
    >
      <IconComponent size={iconSize} className="shrink-0" />
      <span>{current.label}</span>
    </span>
  );
};
