package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"twoman/handlers/helpers/auth"
	"twoman/handlers/response"

	"github.com/redis/go-redis/v9"
)

func (h Handler) HandleCreateDevSession(rdb *redis.Client) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		if os.Getenv("ENVIRONMENT") == "production" {
			response.Forbidden(w, "forbidden")
			return
		}

		type DevSessionRequest struct {
			UserID uint `json:"user_id"`
		}

		var req DevSessionRequest
		err := json.NewDecoder(r.Body).Decode(&req)

		if err != nil {
			response.BadRequest(w, "invalid request")
			return
		}

		if req.UserID == 0 {
			response.BadRequest(w, "invalid request")
			return
		}

		sessionToken, _, err := auth.CreateAuthToken(r.Context(), req.UserID, rdb, "live")

		if err != nil {
			response.InternalServerError(w, err, "internal server error")
			return
		}

		type DevSessionResponse struct {
			Session string `json:"session"`
		}

		response.OKWithData(w, "OK", DevSessionResponse{
			Session: sessionToken,
		})
	})
}

func (h Handler) HandleDeleteDevSession(rdb *redis.Client) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		if os.Getenv("ENVIRONMENT") == "production" {
			response.Forbidden(w, "forbidden")
			return
		}

		type DevSessionRequest struct {
			Session string `json:"session"`
		}

		var req DevSessionRequest
		err := json.NewDecoder(r.Body).Decode(&req)

		if err != nil {
			response.BadRequest(w, "invalid request")
			return
		}

		if req.Session == "" {
			response.BadRequest(w, "invalid request")
			return
		}

		err = auth.ClearSession(req.Session, rdb)

		if err != nil {
			response.InternalServerError(w, err, "internal server error")
			return
		}

		response.OK(w, "OK")
	})
}
