package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"
	"twoman/globals"
	"twoman/handlers/helpers/auth"
	"twoman/handlers/helpers/user"
	"twoman/handlers/response"
	"twoman/schemas"
	"twoman/types"

	"github.com/hashicorp/go-version"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

func (h Handler) HandleAppleAuth() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {
		default:
			var req types.AppleAuthRequest
			err := json.NewDecoder(r.Body).Decode(&req)

			if err != nil {
				log.Println("Apple Auth: ", err)
				response.BadRequest(w, "Invalid request")
				return
			}

			identity, err := auth.DecodeAppleIdentityToken(req.IdentityToken)

			if err != nil {
				log.Println("Apple Auth: ", err)
				response.BadRequest(w, "Invalid identity token")
				return
			}

			// Verify that the UserID in the request matches the one in the identity token
			if identity.Sub != req.UserID {
				log.Println("Apple Auth: UserID mismatch")
				response.BadRequest(w, "Invalid user ID")
				return
			}

			userRecord, err := user.FindUserByAppleID(req.UserID, h.DB(r))

			if err != nil {
				log.Println("Apple Auth: ", err)
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			if userRecord == nil || userRecord.ID == 0 {
				userRecord, err = user.CreateUserWithAppleID(req.UserID, req.Email, h.DB(r))

				if err != nil {
					log.Println("Apple Auth: ", err)
					response.InternalServerError(w, err, "Something went wrong")
					return
				}
			} else {
				// Update email if it has changed
				if userRecord.Email != req.Email {
					userRecord.Email = req.Email
					if err := h.DB(r).Save(userRecord).Error; err != nil {
						log.Println("Apple Auth: Failed to update email: ", err)
						// Continue without returning, as this is not a critical error
					}
				}
			}

			if userRecord.ID == 0 {

				log.Println("Apple Auth: User record not created")

				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			sessionToken, refreshToken, err := auth.CreateAuthToken(r.Context(), userRecord.ID, h.rdb, userRecord.Type)

			if err != nil {
				log.Println("Apple Auth: ", err)
				response.InternalServerError(w, err, "Something went wrong")
				return
			}
			response.OKWithData(w, "OK", map[string]any{
				"session_token": sessionToken,
				"refresh_token": refreshToken,
				"user_id":       userRecord.ID,
			})
			return
		}
	})
}

func (h Handler) HandleCheckSession() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			// Extract the token from the Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				response.Unauthorized(w, "Missing authorization header")
				return
			}

			// The token should be in the format "Bearer <token>"
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				response.Unauthorized(w, "Invalid authorization header")
				return
			}

			token := parts[1]

			// Validate the session token
			session, err := auth.GetSessionByToken(r.Context(), token, h.rdb)
			if err != nil {
				log.Println("Check Session: ", err)
				response.Unauthorized(w, "Invalid session")
				return
			}

			userRecord, err := user.GetUserByID(session.UserID, h.DB(r))

			if err != nil {
				log.Println("Check Session: ", err)
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			if userRecord == nil {
				log.Println("Check Session: User not found")
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			if userRecord.ID == 0 {
				log.Println("Check Session: User ID is 0")
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			// Check if the session has expired
			if time.Now().After(session.Expiration) {
				response.Unauthorized(w, "Session expired")
				return
			}

			// If we've reached here, the session is valid
			// Note: Session is already extended in AuthMiddleware, but we could add additional logic here if needed
			response.OK(w, "Session valid")
		}
	})
}

