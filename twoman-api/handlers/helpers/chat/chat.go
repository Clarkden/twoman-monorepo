package chat

import (
	"errors"
	"log"
	"time"
	"twoman/schemas"

	"gorm.io/gorm"
)

// SaveChatMessage returns either an error or a match. The match can be used to get the ids of the profiles in the match.
// This is important for the websocket to know which profiles are in the chat and to send messages to the connections of those profiles if they are online.
// This is also important to send push notifications to the profiles if they are offline.
func SaveChatMessage(userId uint, matchId uint, message string, db *gorm.DB) (*schemas.Matches, *schemas.Message, error) {
	var match *schemas.Matches
	if err := db.Where("id = ?", matchId).Where("profile1_id = ? OR profile2_id = ? OR profile3_id = ? OR profile4_id = ?", userId, userId, userId, userId).Where("status = 'accepted'").First(&match).Error; err != nil {
		log.Println("match not found or not accepted")
		return nil, nil, err
	}

	if match == nil {
		log.Println("match not found")
		return nil, nil, errors.New("match not found")
	}

	if match.ID == 0 {
		log.Println("match not found")
		return nil, nil, errors.New("match not found")
	}

	chatMessage := &schemas.Message{
		ProfileID: userId,
		Message:   message,
		MatchID:   matchId,
		CreatedAt: time.Now(),
	}

	if err := db.Create(chatMessage).Error; err != nil {
		log.Println("Error saving message: ", err)
		return nil, nil, err
	}

	now := time.Now()
	match.LastMessage = message
	match.LastMessageAt = &now

	if err := db.Save(&match).Error; err != nil {
		log.Println("Error saving match: ", err)
		return nil, nil, err
	}

	return match, chatMessage, nil
}

func VerifyUserInMatch(userId uint, matchId uint, db *gorm.DB) bool {
	var match *schemas.Matches
	if err := db.Where("id = ?", matchId).Where("profile1_id = ? OR profile2_id = ? OR profile3_id = ? OR profile4_id = ?", userId, userId, userId, userId).Where("status = 'accepted'").First(&match).Error; err != nil {
		return false
	}

	if match == nil {
		return false
	}

	if match.ID == 0 {
		return false
	}

	return true
}

func GetMatchChats(matchId uint, limit int, offset int, db *gorm.DB) ([]schemas.Message, error) {
	var messages []schemas.Message

	if err := db.Preload("Profile").Where("match_id = ?", matchId).Order("created_at desc").Offset(offset).Limit(limit).Find(&messages).Error; err != nil {
		return nil, err
	}

	return messages, nil
}

func DeleteAllChatMessages(matchId uint, db *gorm.DB) error {
	if err := db.Where("match_id = ?", matchId).Delete(&schemas.Message{}).Error; err != nil {
		return err
	}

	return nil
}
