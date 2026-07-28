'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, PlusCircle, FileText, Download, Trash2, Search, Filter, Activity } from 'lucide-react';
import { API_AUTH_TOKEN } from '@/services/api';

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

interface WorkspaceProps {
  initialInvoices: Invoice[];
  currencyExposure: Record<string, number>;
}

export default function AnalyticsWorkspace({ initialInvoices, currencyExposure }: WorkspaceProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);

  // Live WebSocket FX Tick Tracker State
  const [fxTicks, setFxTicks] = useState<{ EUR: number; GBP: number }>({ EUR: 1.08, GBP: 1.27 });
  const [wsConnected, setWsConnected] = useState(false);

  // Advanced Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');

  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  // Connect to the live FX rate WebSocket stream on mount
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080/api/ws/fx-rates');

    socket.onopen = () => setWsConnected(true);
    socket.onclose = () => setWsConnected(false);
    socket.onerror = () => setWsConnected(false);
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.rates?.EUR && payload?.rates?.GBP) {
          setFxTicks({ EUR: payload.rates.EUR, GBP: payload.rates.GBP });
        }
      } catch {
        // Ignore malformed frames
      }
    };

    return () => socket.close();
  }, []);

  const [form, setForm] = useState({
    invoiceNumber: '',
    senderCompany: '',
    recipientCompany: '',
    amount: '',
    currency: 'USD',
    status: 'pending',
    dueDate: '',
  });

  // Client-Side Search and Filter Logic
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.senderCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.recipientCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      const matchesCurrency = currencyFilter === 'all' || inv.currency === currencyFilter;

      return matchesSearch && matchesStatus && matchesCurrency;
    });
  }, [invoices, searchTerm, statusFilter, currencyFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const temporaryID = `TEMP-${Date.now()}`;
    const newInvoiceItem: Invoice = {
      id: temporaryID,
      invoiceNumber: form.invoiceNumber,
      senderCompany: form.senderCompany,
      recipientCompany: form.recipientCompany,
      amount: parseFloat(form.amount) || 0,
      currency: form.currency,
      status: form.status,
      dueDate: form.dueDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    setInvoices(prev => [newInvoiceItem, ...prev]);
    setIsOpen(false);

    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      const res = await fetch('http://localhost:8080/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_AUTH_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Submission refused by ledger kernel');

      setForm({ invoiceNumber: '', senderCompany: '', recipientCompany: '', amount: '', currency: 'USD', status: 'pending', dueDate: '' });
      setTimeout(() => { router.refresh(); }, 400);
    } catch (err) {
      alert('Failed to log transaction');
      setInvoices(initialInvoices);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to prune this transaction line from the live database ledger?')) return;

    // Optimistic Delete: instantly wipe from layout list
    const originalState = [...invoices];
    setInvoices(prev => prev.filter(inv => inv.id !== id));

    try {
      const res = await fetch(`http://localhost:8080/api/invoices?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${API_AUTH_TOKEN}` },
      });

      if (!res.ok) throw new Error('Delete call rejected by backend cluster');
      setTimeout(() => { router.refresh(); }, 400);
    } catch (err) {
      alert('Failed to delete transaction line item');
      setInvoices(originalState);
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Spot Market Ticker Panel */}
      <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${wsConnected ? 'text-emerald-500 animate-pulse' : 'text-slate-300 dark:text-slate-700'}`} />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {wsConnected ? 'Live FX Spot Network Connected' : 'Connecting Market Spot Stream...'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
          <span>EUR/USD: <span className="text-indigo-500">{fxTicks.EUR.toFixed(4)}</span></span>
          <span>GBP/USD: <span className="text-indigo-500">{fxTicks.GBP.toFixed(4)}</span></span>
        </div>
      </div>

      {/* Workspace Action Controller Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-indigo-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Active Invoices Ledger</h2>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" /> Add New Invoice
        </button>
      </div>

      {/* Raw Exposures Row Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(currencyExposure).map(([code, vol]) => (
          <div key={code} className="p-5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-900 flex flex-col space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{code} Asset Pool</span>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
              {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(vol)}
            </p>
          </div>
        ))}
      </div>

      {/* Advanced Filter Deck Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ledger entities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid Only</option>
            <option value="pending">Pending Only</option>
            <option value="overdue">Overdue Only</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Currencies</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
      </div>

      {/* Itemized Database Ledger Table Row Viewer */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="p-4">Invoice ID</th>
                <th className="p-4">Sender / Recipient</th>
                <th className="p-4">Value</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition-colors">
                  <td className="p-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>{inv.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{inv.senderCompany}</p>
                    <p className="text-xs text-slate-400">{inv.recipientCompany}</p>
                  </td>
                  <td className="p-4 font-medium text-slate-900 dark:text-white">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: inv.currency }).format(inv.amount)}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                      inv.status === 'pending' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                      'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <a
                      href={`http://localhost:8080/api/invoices/download?id=${inv.id}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </a>
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="inline-flex items-center justify-center p-1.5 border border-transparent text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                      title="Prune Record Line"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    Zero ledger items correspond to active query constraints.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Overlay Dialog Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Record Transaction Ledger Parameters</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Invoice ID Target</label>
                  <input required type="text" placeholder="INV-2026-X" value={form.invoiceNumber} onChange={e => setForm({...form, invoiceNumber: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Maturity Date Limit</label>
                  <input required type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Sender Corporate Entity</label>
                <input required type="text" placeholder="Sender Name Ltd" value={form.senderCompany} onChange={e => setForm({...form, senderCompany: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Recipient Corporate Entity</label>
                <input required type="text" placeholder="Recipient Clearing Inc" value={form.recipientCompany} onChange={e => setForm({...form, recipientCompany: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Contract Face Amount</label>
                  <input required type="number" step="0.01" min="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Asset Class</label>
                  <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Settlement Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white">
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50">{isSubmitting ? 'Writing to Neon...' : 'Commit Row'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
