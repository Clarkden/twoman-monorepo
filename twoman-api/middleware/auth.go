package middleware

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
	"twoman/globals"
	"twoman/handlers/helpers/admin"
	"twoman/handlers/helpers/auth"
	"twoman/handlers/response"
	"twoman/types"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// Provider returns a instance with an redis client and middleware functions.
type Provider struct {
	rdb    *redis.Client
	rlmdb  *redis.Client
	liveDB *gorm.DB
	demoDB *gorm.DB
}

func (mw Provider) DB(r *http.Request) *gorm.DB {
	ctxDB, ok := r.Context().Value(globals.DatabaseConnKey).(*gorm.DB)
	if ok && ctxDB != nil {
		return ctxDB
	}
	return mw.liveDB
}

// NewMiddlewareProvider initializes a new middleware provider
func NewMiddlewareProvider(rdb *redis.Client, rlmdb *redis.Client, liveDB, demoDB *gorm.DB) *Provider {
	return &Provider{rdb, rlmdb, liveDB, demoDB}
}

// RateLimitConfig holds the configuration for rate limiting
type RateLimitConfig struct {
	Requests int
	Per      time.Duration
}

/*
AuthMiddleware wraps an HTTP handler and restricts access to that endpoint if a valid session does not exist.

Sessions are stored in Redis with the following fields:

- UserID: uint

- SessionID: string

- Expiration: time.Time
*/
func (mw Provider) AuthMiddleware(next http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			log.Println("AuthMiddleware: Missing authorization header")
			response.Unauthorized(w, "Missing authorization header")
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			log.Println("AuthMiddleware: Invalid authorization header")
			response.Unauthorized(w, "Invalid authorization header")
			return
		}

		token := parts[1]

		session, err := auth.GetSessionByToken(r.Context(), token, mw.rdb)
		if err != nil {
			log.Println("AuthMiddleware: ", err)
			response.Unauthorized(w, "Invalid authorization token")
			return
		}

		if session.SessionID == "" {
			err := auth.ClearSession(token, mw.rdb)
			if err != nil {
				log.Println("AuthMiddleware: Failed to delete invalid session")
				response.InternalServerError(w, err, "Failed to delete invalid session")
				return
			}

			log.Println("AuthMiddleware: Session not found")
			response.NotFound(w, "Session not found")
			return
		}

		rateLimitConfig := RateLimitConfig{
			Requests: 100,
			Per:      time.Minute,
		}

		allowed, err := mw.rateLimit(r.Context(), session.UserID, rateLimitConfig)
		if err != nil {
			log.Println("AuthMiddleware: Failed to check rate limit")
			response.InternalServerError(w, err, "Failed to check rate limit")
			return
		}
		if !allowed {
			log.Println("AuthMiddleware: Rate limit exceeded")
			response.TooManyRequests(w, "Rate limit exceeded")
			return
		}

		ctx := context.WithValue(r.Context(), globals.SessionMiddlewareKey, session)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

func (mw Provider) rateLimit(ctx context.Context, userID uint, config RateLimitConfig) (bool, error) {
	key := fmt.Sprintf("rate_limit:%d", userID)
	now := time.Now().UnixNano()
	windowStart := now - config.Per.Nanoseconds()

	pipe := mw.rlmdb.Pipeline()
	pipe.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%d", windowStart))
	pipe.ZAdd(ctx, key, redis.Z{Score: float64(now), Member: now})
	pipe.ZCard(ctx, key)
	pipe.Expire(ctx, key, config.Per)

	cmders, err := pipe.Exec(ctx)
	if err != nil {
		return false, err
	}

	requestCount := cmders[2].(*redis.IntCmd).Val()
	return requestCount <= int64(config.Requests), nil
}

func (mw Provider) AdminAuthMiddleware(next http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			log.Println("AdminAuthMiddleware: Missing authorization header")
			response.Unauthorized(w, "Missing authorization header")
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			log.Println("AdminAuthMiddleware: Invalid authorization header")
			response.Unauthorized(w, "Invalid authorization header")
			return
		}

		type AdminSession struct {
			AdminID uint
		}

		token := parts[1]

		jsonData, err := mw.rdb.Get(r.Context(), fmt.Sprintf("admin:%s", token)).Result()
		if err == redis.Nil {
			log.Println("AdminAuthMiddleware: Admin session not found")
			response.Unauthorized(w, "Invalid or expired admin session")
			return
		} else if err != nil {
			log.Println("AdminAuthMiddleware: Error fetching admin session:", err)
			response.InternalServerError(w, err, "Error processing admin session")
			return
		}

		var adminSession AdminSession
		err = json.Unmarshal([]byte(jsonData), &adminSession)
		if err != nil {
			log.Println("AdminAuthMiddleware: Error unmarshalling admin session:", err)
			response.InternalServerError(w, err, "Error processing admin session")
			return
		}

		_, err = admin.GetAdminByID(adminSession.AdminID, mw.DB(r))
		if err != nil {
			log.Println("Could not find admin by ID")
			response.Unauthorized(w, "Invalid or expired admin session")
			return
		}

		err = mw.rdb.Expire(r.Context(), token, 1*time.Hour).Err()
		if err != nil {
			log.Println("AdminAuthMiddleware: Error extending admin session:", err)
		}

		ctx := context.WithValue(r.Context(), globals.AdminMiddlewareKey, adminSession.AdminID)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

func (mw Provider) DatabaseMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		var dbConn *gorm.DB

		dbMode := r.Header.Get("X-Database-Mode")
		switch dbMode {
		case "demo":
			dbConn = mw.demoDB
		case "live":
			dbConn = mw.liveDB
		default:
			session, ok := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)
			if ok && session.Type == "demo" {
				dbConn = mw.demoDB
			} else {
				dbConn = mw.liveDB
			}
		}

		if dbConn == nil {
			response.InternalServerError(
				w,
				errors.New("could not initialize database in middleware"),
				"Database connection is nil",
			)
			return
		}

		ctx := context.WithValue(r.Context(), globals.DatabaseConnKey, dbConn)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
