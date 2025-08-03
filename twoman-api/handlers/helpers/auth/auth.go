package auth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"os"
	"time"
	"twoman/schemas"
	"twoman/types"

	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/google/uuid"

	"github.com/twilio/twilio-go"
	verify "github.com/twilio/twilio-go/rest/verify/v2"
)

const (
	SessionPrefix = "session:"
	RefreshPrefix = "refresh:"
)

func CreateAuthToken(ctx context.Context, userID uint, rdb *redis.Client, userType string) (string, string, error) {
	sessionToken := uuid.New().String()
	refreshToken := uuid.New().String()

	session := types.Session{
		UserID:       userID,
		SessionID:    sessionToken,
		RefreshToken: refreshToken,
		Expiration:   time.Now().Add(24 * 30 * time.Hour),
		Type:         userType,
	}

	jsonData, err := json.Marshal(session)
	if err != nil {
		return "", "", err
	}

	sessionKey := SessionPrefix + sessionToken
	log.Printf("DEBUG: Creating session - userID: %d, sessionKey: %s", userID, sessionKey[:16]+"...")

	err = rdb.Set(ctx, sessionKey, jsonData, 24*time.Hour).Err()
	if err != nil {
		log.Printf("DEBUG: Failed to save session to Redis: %v", err)
		return "", "", err
	}

	log.Printf("DEBUG: Session saved successfully to Redis")

	refreshKey := RefreshPrefix + refreshToken
	err = rdb.Set(ctx, refreshKey, userID, 30*24*time.Hour).Err()
	if err != nil {
		return "", "", err
	}

	return sessionToken, refreshToken, nil
}

func GetSessionByToken(ctx context.Context, token string, rdb *redis.Client) (*types.Session, error) {
	sessionKey := SessionPrefix + token
	jsonData, err := rdb.Get(ctx, sessionKey).Result()
	if err != nil {
		return nil, err
	}

	var session types.Session
	err = json.Unmarshal([]byte(jsonData), &session)
	if err != nil {
		return nil, err
	}

	return &session, nil
}

func ClearSession(sessionId string, rdb *redis.Client) error {
	sessionKey := SessionPrefix + sessionId
	err := rdb.Del(context.Background(), sessionKey)

	if err != nil {
		return err.Err()
	}

	return nil
}

func RefreshToken(ctx context.Context, refreshToken string, rdb *redis.Client, userType string) (string, string, error) {
	refreshKey := "refresh:" + refreshToken
	userID, err := rdb.Get(ctx, refreshKey).Uint64()
	if err != nil {
		return "", "", errors.New("invalid refresh token")
	}

	// Generate new tokens
	newSessionToken := uuid.New().String()
	newRefreshToken := uuid.New().String()

	session := types.Session{
		UserID:       uint(userID),
		SessionID:    newSessionToken,
		RefreshToken: newRefreshToken,
		Expiration:   time.Now().Add(24 * time.Hour),
		Type:         userType,
	}

	jsonData, err := json.Marshal(session)
	if err != nil {
		return "", "", err
	}

	// Store the new session data
	newSessionKey := SessionPrefix + newSessionToken
	err = rdb.Set(ctx, newSessionKey, jsonData, 24*30*time.Hour).Err()
	if err != nil {
		return "", "", err
	}

	// Store the new refresh token
	newRefreshKey := RefreshPrefix + newRefreshToken
	err = rdb.Set(ctx, newRefreshKey, userID, 90*24*time.Hour).Err()
	if err != nil {
		return "", "", err
	}

	// Delete the old refresh token
	rdb.Del(ctx, refreshKey)

	return newSessionToken, newRefreshToken, nil
}

func ClearRefreshToken(refreshToken string, rdb *redis.Client) error {
	refreshKey := RefreshPrefix + refreshToken
	err := rdb.Del(context.Background(), refreshKey)

	if err != nil {
		return err.Err()
	}

	return nil
}

func CreateDevSession(userID uint, rdb *redis.Client) (string, error) {
	token := uuid.New().String()
	session := types.Session{
		UserID:     userID,
		Expiration: time.Now().Add(24 * time.Hour),
		SessionID:  token,
	}

	jsonData, err := json.Marshal(session)
	if err != nil {
		return "", err
	}

	err = rdb.Set(context.Background(), token, jsonData, 24*time.Hour).Err()
	if err != nil {
		return "", err
	}

	return token, nil
}

func DeleteDevSession(token string, rdb *redis.Client) error {
	err := rdb.Del(context.Background(), token).Err()

	if err != nil {
		return err
	}

	return nil
}

func DecodeAppleIdentityToken(tokenString string) (*types.AppleIdentity, error) {

	type AppleJWK struct {
		Keys []struct {
			Kty string `json:"kty"`
			Kid string `json:"kid"`
			Use string `json:"use"`
			Alg string `json:"alg"`
			N   string `json:"n"`
			E   string `json:"e"`
		} `json:"keys"`
	}

	resp, err := http.Get("https://appleid.apple.com/auth/keys")
	if err != nil {
		return nil, fmt.Errorf("error fetching Apple JWK: %w", err)
	}
	defer func(Body io.ReadCloser) {
		err := Body.Close()
		if err != nil {
			log.Println("Error closing response body:", err)
		}
	}(resp.Body)

	var appleJWK AppleJWK
	err = json.NewDecoder(resp.Body).Decode(&appleJWK)
	if err != nil {
		return nil, fmt.Errorf("error decoding Apple JWK: %w", err)
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("kid header not found")
		}

		var key *rsa.PublicKey
		for _, k := range appleJWK.Keys {
			if k.Kid == kid {
				nBytes, err := base64.RawURLEncoding.DecodeString(k.N)
				if err != nil {
					return nil, fmt.Errorf("failed to decode modulus: %w", err)
				}
				eBytes, err := base64.RawURLEncoding.DecodeString(k.E)
				if err != nil {
					return nil, fmt.Errorf("failed to decode exponent: %w", err)
				}

				key = &rsa.PublicKey{
					N: new(big.Int).SetBytes(nBytes),
					E: int(new(big.Int).SetBytes(eBytes).Int64()),
				}
				break
			}
		}

		if key == nil {
			return nil, fmt.Errorf("key not found")
		}

		return key, nil
	})

	if err != nil {
		return nil, fmt.Errorf("error parsing token: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	identity := &types.AppleIdentity{
		Email: claims["email"].(string),
		Sub:   claims["sub"].(string),
	}

	return identity, nil
}

func SendVerifyCode(phone string, twClient *twilio.RestClient) error {
	params := &verify.CreateVerificationParams{}
	params.SetTo(phone)
	params.SetChannel("sms")

	resp, err := twClient.VerifyV2.CreateVerification(os.Getenv("TWILIO_VERIFY_SERVICE_SID"), params)

	if err != nil {
		return err
	}

	log.Println(resp.Sid)

	return nil
}

func VerifyCode(code, phone string, twClient *twilio.RestClient) (bool, error) {
	params := &verify.CreateVerificationCheckParams{}
	params.SetTo(phone)
	params.SetCode(code)

	resp, err := twClient.VerifyV2.CreateVerificationCheck(os.Getenv("TWILIO_VERIFY_SERVICE_SID"), params)

	if err != nil {
		return false, err
	}

	log.Println(resp.Status)

	if *resp.Status != "" && *resp.Status == "approved" {
		return true, nil
	}

	return false, nil
}

func IsDemoNumber(phone string, db *gorm.DB) (bool, error) {
	var record *schemas.AdminDemoNumbers
	if err := db.Where(&schemas.AdminDemoNumbers{PhoneNumber: phone}).First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}
