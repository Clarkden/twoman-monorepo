package schemas

import (
	"time"
)

// DuoStandouts represents friend pairs that are standouts
type DuoStandouts struct {
	ID           uint      `gorm:"primarykey"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
	Profile1ID   uint      `json:"profile1_id" gorm:"constraint:OnDelete:CASCADE"`
	Profile2ID   uint      `json:"profile2_id" gorm:"constraint:OnDelete:CASCADE"`
	MatchCount   int       `json:"match_count"` // Total matches this duo has had together
	IsActive     bool      `json:"is_active" gorm:"default:true"`
	Profile1     Profile   `gorm:"foreignKey:Profile1ID" json:"profile1"`
	Profile2     Profile   `gorm:"foreignKey:Profile2ID" json:"profile2"`
}

// SoloStandouts represents individual profiles that are standouts
type SoloStandouts struct {
	ID            uint      `gorm:"primarykey"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
	ProfileID     uint      `json:"profile_id" gorm:"constraint:OnDelete:CASCADE"`
	PopularityScore int     `json:"popularity_score"` // Based on matches received
	IsActive      bool      `json:"is_active" gorm:"default:true"`
	Profile       Profile   `gorm:"foreignKey:ProfileID" json:"profile"`
}



// StandoutRefresh tracks when standouts were last refreshed for each user
type StandoutRefresh struct {
	ID              uint      `gorm:"primarykey"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
	UserID          uint      `json:"user_id" gorm:"constraint:OnDelete:CASCADE;uniqueIndex"`
	LastRefreshedAt time.Time `json:"last_refreshed_at"`
}