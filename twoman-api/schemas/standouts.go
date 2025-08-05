package schemas

import (
	"time"
)

// DuoStandouts represents friend pairs that are standouts (for API response only - no database table)
type DuoStandouts struct {
	ID           uint      `json:"id"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	Profile1ID   uint      `json:"profile1_id"`
	Profile2ID   uint      `json:"profile2_id"`
	MatchCount   int       `json:"match_count"` // Total matches this duo has had together
	IsActive     bool      `json:"is_active"`
	Profile1     Profile   `json:"profile1"`
	Profile2     Profile   `json:"profile2"`
}

// SoloStandouts represents individual profiles that are standouts (for API response only - no database table)
type SoloStandouts struct {
	ID              uint      `json:"id"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	ProfileID       uint      `json:"profile_id"`
	PopularityScore int       `json:"popularity_score"` // Based on matches received
	IsActive        bool      `json:"is_active"`
	Profile         Profile   `json:"profile"`
}