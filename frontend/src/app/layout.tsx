import React from 'react';
import './globals.css'; // Connects global Tailwind styles

export const metadata = {
  title: 'Cross-Border Fintech Ledger',
  description: 'Week 5 Monorepo Portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  );
}