func (h Handler) HandleRefreshToken() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		clientVersion := r.Header.Get("X-Client-Version")

		v, err := version.NewVersion(clientVersion)
		if err != nil {
			log.Println("Invalid client version:", err)
			response.BadRequest(w, "Invalid client version")
			return
		}

		v082, _ := version.NewVersion("0.8.2")

		if v.GreaterThanOrEqual(v082) {
			var req struct {
				RefreshToken string `json:"refresh_token"`
			}

			err := json.NewDecoder(r.Body).Decode(&req)
			if err != nil {
				log.Println("Refresh Token: ", err)
				response.BadRequest(w, "Invalid request")
				return
			}

			userType := ""

			if h.DB(r) == h.liveDB {
				userType = "live"
			} else {
				userType = "demo"
			}

			// Validate the refresh token and get a new session token
			newSessionToken, newRefreshToken, err := auth.RefreshToken(r.Context(), req.RefreshToken, h.rdb, userType)
			if err != nil {
				log.Println("Refresh Token: ", err)
				response.Unauthorized(w, "Invalid refresh token")
				return
			}

			// Get the session details to retrieve the user ID
			session, err := auth.GetSessionByToken(r.Context(), newSessionToken, h.rdb)
			if err != nil {
				log.Println("Refresh Token: Failed to get session details: ", err)
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			response.OKWithData(w, "OK", map[string]interface{}{
				"session_token": newSessionToken,
				"refresh_token": newRefreshToken,
				"user_id":       session.UserID,
			})
			return
		}

		var req struct {
			RefreshToken string `json:"refresh_token"`
		}

		err = json.NewDecoder(r.Body).Decode(&req)
		if err != nil {
			log.Println("Refresh Token: ", err)
			response.BadRequest(w, "Invalid request")
			return
		}

		userType := ""

		if h.DB(r) == h.liveDB {
			userType = "live"
		} else {
			userType = "demo"
		}

		// Validate the refresh token and get a new session token
		newSessionToken, newRefreshToken, err := auth.RefreshToken(r.Context(), req.RefreshToken, h.rdb, userType)
		if err != nil {
			log.Println("Refresh Token: ", err)
			response.Unauthorized(w, "Invalid refresh token")
			return
		}

		// Get the session details to retrieve the user ID
		session, err := auth.GetSessionByToken(r.Context(), newSessionToken, h.rdb)
		if err != nil {
			log.Println("Refresh Token: Failed to get session details: ", err)
			response.InternalServerError(w, err, "Something went wrong")
			return
		}

		response.OKWithData(w, "OK", map[string]interface{}{
			"token":         newSessionToken,
			"refresh_token": newRefreshToken,
			"user_id":       session.UserID,
		})
	})
}

func (h Handler) HandlePhoneAuth() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:
			// TODO: Implement sms flag check

			var req types.PhoneAuthRequest
			err := json.NewDecoder(r.Body).Decode(&req)

			if err != nil {
				response.BadRequest(w, "Invalid request")
				return
			}

			if req.PhoneNumber == "" {
				response.BadRequest(w, "Phone number is required")
				return
			}

			var db *gorm.DB
			var userRecord *schemas.User

			userRecord, err = user.GetUserByPhoneNumber(req.PhoneNumber, h.liveDB)
			if err != nil {
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			if userRecord == nil {
				userRecord, err = user.GetUserByPhoneNumber(req.PhoneNumber, h.demoDB)
				if err != nil {
					response.InternalServerError(w, err, "Something went wrong")
					return
				}
			}

			if userRecord == nil || userRecord.ID == 0 {
				// Use liveDB for creating new users
				db = h.liveDB
				userRecord, err = user.CreateUserWithPhoneNumber(req.PhoneNumber, false, db)

				if err != nil {
					response.InternalServerError(w, err, "Something went wrong")
					return
				}
			}

			if userRecord.Type == "live" {
				db = h.liveDB
			} else {
				db = h.demoDB
			}

			if userRecord.ID == 0 {
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			isDemoNumber, err := auth.IsDemoNumber(req.PhoneNumber, db)

			if err != nil {
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			if isDemoNumber {
				response.OK(w, "OK")
				return
			}

			err = auth.SendVerifyCode(req.PhoneNumber, h.tw)
			if err != nil {
				response.InternalServerError(w, err, "Could not send verify code")
				return
			}

			response.OK(w, "OK")
		}
	})
}

