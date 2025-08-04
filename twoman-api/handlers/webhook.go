package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"twoman/handlers/helpers/subscription"
	"twoman/handlers/response"
	"twoman/schemas"

	"gorm.io/gorm"
)

func (h Handler) HandleRevenueCatWebhook() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		authorization := r.Header.Get("Authorization")
		if authorization == "" {
			log.Println("Missing Authorization header")
			response.Unauthorized(w, "Unauthorized")
			return
		}

		parts := strings.SplitN(authorization, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			log.Println("Invalid Authorization header format")
			response.Unauthorized(w, "Unauthorized")
			return
		}

		bearer := parts[1]

		if bearer != os.Getenv("REVENUE_CAT_WEBHOOK_SECRET") {
			log.Println("Invalid bearer token, expected: ", os.Getenv("REVENUE_CAT_WEBHOOK_SECRET"), " got: ", bearer)
			response.Unauthorized(w, "Unauthorized")
			return
		}

		var data map[string]any
		err := json.NewDecoder(r.Body).Decode(&data)

		if err != nil {
			response.BadRequest(w, "Invalid request")
			return
		}

		event, ok := data["event"].(map[string]any)
		if !ok {
			response.BadRequest(w, "Invalid event structure")
			return
		}

		eventType, ok := event["type"].(string)
		if !ok {
			response.BadRequest(w, "Invalid event type")
			return
		}

		userId, ok := event["app_user_id"].(string)
		if !ok {
			response.BadRequest(w, "Invalid user id")
			return
		}

		parsedUserId, err := strconv.ParseUint(userId, 10, 64)

		if err != nil {
			response.BadRequest(w, "Invalid user id")
			return
		}

		// Extract customer ID and product ID if available
		customerID := ""
		productID := ""

		if productIdentifier, ok := event["product_identifier"].(string); ok {
			productID = productIdentifier
		}
		if appUserID, ok := event["app_user_id"].(string); ok {
			customerID = appUserID
		}

		// Store RevenueCat customer ID for the user if not already stored
		if customerID != "" {
			err := storeRevenueCatCustomerID(uint(parsedUserId), customerID, h.liveDB)
			if err != nil {
				err = storeRevenueCatCustomerID(uint(parsedUserId), customerID, h.demoDB)
				if err != nil {
					log.Printf("Error storing RevenueCat customer ID: %v", err)
				}
			}
		}

		switch eventType {
		case "INITIAL_PURCHASE":
			log.Println("User", userId, "made an initial purchase")

			// Try live DB first
			err := subscription.UpgradeUserToProRevenueCat(uint(parsedUserId), customerID, productID, h.liveDB)
			if err != nil {
				// Try demo DB
				err = subscription.UpgradeUserToProRevenueCat(uint(parsedUserId), customerID, productID, h.demoDB)
				if err != nil {
					log.Println("Error upgrading user to pro:", err)
					response.InternalServerError(w, err, "Something went wrong")
					return
				}
			}

		case "RENEWAL":
			log.Println("User", userId, "renewed their subscription")

			// Try live DB first
			err := subscription.UpgradeUserToProRevenueCat(uint(parsedUserId), customerID, productID, h.liveDB)
			if err != nil {
				// Try demo DB
				err = subscription.UpgradeUserToProRevenueCat(uint(parsedUserId), customerID, productID, h.demoDB)
				if err != nil {
					log.Println("Error upgrading user to pro:", err)
					response.InternalServerError(w, err, "Something went wrong")
					return
				}
			}

		case "EXPIRATION":
			log.Println("User", userId, "subscription expired")

			// Try live DB first
			err := subscription.DowngradeUserFromPro(uint(parsedUserId), h.liveDB)
			if err != nil {
				// Try demo DB
				err = subscription.DowngradeUserFromPro(uint(parsedUserId), h.demoDB)
				if err != nil {
					log.Println("Error downgrading user from pro:", err)
					response.InternalServerError(w, err, "Something went wrong")
					return
				}
			}

		case "VIRTUAL_CURRENCY_TRANSACTION":
			log.Println("User", userId, "virtual currency transaction")

			// Handle virtual currency transactions (star purchases)
			err := handleVirtualCurrencyTransaction(event, uint(parsedUserId), h.liveDB)
			if err != nil {
				// Try demo DB
				err = handleVirtualCurrencyTransaction(event, uint(parsedUserId), h.demoDB)
				if err != nil {
					log.Println("Error handling virtual currency transaction:", err)
					response.InternalServerError(w, err, "Something went wrong")
					return
				}
			}

		case "NON_RENEWING_PURCHASE":
			// Handle non-renewing purchases (could be star purchases)
			log.Println("User", userId, "made a non-renewing purchase:", productID)

			// Check if this is a star purchase by product ID
			if isStarProduct(productID) {
				log.Println("Star purchase detected for user", userId)
				// The virtual currency webhook will handle the actual currency adjustment
				// This is just for logging/analytics
			}

		default:
			log.Println("Unknown event type:", eventType)

		}

		response.OK(w, "OK")
	})
}

