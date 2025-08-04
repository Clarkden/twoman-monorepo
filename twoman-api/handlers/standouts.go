package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"twoman/globals"
	"twoman/handlers/helpers/revenuecat"
	"twoman/handlers/helpers/standouts"
	"twoman/handlers/response"
	"twoman/types"
)

// HandleGetUserStarBalance returns the current star balance for authenticated user
func (h Handler) HandleGetUserStarBalance() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		balance, err := revenuecat.GetUserStarBalance(session.UserID, h.DB(r))
		if err != nil {
			response.InternalServerError(w, err, "Failed to get star balance")
			return
		}

		response.OKWithData(w, "Star balance retrieved successfully", map[string]interface{}{
			"balance": balance,
		})
	})
}

// HandleGetDuoStandouts returns top duo friend pairs with most matches
func (h Handler) HandleGetDuoStandouts() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		limit := 5

		duoStandouts, err := standouts.GetDuoStandouts(session.UserID, limit, h.DB(r))
		if err != nil {
			response.InternalServerError(w, err, "Failed to get duo standouts")
			return
		}

		response.OKWithData(w, "Duo standouts retrieved successfully", map[string]interface{}{
			"duo_standouts": duoStandouts,
		})
	})
}

// HandleGetSoloStandouts returns popular individual profiles
func (h Handler) HandleGetSoloStandouts() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		// Default limit to 5 solo standouts
		limit := 5
		if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
			if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 10 {
				limit = parsedLimit
			}
		}

		soloStandouts, err := standouts.GetSoloStandouts(session.UserID, limit, h.DB(r))
		if err != nil {
			response.InternalServerError(w, err, "Failed to get solo standouts")
			return
		}

		response.OKWithData(w, "Solo standouts retrieved successfully", map[string]interface{}{
			"solo_standouts": soloStandouts,
		})
	})
}

// HandleUpdateStarBalance allows admins to update user star balances (for purchases, bonuses, etc.)
func (h Handler) HandleUpdateStarBalance() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// This should be admin-only - add admin check here
		// For now, allowing any authenticated user for testing

		targetUserIDStr := r.PathValue("userId")
		targetUserID, err := strconv.ParseUint(targetUserIDStr, 10, 32)
		if err != nil {
			response.BadRequest(w, "Invalid user ID")
			return
		}

		var requestBody struct {
			Amount          int    `json:"amount"`
			TransactionType string `json:"transaction_type"`
			Description     string `json:"description"`
		}

		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			response.BadRequest(w, "Invalid request body")
			return
		}

		// Validate transaction type
		validTypes := map[string]bool{
			"purchase": true,
			"bonus":    true,
			"refund":   true,
		}
		if !validTypes[requestBody.TransactionType] {
			response.BadRequest(w, "Invalid transaction type")
			return
		}

		err = standouts.UpdateUserStarBalance(
			uint(targetUserID),
			requestBody.Amount,
			requestBody.TransactionType,
			requestBody.Description,
			h.DB(r),
		)

		if err != nil {
			response.InternalServerError(w, err, "Failed to update star balance")
			return
		}

		response.OK(w, "Star balance updated successfully")
	})
}
