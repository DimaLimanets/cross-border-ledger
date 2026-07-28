'use client';

import React, { useEffect, useState } from 'react';
import { DownloadCloud, Globe, CheckCircle2, Clock, AlertCircle, RefreshCw, PlusCircle, X } from 'lucide-react';
import { API_AUTH_TOKEN } from '@/services/api';

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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form parameters state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [senderCompany, setSenderCompany] = useState('');
  const [recipientCompany, setRecipientCompany] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP' | 'CAD'>('USD');
  const [status, setStatus] = useState<'paid' | 'pending' | 'overdue'>('pending');
  const [dueDate, setDueDate] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const syncLedgerData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:8080/api/invoices');
      if (!response.ok) throw new Error(`Server code: ${response.status}`);
      const data = await response.json();
      setInvoices(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to sync with ledger engine database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncLedgerData();
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormSubmitting(true);
      const payload = {
        invoiceNumber,
        senderCompany,
        recipientCompany,
        amount: parseFloat(amount),
        currency,
        status,
        dueDate,
      };

      const response = await fetch('http://localhost:8080/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_AUTH_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Server write operation error');
      }

      setInvoiceNumber('');
      setSenderCompany('');
      setRecipientCompany('');
      setAmount('');
      setDueDate('');
      setIsModalOpen(false);
      
      await syncLedgerData();
    } catch (err: any) {
      alert(`Ledger addition error: ${err.message}`);
    } finally {
      setFormSubmitting(false);
    }
  };

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
    <main className="min-h-screen bg-slate-50 p-8 text-slate-800 relative">
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cross-Border Fintech Ledger</h1>
          </div>
          <p className="text-sm text-slate-500">Week 8 Portal • Mutable Ingestion Active</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-indigo-700 transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Add Transaction
          </button>
          <button 
            onClick={syncLedgerData}
            disabled={loading}
            className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sync
          </button>
        </div>
      </header>

      <section className="max-w-7xl mx-auto">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl mb-6 text-sm">
            <strong>Connection Notice:</strong> {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span>Syncing with Cloud database rails...</span>
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
                    <td colSpan={5} className="p-12 text-center text-slate-400">No active tracking records.</td>
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

      {/* CREATE MODAL INTERFACE BACKDROP */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Log New Cross-Border Ingestion</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateInvoice} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Invoice Number</label>
                <input required type="text" placeholder="INV-2026-X" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Sender Company</label>
                  <input required type="text" placeholder="Origin Co." value={senderCompany} onChange={(e) => setSenderCompany(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Recipient Company</label>
                  <input required type="text" placeholder="Target Corp" value={recipientCompany} onChange={(e) => setRecipientCompany(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Amount</label>
                  <input required type="number" step="0.01" min="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value as typeof currency)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500">
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Due Date</label>
                  <input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <button
                type="submit"
                disabled={formSubmitting}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {formSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                {formSubmitting ? 'Submitting...' : 'Log Transaction'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
