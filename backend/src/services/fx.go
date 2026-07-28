package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// ExchangeRateResponse maps the JSON layout returned by ExchangeRate-API
type ExchangeRateResponse struct {
	Result          string             `json:"result"`
	BaseCode        string             `json:"base_code"`
	ConversionRates map[string]float64 `json:"conversion_rates"`
}

// FetchLiveRate queries the external API for the precise live valuation mapping to CAD base
func FetchLiveRate(apiKey string, fromCurrency string) (float64, error) {
	// If the transaction is already in our base currency, no network hop is needed
	if fromCurrency == "CAD" {
		return 1.0, nil
	}

	// FIX: Clean, explicit URL generation that bypasses Sprintf placeholder sequence mismatches
	url := "https://v6.exchangerate-api.com/v6/" + apiKey + "/latest/" + fromCurrency

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return 0, fmt.Errorf("network connection error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("FX provider returned bad status code: %d", resp.StatusCode)
	}

	var data ExchangeRateResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return 0, fmt.Errorf("failed to parse JSON response: %v", err)
	}

	// Pull out the conversion rate for our CAD corporate reporting baseline
	cadRate, exists := data.ConversionRates["CAD"]
	if !exists {
		return 0, fmt.Errorf("CAD target metric missing from currency payload pool")
	}

	return cadRate, nil
}
