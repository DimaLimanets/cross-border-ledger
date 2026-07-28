'use client';

import React from 'react';

interface TrendData {
  month: string;
  volume_usd: number;
  paid_usd: number;
}

interface ChartProps {
  trends: TrendData[];
}

export default function AnalyticsChart({ trends }: ChartProps) {
  // Gracefully handle empty states if no data is written to the ledger yet
  if (!trends || trends.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
          Insufficient historical ledger data to render timeline visuals.
        </p>
      </div>
    );
  }

  // Set fixed resolution parameters for crisp SVG matrix scaling
  const width = 600;
  const height = 240;
  const paddingX = 50;
  const paddingY = 40;

  // Track maximum value dynamically to bind the vertical rendering axis boundaries
  const maxVal = Math.max(...trends.map(t => t.volume_usd), 1000);

  // Map backend JSON array straight into static 2D coordinate points
  const points = trends.map((t, idx) => {
    const totalSteps = Math.max(trends.length - 1, 1);
    const x = paddingX + (idx / totalSteps) * (width - paddingX * 2);
    const y = height - paddingY - (t.volume_usd / maxVal) * (height - paddingY * 2);
    
    // Formatting year-month string (2026-07 -> Jul)
    const rawDate = new Date(t.month + '-02'); // Add safe day offset for timezones
    const monthLabel = isNaN(rawDate.getTime()) 
      ? t.month 
      : rawDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });

    return { x, y, label: monthLabel, value: t.volume_usd };
  });

  // Compile vector stroke paths using SVG instruction commands (M = Move, L = Line)
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  
  // Close the path loop along the baseline to compute a clean fillable background shape
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors duration-200">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Invoicing Volume Over Time</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Trailing 12-month ledger pipeline trends aggregated in normalized USD base values [1].</p>
      </div>

      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            {/* Smooth fallback area fill gradient */}
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(79, 70, 229)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="rgb(79, 70, 229)" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid Background Guideline Indicators */}
          {[0, 0.5, 1].map((ratio, index) => {
            const yPos = paddingY + ratio * (height - paddingY * 2);
            return (
              <line 
                key={index} 
                x1={paddingX} 
                y1={yPos} 
                x2={width - paddingX} 
                y2={yPos} 
                stroke="currentColor" 
                className="text-slate-100 dark:text-slate-800/40" 
                strokeDasharray="4 4" 
              />
            );
          })}

          {/* Render Area Vector Background Shape */}
          {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}

          {/* Render Primary Core Trend Line Stroke Vector */}
          {linePath && (
            <path 
              d={linePath} 
              fill="none" 
              stroke="rgb(99, 102, 241)" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          )}

          {/* Interactive Data Node Circle Intersection Intersections */}
          {points.map((p, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="4" 
                fill="white" 
                stroke="rgb(99, 102, 241)" 
                strokeWidth="2" 
                className="dark:fill-slate-900 group-hover:r-5 transition-all duration-100" 
              />
              
              {/* Dynamic Overlay Floating Tooltips on Item Hover Action */}
              <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                <rect 
                  x={p.x - 35} 
                  y={p.y - 28} 
                  width="70" 
                  height="18" 
                  rx="4" 
                  className="fill-slate-900 dark:fill-slate-800 text-white shadow-md" 
                />
                <text 
                  x={p.x} 
                  y={p.y - 16} 
                  textAnchor="middle" 
                  className="text-[9px] font-bold fill-white"
                >
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(p.value)}
                </text>
              </g>
            </g>
          ))}

          {/* Horizontal X-Axis Text Timeline Coordinate Metadata Labels */}
          {points.map((p, idx) => (
            <text 
              key={idx} 
              x={p.x} 
              y={height - 15} 
              textAnchor="middle" 
              className="text-[10px] font-semibold fill-slate-400 dark:fill-slate-500 uppercase tracking-wider"
            >
              {p.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
