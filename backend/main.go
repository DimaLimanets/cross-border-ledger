package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"cross-border-ledger/backend/src/services"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
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

type MonthlyTrend struct {
	Month     string  `json:"month"`
	VolumeUSD float64 `json:"volume_usd"`
	PaidUSD   float64 `json:"paid_usd"`
}

// Shared bearer token for the secured write/report routes, and the identity attached to audit rows
const SessionAuthToken = "ledger-reporting-session-token-v1-verified"
const FallbackAuditUser = "compliance-officer@crossborder-ledger.internal"

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// ensureAuditLogTable creates the audit trail table on startup if it doesn't already exist on Neon
func ensureAuditLogTable(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS invoice_audit_logs (
			id SERIAL PRIMARY KEY,
			invoice_id TEXT NOT NULL,
			action_type TEXT NOT NULL,
			performed_by TEXT NOT NULL,
			old_values JSONB,
			new_values JSONB,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`)
	return err
}

// WriteImmutableAuditLog records a snapshot of an invoice mutation for compliance tracking
func WriteImmutableAuditLog(db *sql.DB, invoiceID, actionType string, oldVal, newVal interface{}) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var oldJSON, newJSON []byte
	if oldVal != nil {
		oldJSON, _ = json.Marshal(oldVal)
	}
	if newVal != nil {
		newJSON, _ = json.Marshal(newVal)
	}

	query := `
		INSERT INTO invoice_audit_logs (invoice_id, action_type, performed_by, old_values, new_values)
		VALUES ($1, $2, $3, $4, $5);
	`
	_, err := db.ExecContext(ctx, query, invoiceID, actionType, FallbackAuditUser,
		sql.NullString{String: string(oldJSON), Valid: oldVal != nil},
		sql.NullString{String: string(newJSON), Valid: newVal != nil})

	if err != nil {
		log.Printf("AUDIT SYSTEM WARNING: Failed to record transaction lifecycle snapshot event: %v", err)
	}
}

// AuthRequiredMiddleware guards the write/report routes with a static bearer token check
func AuthRequiredMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Access token required to enter secure cross-border routing zone"})
			c.Abort()
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token != SessionAuthToken {
			c.JSON(http.StatusForbidden, gin.H{"error": "Crypto-signature or token sequence is invalid or expired"})
			c.Abort()
			return
		}
		c.Next()
	}
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

	if err := ensureAuditLogTable(db); err != nil {
		log.Fatalf("Failed to provision audit log table: %v", err)
	}

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

	// LIVE REAL-TIME FX EXCHANGE RATE WEBSOCKET STREAM
	r.GET("/api/ws/fx-rates", func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("WebSocket upgrade failed: %v", err)
			return
		}
		defer conn.Close()
		log.Println("📡 New FX rate tracking stream client connected via WebSocket")

		fxKey := viper.GetString("FX_API_KEY")
		ticker := time.NewTicker(4 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			var rateEUR, rateGBP float64 = 1.08, 1.27
			if fxKey != "" {
				if rEUR, err := services.FetchLiveRate(fxKey, "EUR"); err == nil && rEUR > 0 {
					rateEUR = 1.0 / rEUR
				}
				if rGBP, err := services.FetchLiveRate(fxKey, "GBP"); err == nil && rGBP > 0 {
					rateGBP = 1.0 / rGBP
				}
			}

			payload := map[string]interface{}{
				"timestamp": time.Now().Format(time.RFC3339),
				"base":      "USD",
				"rates": map[string]float64{
					"USD": 1.0,
					"EUR": rateEUR,
					"GBP": rateGBP,
				},
			}

			if err := conn.WriteJSON(payload); err != nil {
				log.Println("WebSocket write failed, closing connection")
				return
			}
		}
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

	// 5. AUTOMATED LIVE DYNAMIC PDF INVOICE STREAM DOWNLOAD ENGINE (Upgraded with Live FX API Integration)
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

		// 3. RUNTIME EXCHANGE RATE CROSS-BORDER ROUTER (Upgraded to Live API Ingestion)
		fxKey := viper.GetString("FX_API_KEY")

		// Fallback to our previous safe benchmarks if the configuration key is missing or blank
		var rate float64 = 1.00
		var fxErr error

		if fxKey != "" {
			log.Printf("Querying live FX indexes for currency settlement: %s", inv.Currency)
			rate, fxErr = services.FetchLiveRate(fxKey, inv.Currency)
			if fxErr != nil {
				log.Printf("Warning: Live FX fetch failed, resorting to structural defaults: %v", fxErr)
				// Re-assign default matrix configurations if API falls over mid-flight
				switch inv.Currency {
				case "EUR":
					rate = 1.485
				case "GBP":
					rate = 1.762
				case "USD":
					rate = 1.374
				default:
					rate = 1.000
				}
			}
		} else {
			log.Println("Notice: FX_API_KEY not supplied. Enforcing hardcoded parameters.")
			switch inv.Currency {
			case "EUR":
				rate = 1.485
			case "GBP":
				rate = 1.762
			case "USD":
				rate = 1.374
			default:
				rate = 1.000
			}
		}

		// Calculate total base ledger parameters dynamically using real-market metrics
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

	// SECURE ZONE - writes and reports require a valid bearer token and are audit-logged
	secureAPI := r.Group("/api")
	secureAPI.Use(AuthRequiredMiddleware())

	// 4. INBOUND TRANSACTION LEDGER ADDITION ENDPOINT
	secureAPI.POST("/invoices", func(c *gin.Context) {
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

		WriteImmutableAuditLog(db, newID, "CREATED", nil, createdInvoice)

		c.JSON(http.StatusCreated, createdInvoice)
	})

	// 5. LEDGER RECORD PRUNING CONTROL ENDPOINT (Week 12 Upgrade)
	secureAPI.DELETE("/invoices", func(c *gin.Context) {
		invoiceID := c.Query("id")
		if invoiceID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing mandatory URL query parameter 'id'"})
			return
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), 4*time.Second)
		defer cancel()

		// Snapshot the row before deletion so the audit trail retains what was removed
		var deletedInvoice Invoice
		_ = db.QueryRowContext(ctx, "SELECT id, invoice_number, sender_company, recipient_company, amount, currency, status, due_date, created_at FROM invoices WHERE id = $1", invoiceID).
			Scan(&deletedInvoice.ID, &deletedInvoice.InvoiceNumber, &deletedInvoice.SenderCompany, &deletedInvoice.RecipientCompany, &deletedInvoice.Amount, &deletedInvoice.Currency, &deletedInvoice.Status, &deletedInvoice.DueDate, &deletedInvoice.CreatedAt)

		result, err := db.ExecContext(ctx, "DELETE FROM invoices WHERE id = $1", invoiceID)
		if err != nil {
			log.Printf("Failed to execute database deletion query: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete record from ledger database"})
			return
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil || rowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "No transaction row found matching the specified id"})
			return
		}

		WriteImmutableAuditLog(db, invoiceID, "PRUNED", deletedInvoice, nil)

		c.JSON(http.StatusOK, gin.H{"message": "Transaction row purged from ledger database"})
	})

	// 6. FINANCIAL ANALYTICS TICKERS ENGINE ENDPOINT (Week 10 - Normalized FX Upgrade)
	secureAPI.GET("/analytics", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()

		// 1. Fetch raw transaction amounts grouped by currency and status
		rows, err := db.QueryContext(ctx, `
			SELECT currency, status, COALESCE(SUM(amount), 0)
			FROM invoices
			WHERE created_at >= NOW() - INTERVAL '365 days'
			GROUP BY currency, status
		`)
		if err != nil {
			log.Printf("Analytics query extraction failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to compile financial ledger row data"})
			return
		}
		defer rows.Close()

		var totalVolUSD, openARUSD, paidVolUSD float64
		currencyExposure := make(map[string]float64)

		fxKey := viper.GetString("FX_API_KEY")

		// 2. Process records and normalize values to USD dynamically using Week 9 API matrix
		for rows.Next() {
			var currency, status string
			var amount float64
			if err := rows.Scan(&currency, &status, &amount); err != nil {
				log.Printf("Row scan failure in analytics engine: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process ledger row data"})
				return
			}

			// Keep a clean track of raw structural totals per currency code
			currencyExposure[currency] += amount

			// Determine FX Conversion Rate to target USD base reporting
			var rateToUSD float64 = 1.0
			if currency != "USD" && fxKey != "" {
				// Query live spot market configurations using Week 9 service script
				rate, err := services.FetchLiveRate(fxKey, currency)
				if err == nil && rate > 0 {
					// FetchLiveRate returns base to target currency.
					// Calculate Inverse conversion scalar to transform asset to USD
					rateToUSD = 1.0 / rate
				} else {
					log.Printf("Warning: Live FX conversion fell back to core parameters for: %s", currency)
					switch currency {
					case "EUR":
						rate = 1.08 // standard corporate baseline approximation standard
					case "GBP":
						rate = 1.27
					default:
						rate = 1.0
					}
					rateToUSD = rate
				}
			} else if currency != "USD" {
				// Static fallback conditions if FX environment key context is missing
				switch currency {
				case "EUR":
					rateToUSD = 1.08
				case "GBP":
					rateToUSD = 1.27
				}
			}

			amountInUSD := amount * rateToUSD

			// Aggregate values into unified USD metric tiers
			totalVolUSD += amountInUSD
			if status != "paid" {
				openARUSD += amountInUSD
			} else {
				paidVolUSD += amountInUSD
			}
		}

		// 3. Secure safe calculation ratios
		collectionRate := 0.0
		if totalVolUSD > 0 {
			collectionRate = (paidVolUSD / totalVolUSD) * 100
		}

		// 4. Query month-over-month volume/paid totals (grouped by due date) for the trend chart
		trendRows, err := db.QueryContext(ctx, `
			SELECT TO_CHAR(due_date, 'YYYY-MM') AS invoice_month, currency,
			       COALESCE(SUM(amount), 0) AS total_amount,
			       COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid_amount
			FROM invoices
			WHERE created_at >= NOW() - INTERVAL '365 days'
			GROUP BY invoice_month, currency
			ORDER BY invoice_month ASC
		`)
		if err != nil {
			log.Printf("Trend query extraction failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to compile monthly trend row data"})
			return
		}
		defer trendRows.Close()

		trendMap := make(map[string]*MonthlyTrend)
		var orderedMonths []string

		for trendRows.Next() {
			var month, currency string
			var totalAmt, paidAmt float64
			if err := trendRows.Scan(&month, &currency, &totalAmt, &paidAmt); err != nil {
				log.Printf("Trend row scan failure: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process monthly trend row data"})
				return
			}

			var rateToUSD float64 = 1.0
			switch currency {
			case "EUR":
				rateToUSD = 1.08
			case "GBP":
				rateToUSD = 1.27
			}

			if _, exists := trendMap[month]; !exists {
				trendMap[month] = &MonthlyTrend{Month: month}
				orderedMonths = append(orderedMonths, month)
			}
			trendMap[month].VolumeUSD += totalAmt * rateToUSD
			trendMap[month].PaidUSD += paidAmt * rateToUSD
		}

		monthlyTrends := []MonthlyTrend{}
		for _, month := range orderedMonths {
			monthlyTrends = append(monthlyTrends, *trendMap[month])
		}

		c.JSON(http.StatusOK, gin.H{
			"total_volume":      totalVolUSD,
			"outstanding_ar":    openARUSD,
			"collection_rate":   collectionRate,
			"currency_exposure": currencyExposure,
			"monthly_trends":    monthlyTrends,
		})
	})

	// 6. Launch the Server Live
	log.Printf("Gin web server initializing on http://localhost:%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to run HTTP server: %v", err)
	}
}