// storeRevenueCatCustomerID stores the RevenueCat customer ID for a user
func storeRevenueCatCustomerID(userID uint, customerID string, db *gorm.DB) error {
	var user schemas.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		return err
	}

	// Only update if it's empty or different
	if user.RevenuecatCustomerID == "" || user.RevenuecatCustomerID != customerID {
		user.RevenuecatCustomerID = customerID
		return db.Save(&user).Error
	}

	return nil
}

// handleVirtualCurrencyTransaction processes virtual currency webhook events
func handleVirtualCurrencyTransaction(event map[string]any, userID uint, db *gorm.DB) error {
	// Extract adjustments from the event
	adjustments, ok := event["adjustments"].([]interface{})
	if !ok {
		log.Println("No adjustments found in virtual currency transaction")
		return nil
	}

	for _, adj := range adjustments {
		adjustment, ok := adj.(map[string]interface{})
		if !ok {
			continue
		}

		// Extract currency details
		currency, ok := adjustment["currency"].(map[string]interface{})
		if !ok {
			continue
		}

		currencyCode, ok := currency["code"].(string)
		if !ok || currencyCode != "STR" {
			continue // Only process STR (stars) currency
		}

		// Extract amount
		amountFloat, ok := adjustment["amount"].(float64)
		if !ok {
			continue
		}
		amount := int(amountFloat)

		// Extract transaction details
		virtualCurrencyTransactionID := ""
		if vcTxID, ok := event["virtual_currency_transaction_id"].(string); ok {
			virtualCurrencyTransactionID = vcTxID
		}

		productDisplayName := ""
		if pdn, ok := event["product_display_name"].(string); ok {
			productDisplayName = pdn
		}

		source := ""
		if src, ok := event["source"].(string); ok {
			source = src
		}

		// Record the transaction locally for audit purposes
		localTransaction := schemas.StarTransactions{
			UserID:          userID,
			Amount:          amount,
			TransactionType: "virtual_currency_webhook",
			Description:     fmt.Sprintf("RevenueCat virtual currency transaction: %s (source: %s, product: %s)", virtualCurrencyTransactionID, source, productDisplayName),
		}

		if err := db.Create(&localTransaction).Error; err != nil {
			log.Printf("Warning: Failed to record local star transaction: %v", err)
		}

		log.Printf("Processed virtual currency transaction for user %d: %+d STR (source: %s)", userID, amount, source)
	}

	return nil
}

// isStarProduct checks if a product ID corresponds to a star purchase
func isStarProduct(productID string) bool {
	// Check if the product ID matches known star products
	starProducts := []string{"stars_5", "stars_10", "stars_15"}
	for _, starProduct := range starProducts {
		if productID == starProduct {
			return true
		}
	}
	return false
}
