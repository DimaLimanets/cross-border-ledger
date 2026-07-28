'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, PlusCircle, FileText, Download } from 'lucide-react';

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

  // Add a local state tracker right inside your AnalyticsWorkspace component definition:
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);

  // Quick effect hook to sync client state when the server payload updates
  React.useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  // Local form tracking states
  const [form, setForm] = useState({
    invoiceNumber: '',
    senderCompany: '',
    recipientCompany: '',
    amount: '',
    currency: 'USD',
    status: 'pending',
    dueDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Format the exact invoice structure matching your database outputs
      const temporaryID = `TEMP-${Date.now()}`;
      const newInvoiceItem: Invoice = {
        id: temporaryID,
        invoiceNumber: form.invoiceNumber,
        senderCompany: form.senderCompany,
        recipientCompany: form.recipientCompany,
        amount: parseFloat(form.amount),
        currency: form.currency,
        status: form.status,
        dueDate: form.dueDate,
        createdAt: new Date().toISOString()
      };

      // 2. OPTIMISTIC UPDATE: Instantly inject the row into the UI view so the user sees it immediately
      setInvoices(prev => [newInvoiceItem, ...prev]);
      setIsOpen(false); // Close the form modal right away for snappy performance

      // 3. Dispatch the real payload to the Go backend cluster behind the scenes
      const payload = { ...form, amount: parseFloat(form.amount) };
      const res = await fetch('http://localhost:8080/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Submission refused by ledger kernel');

      // 4. Reset form values cleanly
      setForm({ invoiceNumber: '', senderCompany: '', recipientCompany: '', amount: '', currency: 'USD', status: 'pending', dueDate: '' });

      // 5. Trigger the server refresh to sync the top KPI analytics counters over the network
      router.refresh();
    } catch (err) {
      alert('Failed to log new transaction parameters to database node');
      // Revert back to original state if the database write physically fails
      setInvoices(initialInvoices);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Section Action Controller */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-indigo-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Multi-Currency & Active Invoices Ledger</h2>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition-all"
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
              {invoices.map((inv) => (
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
                  <td className="p-4 text-right">
                    <a
                      href={`http://localhost:8080/api/invoices/download?id=${inv.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Week 8 Form Overlay Dialog Modal */}
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