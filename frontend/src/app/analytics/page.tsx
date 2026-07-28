import React from 'react';
import { DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import AnalyticsWorkspace from '@/components/AnalyticsWorkspace';

interface Invoice {
  id: string;
  invoiceNumber: string;
  senderCompany: string;
  recipientCompany: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
  createdAt: string;
}

interface AnalyticsData {
  total_volume: number;
  outstanding_ar: number;
  collection_rate: number;
  currency_exposure: Record<string, number>;
}

// Unified server fetch to prevent multiple API hops
async function getDashboardPayload(): Promise<{ analytics: AnalyticsData; invoices: Invoice[] }> {
  try {
    const [analyticsRes, invoicesRes] = await Promise.all([
      fetch('http://localhost:8080/api/analytics', { next: { revalidate: 10 } }),
      fetch('http://localhost:8080/api/invoices', { next: { revalidate: 10 } })
    ]);

    if (!analyticsRes.ok || !invoicesRes.ok) {
      throw new Error('Ledger data downstream compilation failed');
    }

    const [analytics, invoices] = await Promise.all([analyticsRes.json(), invoicesRes.json()]);
    return { analytics, invoices };
  } catch (err) {
    throw new Error('Failed to bridge active connection with Go backend cluster');
  }
}

export default async function AnalyticsDashboardPage() {
  const { analytics, invoices } = await getDashboardPayload();

  const summaryCards = [
    {
      title: 'Aggregate Volume (USD Equiv)',
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(analytics.total_volume),
      icon: DollarSign,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900',
    },
    {
      title: 'Outstanding AR (USD Equiv)',
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(analytics.outstanding_ar),
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900',
    },
    {
      title: 'Collection Rate Metrics',
      value: `${analytics.collection_rate.toFixed(1)}%`,
      icon: CheckCircle2,
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900',
    },
  ];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto transition-colors duration-200">

      {/* Top Header Section */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Cross-Border Ledger Hub</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Week 10 Financial Analytics and Live Ledger Stream Processing.</p>
        </div>
        <ThemeToggle />
      </div>

      {/* KPI Ticker Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {summaryCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <div key={index} className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{card.title}</span>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              </div>
              <div className={`p-3 rounded-xl border ${card.color}`}>
                <IconComponent className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Core Workspace Component */}
      <AnalyticsWorkspace initialInvoices={invoices} currencyExposure={analytics.currency_exposure} />
    </div>
  );
}
