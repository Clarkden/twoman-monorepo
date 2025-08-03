package schemas

import "time"

type User struct {
	ID              uint `gorm:"primarykey"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
	PhoneNumber     string `gorm:"unique_index"`
	Email           string `gorm:"unique_index"`
	OauthProvider   string
	OauthProviderID string
	AppleID         string `gorm:"unique_index"`
	Verified        bool
	Type            string `gorm:"type:enum('live','demo');default:'live'"`
}

type PaidUser struct {
	UserID uint `gorm:"primaryKey"`
	Plan   string
}
