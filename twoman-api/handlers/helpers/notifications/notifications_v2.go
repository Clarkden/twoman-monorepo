package notifications

import (
	"errors"
	"fmt"
	"log"
	"time"
	"twoman/schemas"
	"twoman/types"
	"twoman/utils"

	"gorm.io/gorm"
)

// V2 API - New notification system functions

// GetNotificationPreferencesV2 gets user's notification preferences
func GetNotificationPreferencesV2(userID uint, db *gorm.DB) (*schemas.NotificationPreferences, error) {
	var preferences schemas.NotificationPreferences
	
	err := db.Where("user_id = ?", userID).First(&preferences).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create default preferences for new user
			defaultPrefs := schemas.NotificationPreferences{
				UserID:                               userID,
				NotificationsEnabled:                 true,
				NewMatchesNotificationsEnabled:       true,
				NewMessagesNotificationsEnabled:      true,
				NewFriendRequestNotificationsEnabled: true,
			}
			
			if err := db.Create(&defaultPrefs).Error; err != nil {
				return nil, fmt.Errorf("error creating default preferences: %v", err)
			}
			
			return &defaultPrefs, nil
		}
		return nil, err
	}
	
	return &preferences, nil
}

// UpdateNotificationPreferencesV2 updates user's notification preferences
func UpdateNotificationPreferencesV2(userID uint, req types.UpdateNotificationPreferencesRequest, db *gorm.DB) error {
	// First, ensure preferences exist
	preferences, err := GetNotificationPreferencesV2(userID, db)
	if err != nil {
		return err
	}
	
	// Update preferences
	preferences.NotificationsEnabled = req.NotificationsEnabled
	preferences.NewMatchesNotificationsEnabled = req.NewMatchesNotificationsEnabled
	preferences.NewMessagesNotificationsEnabled = req.NewMessagesNotificationsEnabled
	preferences.NewFriendRequestNotificationsEnabled = req.NewFriendRequestNotificationsEnabled
	
	if err := db.Save(preferences).Error; err != nil {
		return err
	}
	
	// If a push token was provided, add/update it separately
	if req.ExpoPushToken != "" {
		if err := AddPushTokenV2(userID, req.ExpoPushToken, db); err != nil {
			log.Printf("Error adding push token for user %d: %v", userID, err)
			// Don't fail the whole request just because token update failed
		}
	}
	
	return nil
}

// AddPushTokenV2 adds or updates a push token for a user
func AddPushTokenV2(userID uint, token string, db *gorm.DB) error {
	if token == "" {
		return fmt.Errorf("empty token provided")
	}
	
	// Validate token format
	if !utils.IsValidExpoToken(token) {
		return fmt.Errorf("invalid token format")
	}
	
	// Check if token already exists
	var existingToken schemas.PushToken
	err := db.Where("token = ?", token).First(&existingToken).Error
	
	if err == nil {
		// Token exists - update last_used and ensure it's active
		existingToken.LastUsed = time.Now()
		existingToken.IsActive = true
		// If token moved to different user, update user_id
		existingToken.UserID = userID
		return db.Save(&existingToken).Error
	}
	
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	
	// Deactivate any existing tokens for this user (keeps only newest active)
	db.Model(&schemas.PushToken{}).
		Where("user_id = ? AND is_active = ?", userID, true).
		Update("is_active", false)
	
	// Create new token
	newToken := schemas.PushToken{
		UserID:   userID,
		Token:    token,
		Platform: utils.GetPlatformFromToken(token),
		IsActive: true,
		LastUsed: time.Now(),
	}
	
	return db.Create(&newToken).Error
}

// GetActivePushTokensV2 gets all active push tokens for a user
func GetActivePushTokensV2(userID uint, db *gorm.DB) ([]schemas.PushToken, error) {
	var tokens []schemas.PushToken
	
	err := db.Where("user_id = ? AND is_active = ?", userID, true).Find(&tokens).Error
	if err != nil {
		return nil, err
	}
	
	return tokens, nil
}

// DeactivatePushTokenV2 marks a push token as inactive (instead of deleting)
func DeactivatePushTokenV2(token string, db *gorm.DB) error {
	result := db.Model(&schemas.PushToken{}).
		Where("token = ?", token).
		Update("is_active", false)
	
	if result.Error != nil {
		return result.Error
	}
	
	if result.RowsAffected == 0 {
		return fmt.Errorf("token not found")
	}
	
	return nil
}

