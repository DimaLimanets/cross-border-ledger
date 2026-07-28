package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"cross-border-ledger/backend/src/services"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq" // PostgreSQL driver
	"github.com/spf13/viper"
)

type Invoice struct {
	ID               string    `json:"id"`
	InvoiceNumber    string    `json:"invoiceNumber"`
	SenderCompany    string    `json:"senderCompany"`
	RecipientCompany string    `json:"recipientCompany"`
	Amount           float64   `json:"amount"`
	Currency         string    `json:"currency"`
	Status           string    `json:"status"`
	DueDate          time.Time `json:"dueDate"`
	CreatedAt        time.Time `json:"createdAt"`
}

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func main() {
	// 1. Initialize Viper to read your .env file
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()

	log.Println("Loading server configurations...")
	if err := viper.ReadInConfig(); err != nil {
		log.Println("Warning: No explicit .env file parsed, checking system environment variables")
	}

	// 2. Extract configurations safely
	port := viper.GetString("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := viper.GetString("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("FATAL: DATABASE_URL environment variable is missing or empty")
	}

	// 3. Connect and Ping the Neon Cloud Database
	log.Println("Connecting to Neon Cloud PostgreSQL instance...")
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Database drivers failed to open: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Cloud database ping verification failed: %v", err)
	}
	log.Println("🚀 Successfully connected to Neon Cloud PostgreSQL database!")

	// 4. Initialize the Gin Engine Router & Attach Middleware
	r := gin.Default()
	r.Use(CORSMiddleware()) // Attaches CORS rules universally to every endpoint

	// 5. Build our baseline health route using Gin context
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"message": "Cross-Border Gin Backend Engine is active and operational",
		})
	})

	// 3. LIVE DATABASE INVOICES STREAM DATA ENDPOINT
	r.GET("/api/invoices", func(c *gin.Context) {
		// Queries records dynamically directly out of Neon Cloud PostgreSQL
		rows, err := db.Query("SELECT id, invoice_number, sender_company, recipient_company, amount, currency, status, due_date, created_at FROM invoices ORDER BY created_at DESC")
		if err != nil {
			log.Printf("Database query compilation error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read records from active ledger database"})
			return
		}
		defer rows.Close()

		// Initialized as a blank array rather than a nil map to ensure clean empty array JSON serialization []
		invoices := []Invoice{}

		for rows.Next() {
			var inv Invoice
			err := rows.Scan(&inv.ID, &inv.InvoiceNumber, &inv.SenderCompany, &inv.RecipientCompany, &inv.Amount, &inv.Currency, &inv.Status, &inv.DueDate, &inv.CreatedAt)
			if err != nil {
				log.Printf("Row marshaling validation failure: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to serialize ledger records context models"})
				return
			}
			invoices = append(invoices, inv)
		}

		c.JSON(http.StatusOK, invoices)
	})

	// 5. AUTOMATED LIVE DYNAMIC PDF INVOICE STREAM DOWNLOAD ENGINE
	r.GET("/api/invoices/download", func(c *gin.Context) {
		// 1. Extract the unique tracking ID parameters from the frontend download link
		invoiceID := c.Query("id")
		if invoiceID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing mandatory URL query parameter 'id'"})
			return
		}

		// 2. Fetch row details directly from Neon Cloud PostgreSQL
		var inv Invoice
		err := db.QueryRow("SELECT id, invoice_number, sender_company, recipient_company, amount, currency, status, due_date, created_at FROM invoices WHERE id = $1", invoiceID).
			Scan(&inv.ID, &inv.InvoiceNumber, &inv.SenderCompany, &inv.RecipientCompany, &inv.Amount, &inv.Currency, &inv.Status, &inv.DueDate, &inv.CreatedAt)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "The specified invoice tracking ID was not found in the ledger database"})
			return
		} else if err != nil {
			log.Printf("Ledger tracking lookup database error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to look up record for document compilation"})
			return
		}

		// 3. Runtime Exchange Rate Cross-Border Router (Normalizing everything to a CAD corporate base)
		var rate float64 = 1.00
		switch inv.Currency {
		case "EUR":
			rate = 1.485000
		case "GBP":
			rate = 1.762000
		case "USD":
			rate = 1.374000
		default:
			rate = 1.000000 // Falls back to standard 1:1 ratio if transaction is native
		}

		// Calculate total base ledger parameters dynamically
		calculatedBaseAmount := inv.Amount * rate

		// 4. Map your live database rows directly into your custom FPDF template structure blocks
		liveInvoiceDoc := services.InvoiceData{
			InvoiceNumber: inv.InvoiceNumber,
			ClientEmail:   "finance@" + strings.ToLower(strings.ReplaceAll(inv.RecipientCompany, " ", "-")) + ".com",
			Description:   fmt.Sprintf("Cross-Border Settlement Contract: %s to %s", inv.SenderCompany, inv.RecipientCompany),
			Amount:        inv.Amount,
			Currency:      inv.Currency,
			ExchangeRate:  rate,
			BaseAmount:    calculatedBaseAmount,
			BaseCurrency:  "CAD", // Your localized corporate reporting framework currency base
			Date:          time.Now(),
		}

		// 5. Configure content headers to route the stream straight as an absolute PDF file asset attachment
		c.Header("Content-Disposition", "attachment; filename=invoice_"+liveInvoiceDoc.InvoiceNumber+".pdf")
		c.Header("Content-Type", "application/pdf")

		// 6. Stream the freshly generated document bytes over HTTP to the user in real-time
		err = services.GenerateInvoicePDF(c.Writer, liveInvoiceDoc)
		if err != nil {
			log.Printf("FPDF compilation engine worker failure: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete document streaming rendering path: " + err.Error()})
		}
	})

	// 4. INBOUND TRANSACTION LEDGER ADDITION ENDPOINT
	r.POST("/api/invoices", func(c *gin.Context) {
		// Temporary landing struct to parse parameters sent from the Next.js form
		type NewInvoiceInput struct {
			InvoiceNumber    string  `json:"invoiceNumber" binding:"required"`
			SenderCompany    string  `json:"senderCompany" binding:"required"`
			RecipientCompany string  `json:"recipientCompany" binding:"required"`
			Amount           float64 `json:"amount" binding:"required,gt=0"`
			Currency         string  `json:"currency" binding:"required"`
			Status           string  `json:"status" binding:"required"`
			DueDate          string  `json:"dueDate" binding:"required"` // Parsed as a string from the calendar input
		}

		var input NewInvoiceInput
		// Enforces validation checks and maps the JSON request body automatically
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload validation constraints: " + err.Error()})
			return
		}

		// Convert frontend calendar input string text into a strict transactional time object layout
		parsedDueDate, err := time.Parse("2006-01-02", input.DueDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date structural formatting. Enforce YYYY-MM-DD"})
			return
		}

		// Generate a simple dynamic pseudo-UUID tracking primary key
		newID := fmt.Sprintf("%d", time.Now().UnixNano())
		createdAt := time.Now()

		// Execute strict SQL command syntax parameters to persist ledger rows cleanly into Neon Postgres
		query := `
			INSERT INTO invoices (id, invoice_number, sender_company, recipient_company, amount, currency, status, due_date, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		`
		_, err = db.Exec(query, newID, input.InvoiceNumber, input.SenderCompany, input.RecipientCompany, input.Amount, input.Currency, input.Status, parsedDueDate, createdAt)
		if err != nil {
			log.Printf("Persistence write operation execution failure: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to persist transaction ledger record row entries"})
			return
		}

		// Build a response structure representing what was successfully written to the ledger database
		createdInvoice := Invoice{
			ID:               newID,
			InvoiceNumber:    input.InvoiceNumber,
			SenderCompany:    input.SenderCompany,
			RecipientCompany: input.RecipientCompany,
			Amount:           input.Amount,
			Currency:         input.Currency,
			Status:           input.Status,
			DueDate:          parsedDueDate,
			CreatedAt:        createdAt,
		}

		c.JSON(http.StatusCreated, createdInvoice)
	})

	// 6. Launch the Server Live
	log.Printf("Gin web server initializing on http://localhost:%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to run HTTP server: %v", err)
	}
}
