package schemas

import (
	"time"
)

type Matches struct {
	ID               uint `gorm:"primarykey"`
	CreatedAt        time.Time
	UpdatedAt        time.Time
	Profile1ID       uint       `json:"profile1_id" gorm:"constraint:OnDelete:CASCADE"`
	Profile2ID       *uint      `json:"profile2_id" gorm:"constraint:OnDelete:SET NULL"`
	Profile3ID       uint       `json:"profile3_id" gorm:"constraint:OnDelete:CASCADE"`
	Profile4ID       *uint      `json:"profile4_id" gorm:"constraint:OnDelete:SET NULL"`
	Profile3Accepted bool       `json:"profile3_accepted"`
	Profile4Accepted bool       `json:"profile4_accepted"`
	Profile1         Profile    `gorm:"foreignKey:Profile1ID" json:"profile1"`
	Profile2         *Profile   `gorm:"foreignKey:Profile2ID" json:"profile2"`
	Profile3         Profile    `gorm:"foreignKey:Profile3ID" json:"profile3"`
	Profile4         *Profile   `gorm:"foreignKey:Profile4ID" json:"profile4"`
	Status           string     `json:"status"`
	IsDuo            bool       `json:"is_duo"`
	IsFriend         bool       `json:"is_friend"`
	IsStandout       bool       `json:"is_standout"` // Whether this was a standout like
	LastMessage      string     `json:"last_message"`
	LastMessageAt    *time.Time `json:"last_message_at"`
}
