package schemas

type PushTokens struct {
	Token                                string `gorm:"primaryKey"`
	UserID                               uint   `gorm:"primaryKey"`
	NotificationsEnabled                 bool
	NewMatchesNotificationsEnabled       bool
	NewMessagesNotificationsEnabled      bool
	NewFriendRequestNotificationsEnabled bool
}
