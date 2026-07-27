package services

import (
	"fmt"
	"io"
	"time"

	"github.com/go-pdf/fpdf"
)

// InvoiceData structures the information pulled from the database for the PDF rendering engine
type InvoiceData struct {
	InvoiceNumber string
	ClientEmail   string
	Description   string
	Amount        float64
	Currency      string
	ExchangeRate  float64
	BaseAmount    float64
	BaseCurrency  string
	Date          time.Time
}

// GenerateInvoicePDF constructs a professional invoice layout directly into a data stream writer
func GenerateInvoicePDF(w io.Writer, data InvoiceData) error {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// 1. Header & Title Block
	pdf.SetFont("Arial", "B", 24)
	pdf.SetTextColor(44, 62, 80) // Sleek slate grey
	pdf.CellFormat(0, 15, "CROSS-BORDER LEDGER INC.", "0", 1, "L", false, 0, "")

	pdf.SetFont("Arial", "I", 10)
	pdf.SetTextColor(127, 140, 141)
	pdf.CellFormat(0, 5, "Automated Fintech Compliance Engine", "0", 1, "L", false, 0, "")
	pdf.Ln(10)

	// Horizontal Rule Accent Line
	pdf.SetDrawColor(52, 152, 219) // Blue highlight accent
	pdf.SetLineWidth(0.5)
	pdf.Line(10, pdf.GetY(), 200, pdf.GetY())
	pdf.Ln(10)

	// 2. Invoice Meta Metadata Block
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(44, 62, 80)
	pdf.CellFormat(100, 7, fmt.Sprintf("Invoice Target: %s", data.ClientEmail), "0", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 11)
	pdf.CellFormat(0, 7, fmt.Sprintf("Invoice Ref: #%s", data.InvoiceNumber), "0", 1, "R", false, 0, "")
	pdf.CellFormat(0, 7, fmt.Sprintf("Date Generated: %s", data.Date.Format("2006-01-02")), "0", 1, "R", false, 0, "")
	pdf.Ln(15)

	// 3. Ledger Line Item Table Header
	pdf.SetFillColor(245, 247, 250) // Light grey table header fill
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(100, 10, "Transaction Description", "1", 0, "L", true, 0, "")
	pdf.CellFormat(45, 10, "Original Amount", "1", 0, "C", true, 0, "")
	pdf.CellFormat(45, 10, fmt.Sprintf("Normalized (%s)", data.BaseCurrency), "1", 1, "C", true, 0, "")

	// 4. Ledger Data Rows
	pdf.SetFont("Arial", "", 11)
	pdf.CellFormat(100, 12, " "+data.Description, "1", 0, "L", false, 0, "")
	pdf.CellFormat(45, 12, fmt.Sprintf("%.2f %s", data.Amount, data.Currency), "1", 0, "C", false, 0, "")
	pdf.CellFormat(45, 12, fmt.Sprintf("%.2f %s", data.BaseAmount, data.BaseCurrency), "1", 1, "C", false, 0, "")
	pdf.Ln(5)

	// 5. Compliance & Currency Audit Details
	pdf.SetFont("Arial", "I", 9)
	pdf.SetTextColor(127, 140, 141)
	pdf.CellFormat(0, 6, fmt.Sprintf("* Foreign Exchange audit index captured at runtime: 1 %s = %.6f %s", data.Currency, data.ExchangeRate, data.BaseCurrency), "0", 1, "L", false, 0, "")
	pdf.Ln(30)

	// 6. Professional Footer Statement
	pdf.SetFont("Arial", "B", 10)
	pdf.SetTextColor(52, 152, 219)
	pdf.CellFormat(0, 10, "Thank you for your international business collaboration.", "0", 1, "C", false, 0, "")

	return pdf.Output(w)
}
