'use client';

import React, { useState } from 'react';
import { DownloadCloud, Globe, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  senderCompany: string;
  recipientCompany: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD';
  status: 'paid' | 'pending' | 'overdue';
}

const MOCK_INVOICES: Invoice[] = [
  { id: "1", invoiceNumber: "INV-2026-001", senderCompany: "Acme Logistics Ltd", recipientCompany: "Global Fintech Corp (US)", amount: 14250.00, currency: "EUR", status: "paid" },
  { id: "2", invoiceNumber: "INV-2026-002", senderCompany: "Toronto Trading Houses", recipientCompany: "London Capital Clearing", amount: 8900.50, currency: "GBP", status: "pending" },
  { id: "3", invoiceNumber: "INV-2026-003", senderCompany: "Pacific Rim Ventures", recipientCompany: "Alpha Digital Delaware", amount: 32000.00, currency: "USD", status: "overdue" }
];

export default function DashboardPage() {
  const [invoices] = useState<Invoice[]>(MOCK_INVOICES);

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
          <p className="text-sm text-slate-500">Week 5 Portal • Unified Interface Live</p>
        </div>
      </header>

      <section className="max-w-7xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
            {invoices.map((inv) => (
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
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
