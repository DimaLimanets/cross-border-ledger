import React from 'react';
import { Globe } from 'lucide-react';

export default function AnalyticsLoadingSkeleton() {
  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto animate-pulse">
      
      {/* Header Skeleton Block */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-4 w-96 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
        </div>
        <div className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
      </div>

      {/* KPI Ticker Summary Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((item) => (
          <div key={item} className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
            <div className="space-y-3 w-2/3">
              <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-7 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            </div>
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          </div>
        ))}
      </div>

      {/* Currency FX Exposure Section Skeleton */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <Globe className="w-5 h-5 text-slate-300 dark:text-slate-700" />
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((bucket) => (
            <div key={bucket} className="p-5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-900 flex flex-col space-y-2">
              <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-6 w-28 bg-slate-300 dark:bg-slate-800 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
