package main

import (
	"database/sql"
	"log"
	"net/http"
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

	// 5. Automated PDF Invoice Stream Download Engine
	r.GET("/api/invoices/download", func(c *gin.Context) {
		// Mock Data representing a cross-border transaction fetched from our PostgreSQL ledger
		mockInvoice := services.InvoiceData{
			InvoiceNumber: "INV-2026-001",
			ClientEmail:   "billing@american-client.com",
			Description:   "Senior Software Engineering Services Contract",
			Amount:        5000.00,
			Currency:      "USD",
			ExchangeRate:  1.382500,
			BaseAmount:    6912.50,
			BaseCurrency:  "CAD",
			Date:          time.Now(),
		}

		// Configure the browser headers to intercept this stream as a secure file attachment download
		c.Header("Content-Disposition", "attachment; filename=invoice_"+mockInvoice.InvoiceNumber+".pdf")
		c.Header("Content-Type", "application/pdf")

		// Stream the generated document bytes cleanly over HTTP in real-time
		err := services.GenerateInvoicePDF(c.Writer, mockInvoice)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate system document: " + err.Error()})
		}
	})

	// 6. Launch the Server Live
	log.Printf("Gin web server initializing on http://localhost:%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to run HTTP server: %v", err)
	}
}
