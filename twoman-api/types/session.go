package types

import "time"

type Session struct {
	UserID       uint      `json:"user_id"`
	SessionID    string    `json:"session_id"`
	RefreshToken string    `json:"refresh_token"`
	Expiration   time.Time `json:"expiration"`
	Type         string    `json:"type"`
}
