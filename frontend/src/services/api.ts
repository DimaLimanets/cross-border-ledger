// Resolves to http://localhost:8080 from your .env.local file
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Must match SessionAuthToken in backend/main.go — required on the secured write/report routes
export const API_AUTH_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || 'ledger-reporting-session-token-v1-verified';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  senderCompany: string;
  recipientCompany: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD';
  status: 'paid' | 'pending' | 'overdue';
}

export const ledgerApi = {
  /**
   * Fetches all transactions from the Go Postgres backend ledger
   */
  async getInvoices(): Promise<Invoice[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invoices`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch invoices: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      // Catches offline backend errors and passes a clean string to the UI
      console.error('Ledger network connection failure:', error);
      throw new Error(error.message || 'Unable to connect to the backend ledger service.');
    }
  },

  /**
   * Direct streaming pipe for your Week 4 Go live fpdf template download
   */
  getInvoiceDownloadUrl(invoiceId: string): string {
    return `${API_BASE_URL}/api/invoices/download?id=${invoiceId}`;
  }
};

