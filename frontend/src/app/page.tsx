'use client';

import React, { useEffect, useState } from 'react';
import { DownloadCloud, Globe, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  senderCompany: string;
  recipientCompany: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD';
  status: 'paid' | 'pending' | 'overdue';
}

export default function DashboardPage() {
  // CRITICAL FIX: Initialized as empty array so it is forced to fetch from your live Go backend
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const syncLedgerData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Hits your live Go Gin router endpoint cleanly
      const response = await fetch('http://localhost:8080/api/invoices');
      
      if (!response.ok) {
        throw new Error(`Server returned error status code: ${response.status}`);
      }
      
      const data = await response.json();
      setInvoices(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to sync with the ledger engine database.');
    } finally {
      setLoading(false);
    }
  };

  // Triggers live database query instantly when page loads
  useEffect(() => {
    syncLedgerData();
  }, []);

  const renderStatus = (status: Invoice['status']) => {
    const statusMap = {
      paid: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
      pending: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-4 h-4 text-amber-500" /> },
      overdue: { color: 'bg-rose-50 text-rose-700 border-rose-200', icon: <AlertCircle className="w-4 h-4 text-rose-500" /> },
    };
    const current = statusMap[status] || statusMap.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${current.color}`}>
        {current.icon} {status.toUpperCase()}
      </span>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-800">
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cross-Border Fintech Ledger</h1>
          </div>
          <p className="text-sm text-slate-500">Week 7 Portal • Live Neon Cloud PostgreSQL Mode</p>
        </div>

        <button 
          onClick={syncLedgerData}
          disabled={loading}
          className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Sync Ledger
        </button>
      </header>

      <section className="max-w-7xl mx-auto">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl mb-6 text-sm">
            <strong>Connection Notice:</strong> {error}. Ensure your Go backend server is active on port 8080.
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span>Querying ledger rails from cloud database...</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Invoice ID</th>
                  <th className="p-4">Counterparty (Sender → Recipient)</th>
                  <th className="p-4">Settlement Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400">
                      No active ledger records found inside Neon PostgreSQL database.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 font-mono font-medium text-slate-900">{inv.invoiceNumber}</td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800">{inv.recipientCompany}</div>
                        <div className="text-xs text-slate-400">from {inv.senderCompany}</div>
                      </td>
                      <td className="p-4 font-semibold text-slate-900">{inv.amount.toLocaleString()} {inv.currency}</td>
                      <td className="p-4">{renderStatus(inv.status)}</td>
                      <td className="p-4 text-right">
                        {/* Dynamically appends the genuine database ID string token to your download path links */}
                        <a href={`http://localhost:8080/api/invoices/download?id=${inv.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 shadow-sm transition-colors">
                          <DownloadCloud className="w-3.5 h-3.5" /> Download PDF
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}

