package friendship

import (
	"errors"
	"log"
	"twoman/handlers/helpers/chat"
	"twoman/schemas"

	"gorm.io/gorm"
)

func SendFriendRequest(senderId uint, recipientId uint, db *gorm.DB) (*schemas.Friendship, error) {

	if senderId == recipientId {
		return nil, errors.New("cannot send friend request to yourself")
	}

	var friendship *schemas.Friendship
	err := db.Preload("Profile").Where("profile_id = ? AND friend_id = ? OR friend_id = ? AND profile_id = ?", senderId, recipientId, senderId, recipientId).First(&friendship).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	if friendship.ID != 0 {
		return nil, errors.New("friendship already exists")
	}

	var recipientUser schemas.User
	err = db.Where("id = ?", recipientId).First(&recipientUser).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user does not exist")
		}
		return nil, err
	}

	newFriendshipRecord := schemas.Friendship{
		ProfileID: senderId,
		FriendID:  recipientId,
		Accepted:  false,
	}

	err = db.Create(&newFriendshipRecord).Error
	if err != nil {
		return nil, errors.New("could not save friendship record")
	}

	var friendshipRecord schemas.Friendship
	err = db.Preload("Profile").Preload("Friend").Where("id = ?", newFriendshipRecord.ID).First(&friendshipRecord).Error
	if err != nil {
		return nil, err
	}

	return &friendshipRecord, nil
}

func GetAllFriendRequests(userId uint, db *gorm.DB) ([]*schemas.Friendship, error) {
	var friendRequests []*schemas.Friendship
	err := db.Preload("Profile").Where("friend_id = ? AND accepted = ?", userId, false).Find(&friendRequests).Error

	if err != nil {
		return nil, err
	}

	return friendRequests, nil
}

func AcceptFriendRequest(friendshipId uint, friendId uint, db *gorm.DB) (*schemas.Friendship, error) {

	var friendship *schemas.Friendship
	if err := db.Preload("Profile").Preload("Friend").Where("id = ?", friendshipId).Where("friend_id = ?", friendId).First(&friendship).Error; err != nil {
		return nil, err
	}

	if friendship == nil {
		return nil, errors.New("user friendship not found")
	}

	if friendship.Accepted {
		return nil, errors.New("friendship is already accepted")
	}

	friendship.Accepted = true

	if err := db.Save(&friendship).Error; err != nil {
		return nil, errors.New("could not update friendship record")
	}

	return friendship, nil
}

// CreateAcceptedFriendship creates a friendship that's automatically accepted (for referrals)
func CreateAcceptedFriendship(userID1 uint, userID2 uint, db *gorm.DB) (*schemas.Friendship, error) {
	if userID1 == userID2 {
		return nil, errors.New("cannot create friendship with yourself")
	}

	// Check if friendship already exists
	var existingFriendship schemas.Friendship
	err := db.Where("(profile_id = ? AND friend_id = ?) OR (friend_id = ? AND profile_id = ?)",
		userID1, userID2, userID1, userID2).First(&existingFriendship).Error

	if err == nil {
		// Friendship already exists
		if !existingFriendship.Accepted {
			// Accept the existing friendship
			existingFriendship.Accepted = true
			if err := db.Save(&existingFriendship).Error; err != nil {
				return nil, err
			}
		}
		return &existingFriendship, nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Create new accepted friendship
	newFriendship := schemas.Friendship{
		ProfileID: userID1,
		FriendID:  userID2,
		Accepted:  true, // Auto-accept for referrals
	}

	if err := db.Create(&newFriendship).Error; err != nil {
		return nil, err
	}

	// Load the friendship with relations
	var friendship schemas.Friendship
	if err := db.Preload("Profile").Preload("Friend").Where("id = ?", newFriendship.ID).First(&friendship).Error; err != nil {
		return nil, err
	}

	return &friendship, nil
}

func GetAllFriends(userId uint, db *gorm.DB) ([]*schemas.Friendship, error) {
	var friends []*schemas.Friendship

	if err := db.Preload("Friend").Preload("Profile").Where("profile_id = ? AND accepted = true", userId).Or("friend_id = ? AND accepted = true", userId).Find(&friends).Error; err != nil {
		return nil, err
	}

	return friends, nil
}

func RemoveFriendship(userId uint, friendId uint, db *gorm.DB) error {
	var friendship schemas.Friendship
	if err := db.Where("profile_id = ? AND friend_id = ? OR friend_id = ? AND profile_id = ?", userId, friendId, userId, friendId).First(&friendship).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("could not find friendship record")
		}
		return err
	}

	if err := db.Delete(&friendship).Error; err != nil {
		return errors.New("could not delete friendship")
	}

	var friendshipMatch schemas.Matches
	if err := db.Where("is_friend = ? AND (profile1_id = ? AND profile3_id = ? OR profile3_id = ? AND profile1_id = ?)", true, userId, friendId, userId, friendId).First(&friendshipMatch).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Println("Could not find a friendship match")
			return nil
		}
		return err
	}

	if err := chat.DeleteAllChatMessages(friendshipMatch.ID, db); err != nil {

		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err

		}
	}

	if err := db.Delete(&friendshipMatch).Error; err != nil {
		return errors.New("could not delete friendship match")
	}

	return nil
}

