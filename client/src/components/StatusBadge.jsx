import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertCircle, Edit3, Loader2 } from 'lucide-react';

export const StatusBadge = ({ status }) => {
  const norm = (status || 'Draft').toLowerCase();

  const styles = {
    approved: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      label: 'Approved',
    },
    'changes suggested': {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: AlertCircle,
      label: 'Changes Suggested',
    },
    'pending review': {
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Clock,
      label: 'Pending Review',
    },
    reviewing: {
      bg: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: Loader2,
      label: 'Reviewing',
      spin: true,
    },
    rejected: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: XCircle,
      label: 'Rejected',
    },
    draft: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: Edit3,
      label: 'Draft',
    },
    failed: {
      bg: 'bg-red-50 text-red-700 border-red-200',
      icon: XCircle,
      label: 'Failed',
    },
  };

  const current = styles[norm] || styles.draft;
  const IconComponent = current.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${current.bg}`}
    >
      <IconComponent size={13} className={`shrink-0 ${current.spin ? 'animate-spin' : ''}`} />
      <span>{current.label}</span>
    </span>
  );
};
