package schemas

import (
	"time"
)

// Separate notification preferences from push tokens
type NotificationPreferences struct {
	ID                                   uint      `gorm:"primaryKey;autoIncrement"`
	UserID                               uint      `gorm:"uniqueIndex;not null"`
	NotificationsEnabled                 bool      `gorm:"default:true"`
	NewMatchesNotificationsEnabled       bool      `gorm:"default:true"`
	NewMessagesNotificationsEnabled      bool      `gorm:"default:true"`
	NewFriendRequestNotificationsEnabled bool      `gorm:"default:true"`
	CreatedAt                           time.Time `gorm:"autoCreateTime"`
	UpdatedAt                           time.Time `gorm:"autoUpdateTime"`
}

// Separate push tokens with proper lifecycle management
type PushToken struct {
	ID        uint      `gorm:"primaryKey;autoIncrement"`
	UserID    uint      `gorm:"index;not null"`
	Token     string    `gorm:"uniqueIndex;not null;size:255"`
	Platform  string    `gorm:"size:10"` // 'ios', 'android'
	IsActive  bool      `gorm:"default:true"`
	LastUsed  time.Time `gorm:"autoUpdateTime"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
}

// TableName specifies the table name to avoid conflict with existing push_tokens
func (PushToken) TableName() string {
	return "user_push_tokens"
}

// Legacy table - will be migrated away from
type PushTokens struct {
	Token                                string `gorm:"primaryKey"`
	UserID                               uint   `gorm:"primaryKey"`
	NotificationsEnabled                 bool
	NewMatchesNotificationsEnabled       bool
	NewMessagesNotificationsEnabled      bool
	NewFriendRequestNotificationsEnabled bool
}