// CleanupInactiveTokensV2 removes old inactive tokens (for maintenance)
func CleanupInactiveTokensV2(olderThanDays int, db *gorm.DB) error {
	cutoffDate := time.Now().AddDate(0, 0, -olderThanDays)
	
	result := db.Where("is_active = ? AND updated_at < ?", false, cutoffDate).
		Delete(&schemas.PushToken{})
	
	log.Printf("Cleaned up %d inactive push tokens older than %d days", result.RowsAffected, olderThanDays)
	return result.Error
}

// SendNotificationV2 sends notifications to all active tokens for a user
func SendNotificationV2(userID uint, title, body string, data map[string]interface{}, db *gorm.DB) error {
	// Check if user has notifications enabled
	preferences, err := GetNotificationPreferencesV2(userID, db)
	if err != nil {
		return fmt.Errorf("error getting preferences: %v", err)
	}
	
	if !preferences.NotificationsEnabled {
		log.Printf("Notifications disabled for user %d", userID)
		return nil // Not an error, just disabled
	}
	
	// Get active tokens
	tokens, err := GetActivePushTokensV2(userID, db)
	if err != nil {
		return fmt.Errorf("error getting push tokens: %v", err)
	}
	
	if len(tokens) == 0 {
		log.Printf("No active push tokens for user %d", userID)
		return nil // Not an error, just no tokens
	}
	
	// Extract token strings
	tokenStrings := make([]string, len(tokens))
	for i, token := range tokens {
		tokenStrings[i] = token.Token
	}
	
	// Send notification using existing function
	err = SendExpoNotifications(tokenStrings, title, body, data)
	
	// Update last_used timestamp for tokens that were used
	if err == nil {
		db.Model(&schemas.PushToken{}).
			Where("user_id = ? AND is_active = ?", userID, true).
			Update("last_used", time.Now())
	}
	
	return err
}

// SendReferralSuccessNotificationV2 sends a notification using the new system
func SendReferralSuccessNotificationV2(referrerID uint, referredUserName string, completedCount int64, remainingNeeded int, db *gorm.DB) error {
	// Check if user wants referral notifications
	preferences, err := GetNotificationPreferencesV2(referrerID, db)
	if err != nil {
		return fmt.Errorf("error getting preferences: %v", err)
	}
	
	if !preferences.NotificationsEnabled {
		log.Printf("Notifications disabled for user %d", referrerID)
		return nil
	}
	
	// Create notification message
	var title, body string
	if remainingNeeded <= 0 {
		title = "🎉 Free Month Unlocked!"
		body = fmt.Sprintf("%s joined using your code! You've earned a free month of 2 Man Pro!", referredUserName)
	} else if remainingNeeded == 1 {
		title = "🚀 Almost There!"
		body = fmt.Sprintf("%s joined using your code! Invite 1 more friend to get a free month of Pro!", referredUserName)
	} else {
		title = "💫 Friend Joined!"
		body = fmt.Sprintf("%s joined using your code! Invite %d more friends to get a free month of Pro!", referredUserName, remainingNeeded)
	}
	
	// Send notification with referral data
	data := map[string]interface{}{
		"type":             "referral_success",
		"referrer_id":      referrerID,
		"completed_count":  completedCount,
		"remaining_needed": remainingNeeded,
		"referred_user":    referredUserName,
	}
	
	return SendNotificationV2(referrerID, title, body, data, db)
}

// Legacy compatibility functions

// GetNotificationPreferencesCompat wraps V2 function to maintain legacy API compatibility
func GetNotificationPreferencesCompat(userId uint, db *gorm.DB) (*schemas.PushTokens, error) {
	// Try new system first
	preferences, err := GetNotificationPreferencesV2(userId, db)
	if err != nil {
		// Fallback to old system for gradual migration
		return GetNotificationPreferences(userId, db)
	}
	
	// Convert to legacy format
	legacy := &schemas.PushTokens{
		UserID:                               userId,
		Token:                                "", // Will be populated below
		NotificationsEnabled:                 preferences.NotificationsEnabled,
		NewMatchesNotificationsEnabled:       preferences.NewMatchesNotificationsEnabled,
		NewMessagesNotificationsEnabled:      preferences.NewMessagesNotificationsEnabled,
		NewFriendRequestNotificationsEnabled: preferences.NewFriendRequestNotificationsEnabled,
	}
	
	// Try to get first active token for legacy compatibility
	tokens, tokenErr := GetActivePushTokensV2(userId, db)
	if tokenErr == nil && len(tokens) > 0 {
		legacy.Token = tokens[0].Token
	}
	
	return legacy, nil
}