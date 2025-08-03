package schemas

import "time"

type Message struct {
	ID        uint `gorm:"primaryKey"`
	ProfileID uint `json:"profile_id" gorm:"constraint:OnDelete:CASCADE"`
	Profile   Profile
	MatchID   uint `json:"match_id" gorm:"constraint:OnDelete:CASCADE"`
	Match     Matches
	Message   string `json:"message"`
	CreatedAt time.Time
}