func (h Handler) HandlePhoneVerify() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			// TODO: Implement sms flag check

			var req types.VerifyOTPRequest
			err := json.NewDecoder(r.Body).Decode(&req)

			if err != nil {
				log.Println("Invalid verify request")
				response.BadRequest(w, "Invalid request")
				return
			}

			if req.PhoneNumber == "" || req.Code == "" {
				log.Println("Phone or code empty")
				response.BadRequest(w, "Phone number and code are required")
				return
			}

			isDemoNumber := false

			if !isDemoNumber {
				isDemoNumber, err = auth.IsDemoNumber(req.PhoneNumber, h.demoDB)
				if err != nil {
					response.InternalServerError(w, err, "Something went wrong")
					return
				}
			}

			if isDemoNumber {

				if req.Code == "000000" {

					userRecord, err := user.GetUserByPhoneNumber(req.PhoneNumber, h.demoDB)
					if err != nil {
						response.InternalServerError(w, err, "Something went wrong")
						return
					}

					if userRecord == nil {
						response.NotFound(w, "Could not find user")
						return
					}

					sessionToken, refreshToken, err := auth.CreateAuthToken(r.Context(), userRecord.ID, h.rdb, userRecord.Type)

					if err != nil {
						log.Println("internal server error: ", err)
						response.InternalServerError(w, err, "Something went wrong")
						return

					}

					response.OKWithData(w, "OK", map[string]interface{}{
						"session_token": sessionToken,
						"refresh_token": refreshToken,
						"user_id":       userRecord.ID,
					})
				} else {
					response.Unauthorized(w, "Invalid authorization code")
				}

				return
			}

			verified, err := auth.VerifyCode(req.Code, req.PhoneNumber, h.tw)

			if err != nil {
				log.Println("Invalid phone number or code")
				response.BadRequest(w, "Invalid phone number or code")
				return
			}

			if !verified {
				log.Println("Code is not valid")
				response.Unauthorized(w, "Code is not valid")
				return
			}

			userRecord, err := user.GetUserByPhoneNumber(req.PhoneNumber, h.liveDB)

			if err != nil {
				log.Println("Could not find user")
				response.NotFound(w, "User not found")
				return
			}

			sessionToken, refreshToken, err := auth.CreateAuthToken(r.Context(), userRecord.ID, h.rdb, userRecord.Type)

			if err != nil {
				log.Println("internal server error: ", err)
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			response.OKWithData(w, "OK", map[string]interface{}{
				"session_token": sessionToken,
				"refresh_token": refreshToken,
				"user_id":       userRecord.ID,
			})
		}
	})
}

func (h Handler) HandleGoogleAuth() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {
		default:
			var req types.GoogleAuthRequest
			err := json.NewDecoder(r.Body).Decode(&req)

			if err != nil {
				log.Println("Google Auth: ", err)
				response.BadRequest(w, "Invalid request")
				return
			}

			identity, err := auth.VerifyGoogleIdToken(req.IdToken)

			if err != nil {
				log.Println("Google Auth: ", err)
				response.BadRequest(w, "Invalid ID token")
				return
			}

			userRecord, err := user.FindUserByGoogleID(identity.Sub, h.DB(r))

			if err != nil {
				log.Println("Google Auth: ", err)
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			if userRecord == nil || userRecord.ID == 0 {
				userRecord, err = user.CreateUserWithGoogleID(identity.Sub, identity.Email, h.DB(r))

				if err != nil {
					log.Println("Google Auth: ", err)
					response.InternalServerError(w, err, "Something went wrong")
					return
				}
			} else {
				// Update email if it has changed
				if userRecord.Email != identity.Email {
					userRecord.Email = identity.Email
					if err := h.DB(r).Save(userRecord).Error; err != nil {
						log.Println("Google Auth: Failed to update email: ", err)
						// Continue without returning, as this is not a critical error
					}
				}
			}

			if userRecord.ID == 0 {
				log.Println("Google Auth: User record not created")
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			sessionToken, refreshToken, err := auth.CreateAuthToken(r.Context(), userRecord.ID, h.rdb, userRecord.Type)

			if err != nil {
				log.Println("Google Auth: ", err)
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			response.OKWithData(w, "OK", map[string]any{
				"session_token": sessionToken,
				"refresh_token": refreshToken,
				"user_id":       userRecord.ID,
			})
			return
		}
	})
}

func (h Handler) HandleLogout(rdb *redis.Client) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)
		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			err := auth.ClearSession(session.SessionID, rdb)
			if err != nil {
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			response.OK(w, "OK")
		}
	})
}

func (h Handler) HandleValidateSession(rdb *redis.Client) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)
		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			if session == nil {
				response.BadRequest(w, "Invalid session")
				return
			}

			foundUser, err := user.GetUserByID(session.UserID, h.DB(r))

			if err != nil {
				response.NotFound(w, err.Error())
				return
			}

			response.OKWithData(w, "successfully found self", foundUser)
		}
	})
}
