import React from "react";
import { ArrowRight, Check, X } from "lucide-react";

export const DiffViewer = ({ fieldName, originalValue, revisedValue }) => {
  const isDifferent =
    String(originalValue || "").trim() !== String(revisedValue || "").trim();

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
        <span>Field: {fieldName}</span>
        {isDifferent ? (
          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px] font-medium lowercase">
            modification suggested
          </span>
        ) : (
          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-medium lowercase">
            unchanged
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
        {/* Original */}
        <div className="p-4 bg-white/60">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 mb-2">
            <X size={13} className="shrink-0" />
            <span>Original Content</span>
          </div>
          <div className="text-sm text-slate-700 font-mono bg-red-50/40 p-3 rounded-lg border border-red-100 whitespace-pre-wrap break-words">
            {originalValue || (
              <span className="text-slate-400 italic">Empty</span>
            )}
          </div>
        </div>

        {/* Revised */}
        <div className="p-4 bg-emerald-50/20">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mb-2">
            <Check size={13} className="shrink-0" />
            <span>Suggested Revision</span>
          </div>
          <div className="text-sm text-slate-800 font-mono bg-emerald-50/70 p-3 rounded-lg border border-emerald-200 whitespace-pre-wrap break-words">
            {revisedValue || (
              <span className="text-slate-400 italic">
                No revision proposed
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
