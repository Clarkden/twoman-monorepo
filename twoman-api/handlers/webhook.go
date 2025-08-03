package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"twoman/handlers/helpers/subscription"
	"twoman/handlers/response"
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

		default:
			log.Println("Unknown event type:", eventType)

		}

		response.OK(w, "OK")
	})
}
