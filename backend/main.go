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

	// 4. Initialize the Gin Engine Router
	r := gin.Default()

	// 5. Build our baseline health route using Gin context
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"message": "Cross-Border Gin Backend Engine is active and operational",
		})
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
