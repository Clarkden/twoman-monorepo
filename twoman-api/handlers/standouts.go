package handlers

import (
	"log"
	"net/http"
	"strconv"
	"twoman/globals"
	"twoman/handlers/helpers/standouts"
	"twoman/handlers/response"
	"twoman/types"
)

const (
	MAX_STANDOUTS_LIMIT = 5
)

// HandleGetUserStarBalance returns the current star balance for authenticated user
func (h Handler) HandleGetUserStarBalance() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		balance, err := standouts.GetUserStarBalance(session.UserID, h.DB(r))
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

		duoStandouts, err := standouts.GetDuoStandouts(session.UserID, MAX_STANDOUTS_LIMIT, h.DB(r), h.rdb)
		if err != nil {
			response.InternalServerError(w, err, "Failed to get duo standouts")
			return
		}

		log.Printf("Duo standouts retrieved successfully %d", len(duoStandouts))

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

		soloStandouts, err := standouts.GetSoloStandouts(session.UserID, limit, h.DB(r), h.rdb)
		if err != nil {
			response.InternalServerError(w, err, "Failed to get solo standouts")
			return
		}

		response.OKWithData(w, "Solo standouts retrieved successfully", map[string]interface{}{
			"solo_standouts": soloStandouts,
		})
	})
}
