package revenuecat

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"twoman/schemas"

	"gorm.io/gorm"
)

type VirtualCurrencyBalance struct {
	Balance      int    `json:"balance"`
	CurrencyCode string `json:"currency_code"`
	Object       string `json:"object"`
}

type VirtualCurrencyResponse struct {
	Items    []VirtualCurrencyBalance `json:"items"`
	NextPage *string                  `json:"next_page"`
	Object   string                   `json:"object"`
	URL      string                   `json:"url"`
}

type VirtualCurrencyTransaction struct {
	Adjustments map[string]int `json:"adjustments"`
}

// GetUserStarBalance gets the user's star balance from RevenueCat
func GetUserStarBalance(userID uint, db *gorm.DB) (int, error) {
	// Get user's RevenueCat customer ID
	var user schemas.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		return 0, err
	}

	if user.RevenuecatCustomerID == "" {
		// User doesn't have RevenueCat customer ID yet, return 0
		return 0, nil
	}

	projectID := os.Getenv("REVENUECAT_PROJECT_ID")
	apiKey := os.Getenv("REVENUECAT_SECRET_KEY")
	
	if projectID == "" || apiKey == "" {
		return 0, errors.New("RevenueCat credentials not configured")
	}

	url := fmt.Sprintf("https://api.revenuecat.com/v2/projects/%s/customers/%s/virtual_currencies", projectID, user.RevenuecatCustomerID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return 0, err
	}
	
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("RevenueCat API error: %d", resp.StatusCode)
	}
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, err
	}
	
	var vcResponse VirtualCurrencyResponse
	if err := json.Unmarshal(body, &vcResponse); err != nil {
		return 0, err
	}
	
	// Find STR currency balance
	for _, item := range vcResponse.Items {
		if item.CurrencyCode == "STR" {
			return item.Balance, nil
		}
	}
	
	// No STR balance found, return 0
	return 0, nil
}

// UpdateUserStarBalance deducts stars from RevenueCat virtual currency
func UpdateUserStarBalance(userID uint, amount int, transactionType string, description string, db *gorm.DB) error {
	// Get user's RevenueCat customer ID
	var user schemas.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		return err
	}

	if user.RevenuecatCustomerID == "" {
		return errors.New("user does not have RevenueCat customer ID")
	}

	projectID := os.Getenv("REVENUECAT_PROJECT_ID")
	apiKey := os.Getenv("REVENUECAT_SECRET_KEY")
	
	if projectID == "" || apiKey == "" {
		return errors.New("RevenueCat credentials not configured")
	}

	// Only allow negative amounts (spending) for now
	if amount > 0 {
		return errors.New("use RevenueCat purchases to add stars")
	}

	url := fmt.Sprintf("https://api.revenuecat.com/v2/projects/%s/customers/%s/virtual_currencies/transactions", projectID, user.RevenuecatCustomerID)
	
	transaction := VirtualCurrencyTransaction{
		Adjustments: map[string]int{
			"STR": amount, // This will be negative for spending
		},
	}
	
	jsonData, err := json.Marshal(transaction)
	if err != nil {
		return err
	}
	
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("RevenueCat API error: %d - %s", resp.StatusCode, string(body))
	}
	
	// Record transaction locally for audit purposes
	localTransaction := schemas.StarTransactions{
		UserID:          userID,
		Amount:          amount,
		TransactionType: transactionType,
		Description:     description,
	}
	if err := db.Create(&localTransaction).Error; err != nil {
		// Log but don't fail - the RevenueCat transaction already succeeded
		fmt.Printf("Warning: Failed to record local star transaction: %v\n", err)
	}
	
	return nil
}