func RejectFriendRequest(id uint, profileId uint, db *gorm.DB) error {
	var friendshipRecord schemas.Friendship

	if err := db.Where("id = ?", id).Where("friend_id = ?", profileId).First(&friendshipRecord).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("could not find friendship record")
		}
		return err
	}

	if err := db.Delete(&friendshipRecord).Error; err != nil {
		return err
	}

	return nil
}

func GetFriendShipBetweenProfiles(userId uint, profileId uint, db *gorm.DB) (*schemas.Friendship, error) {
	var friendship *schemas.Friendship
	if err := db.Where("profile_id = ? AND friend_id = ? OR friend_id = ? AND profile_id = ?", userId, profileId, userId, profileId).First(&friendship).Error; err != nil {
		return nil, err
	}

	return friendship, nil
}

func DeleteAllProfileFriendships(userId uint, db *gorm.DB) error {
	if err := db.Where("profile_id = ? OR friend_id = ?", userId, userId).Delete(&schemas.Friendship{}).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}

		return err
	}

	return nil
}

func VerifyFriendship(profile1ID uint, profile2ID uint, db *gorm.DB) (bool, error) {
	var friendship *schemas.Friendship
	if err := db.Where("profile_id = ? AND friend_id = ? OR friend_id = ? AND profile_id = ?", profile1ID, profile2ID, profile1ID, profile2ID).First(&friendship).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}

	return friendship.Accepted, nil
}

func ForceCreateFriendship(profile1ID, profile2ID uint, db *gorm.DB) (*schemas.Friendship, error) {
	if profile1ID == profile2ID {
		return nil, errors.New("user cannot be friends with themselves")
	}

	var friendship *schemas.Friendship
	err := db.Preload("Profile").Where("profile_id = ? AND friend_id = ? OR friend_id = ? AND profile_id = ?", profile1ID, profile2ID, profile1ID, profile2ID).First(&friendship).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	if friendship.ID != 0 {
		return nil, errors.New("friendship already exists")
	}

	newFriendshipRecord := schemas.Friendship{
		ProfileID: profile1ID,
		FriendID:  profile2ID,
		Accepted:  true,
	}

	err = db.Create(&newFriendshipRecord).Error
	if err != nil {
		return nil, errors.New("could not save friendship record")
	}

	var friendshipRecord schemas.Friendship
	err = db.Preload("Profile").Preload("Friend").Where("id = ?", newFriendshipRecord.ID).First(&friendshipRecord).Error
	if err != nil {
		return nil, err
	}

	return &friendshipRecord, nil

}
