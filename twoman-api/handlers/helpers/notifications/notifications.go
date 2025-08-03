package notifications

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"twoman/schemas"
	"twoman/types"

	"gorm.io/gorm"
)

type ExpoNotification struct {
	To    []string               `json:"to"`
	Title string                 `json:"title"`
	Body  string                 `json:"body"`
	Data  map[string]interface{} `json:"data,omitempty"`
}

func SendExpoNotifications(tokens []string, title, body string, data map[string]interface{}) error {
	if len(tokens) == 0 {
		return fmt.Errorf("no tokens provided")
	}

	notification := ExpoNotification{
		To:    tokens,
		Title: title,
		Body:  body,
		Data:  data,
	}

	log.Println("Sending notification: ", notification)

	payload, err := json.Marshal(notification)
	if err != nil {
		return fmt.Errorf("error marshaling notification: %v", err)
	}

	resp, err := http.Post(
		"https://exp.host/--/api/v2/push/send",
		"application/json",
		bytes.NewBuffer(payload),
	)

	if err != nil {
		return fmt.Errorf("error sending notification: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	return nil
}

func AddPushToken(userId uint, pushToken string, db *gorm.DB) error {
	var token schemas.PushTokens

	err := db.Where("token = ?", pushToken).First(&token).Error

	if err == nil {
		return nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	newToken := schemas.PushTokens{UserID: userId, Token: pushToken, NotificationsEnabled: true, NewMatchesNotificationsEnabled: true, NewMessagesNotificationsEnabled: true, NewFriendRequestNotificationsEnabled: true}
	if err := db.Create(&newToken).Error; err != nil {
		return err
	}

	return nil
}

func DeletePushTokens(userId uint, db *gorm.DB) error {
	var pushTokens []schemas.PushTokens
	if err := db.Where("user_id = ?", userId).Find(&pushTokens).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
	}

	if len(pushTokens) == 0 {
		return nil
	}

	result := db.Where("user_id = ?", userId).Delete(&schemas.PushTokens{})

	if result.Error != nil {
		return result.Error
	}

	return nil
}

func GetPushTokensByUserId(userId uint, db *gorm.DB) ([]schemas.PushTokens, error) {
	var pushTokens []schemas.PushTokens

	err := db.Where("user_id = ?", userId).Find(&pushTokens).Error
	if err != nil {
		return nil, err
	}

	return pushTokens, nil
}

func UpdateNotificationPreferences(userId uint, req types.UpdateNotificationPreferencesRequest, db *gorm.DB) error {
	var pushTokens schemas.PushTokens
	err := db.Where("user_id = ?", userId).First(&pushTokens).Error
	if err != nil {
		return err
	}

	pushTokens.Token = req.ExpoPushToken
	pushTokens.NotificationsEnabled = req.NotificationsEnabled
	pushTokens.NewMatchesNotificationsEnabled = req.NewMatchesNotificationsEnabled
	pushTokens.NewMessagesNotificationsEnabled = req.NewMessagesNotificationsEnabled
	pushTokens.NewFriendRequestNotificationsEnabled = req.NewFriendRequestNotificationsEnabled

	if err := db.Save(&pushTokens).Error; err != nil {
		return err
	}

	return nil
}

func GetNotificationPreferences(userId uint, db *gorm.DB) (*schemas.PushTokens, error) {
	var preferences schemas.PushTokens
	err := db.Where("user_id = ?", userId).First(&preferences).Error

	if err != nil {

		if errors.Is(err, gorm.ErrRecordNotFound) {
			newRecord := schemas.PushTokens{
				UserID:                               userId,
				NotificationsEnabled:                 true,
				NewMatchesNotificationsEnabled:       true,
				NewMessagesNotificationsEnabled:      true,
				NewFriendRequestNotificationsEnabled: true,
			}

			if err := db.Create(&newRecord).Error; err != nil {
				return nil, err
			}

			return &newRecord, nil
		}

		return nil, err
	}

	return &preferences, nil
}

// SendReferralSuccessNotification sends a notification to the referrer when someone uses their code
func SendReferralSuccessNotification(referrerID uint, referredUserName string, completedCount int64, remainingNeeded int, db *gorm.DB) error {
	// Get referrer's push tokens
	pushTokens, err := GetPushTokensByUserId(referrerID, db)
	if err != nil {
		return fmt.Errorf("error getting push tokens: %v", err)
	}

	if len(pushTokens) == 0 {
		log.Printf("No push tokens found for user %d", referrerID)
		return nil
	}

	// Check if notifications are enabled
	if !pushTokens[0].NotificationsEnabled {
		log.Printf("Notifications disabled for user %d", referrerID)
		return nil
	}

	// Create notification message
	var title, body string
	if remainingNeeded <= 0 {
		// User has reached the threshold for free month
		title = "🎉 Free Month Unlocked!"
		body = fmt.Sprintf("%s joined using your code! You've earned a free month of 2 Man Pro!", referredUserName)
	} else if remainingNeeded == 1 {
		// One more needed
		title = "🚀 Almost There!"
		body = fmt.Sprintf("%s joined using your code! Invite 1 more friend to get a free month of Pro!", referredUserName)
	} else {
		// Multiple still needed
		title = "💫 Friend Joined!"
		body = fmt.Sprintf("%s joined using your code! Invite %d more friends to get a free month of Pro!", referredUserName, remainingNeeded)
	}

	// Extract tokens
	tokens := make([]string, len(pushTokens))
	for i, pt := range pushTokens {
		tokens[i] = pt.Token
	}

	// Send notification with referral data
	data := map[string]interface{}{
		"type":             "referral_success",
		"referrer_id":      referrerID,
		"completed_count":  completedCount,
		"remaining_needed": remainingNeeded,
		"referred_user":    referredUserName,
	}

	return SendExpoNotifications(tokens, title, body, data)
}
