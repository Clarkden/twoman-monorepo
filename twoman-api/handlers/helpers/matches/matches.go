package matches

import (
	"errors"
	"log"
	"twoman/handlers/helpers/chat"
	"twoman/handlers/helpers/friendship"
	"twoman/schemas"

	"gorm.io/gorm"
)

func CreateSoloMatch(profileID uint, targetProfileID uint, db *gorm.DB) error {
	return CreateSoloMatchWithStandout(profileID, targetProfileID, false, db)
}

func CreateSoloMatchWithStandout(profileID uint, targetProfileID uint, isStandout bool, db *gorm.DB) error {
	if profileID == targetProfileID {
		return errors.New("a profile cannot match with itself")
	}

	var existingMatch schemas.Matches
	db.Where("is_duo = ? AND ((profile1_id = ? AND profile3_id = ?) OR (profile1_id = ? AND profile3_id = ?))",
		false, profileID, targetProfileID, targetProfileID, profileID).First(&existingMatch)
	if existingMatch.ID != 0 {
		return errors.New("a solo match already exists between the two profiles")
	}

	newMatch := schemas.Matches{
		Profile1ID: profileID,
		Profile3ID: targetProfileID,
		IsDuo:      false,
		IsStandout: isStandout,
		Status:     "pending",
	}
	if err := db.Create(&newMatch).Error; err != nil {
		return err
	}

	return nil
}

func CreateDuoMatch(profileID uint, friendProfileID uint, targetProfileID uint, db *gorm.DB) error {
	return CreateDuoMatchWithStandout(profileID, friendProfileID, targetProfileID, false, db)
}

func CreateDuoMatchWithStandout(profileID uint, friendProfileID uint, targetProfileID uint, isStandout bool, db *gorm.DB) error {
	if profileID == targetProfileID || profileID == friendProfileID {
		return errors.New("a profile cannot match itself")
	}

	var existingMatch schemas.Matches
	db.Where("is_duo = ? AND ((profile1_id = ? AND profile2_id = ? AND profile3_id = ?) OR (profile2_id = ? AND profile1_id = ? AND profile3_id = ?))",
		true, profileID, friendProfileID, targetProfileID, profileID, friendProfileID, targetProfileID).First(&existingMatch)
	if existingMatch.ID != 0 {
		return errors.New("a duo match already exists with the given profile combination")
	}

	newMatch := schemas.Matches{
		Profile1ID: profileID,
		Profile2ID: &friendProfileID,
		Profile3ID: targetProfileID,
		IsDuo:      true,
		IsStandout: isStandout,
		Status:     "pending",
	}
	if err := db.Create(&newMatch).Error; err != nil {
		return err
	}

	return nil
}

func CreateFriendMatch(profileID uint, friendProfileID uint, db *gorm.DB) (*schemas.Matches, error) {
	validFriendship, err := friendship.VerifyFriendship(profileID, friendProfileID, db)

	if err != nil {
		return nil, err
	}

	if !validFriendship {
		return nil, errors.New("the provided profiles are not friends")
	}

	var existingMatch schemas.Matches
	db.Where("is_friend = ? AND ((profile1_id = ? AND profile3_id = ?) OR (profile3_id = ? AND profile1_id = ?))", true, profileID, friendProfileID, profileID, friendProfileID).First(&existingMatch)

	if existingMatch.ID != 0 {
		return nil, errors.New("a match already exists between the two profiles")
	}

	newMatch := schemas.Matches{
		Profile1ID: profileID,
		Profile3ID: friendProfileID,
		IsFriend:   true,
		Status:     "accepted",
	}

	if err := db.Create(&newMatch).Error; err != nil {
		return nil, err
	}

	match, err := GetMatchByID(newMatch.ID, db)

	if err != nil {
		return nil, err
	}

	return match, nil
}

func UpdateDuoTargetProfile2(matchId uint, profileId uint, targetProfileId2 uint, db *gorm.DB) (*uint, *uint, error) {
	var existingMatch schemas.Matches
	if err := db.First(&existingMatch, matchId).Error; err != nil {
		return nil, nil, err
	}

	if existingMatch.ID == 0 {
		return nil, nil, errors.New("record not found")
	}

	if existingMatch.Profile2ID == nil || *existingMatch.Profile2ID != profileId {
		return nil, nil, errors.New("the provided profile is not authorized to update this match")
	}

	if !existingMatch.IsDuo {
		return nil, nil, errors.New("the match is not a duo match")
	}

	if existingMatch.Profile4ID != nil {
		return nil, nil, errors.New("the second target profile is already set for this match")
	}

	var duplicateMatch schemas.Matches
	db.Where("id != ? AND is_duo = ? AND ((profile1_id = ? AND profile2_id = ? AND profile3_id = ? AND profile4_id = ?) OR (profile1_id = ? AND profile2_id = ? AND profile3_id = ? AND profile4_id = ?))",
		existingMatch.ID,
		true,
		existingMatch.Profile1ID, existingMatch.Profile2ID, existingMatch.Profile3ID, targetProfileId2,
		existingMatch.Profile1ID, existingMatch.Profile2ID, targetProfileId2, existingMatch.Profile3ID,
	).First(&duplicateMatch)

	if duplicateMatch.ID != 0 {
		return nil, nil, errors.New("a duo match with the same profile combination already exists")
	}

	existingMatch.Profile4ID = &targetProfileId2

	if err := db.Save(&existingMatch).Error; err != nil {
		return nil, nil, err
	}

	return &existingMatch.Profile3ID, existingMatch.Profile4ID, nil
}

func AcceptMatch(matchId uint, profileId uint, db *gorm.DB) error {
	var match schemas.Matches
	db.Where("id = ?", matchId).Where("profile3_id = ? OR profile4_id = ?", profileId, profileId).Where("status = ?", "pending").First(&match)

	if match.ID == 0 {
		return errors.New("record not found")
	}

	if !match.IsDuo {
		match.Status = "accepted"
		if err := db.Save(&match).Error; err != nil {
			return err
		}
	} else {
		if match.Profile3ID == profileId {
			match.Profile3Accepted = true
		} else if match.Profile4ID != nil && *match.Profile4ID == profileId {
			match.Profile4Accepted = true
		} else {
			return errors.New("invalid profile ID")
		}

		if match.Profile3Accepted && match.Profile4Accepted {
			match.Status = "accepted"
		}

		if err := db.Save(&match).Error; err != nil {
			return err
		}
	}

	return nil
}

func RejectMatch(matchID, profileID uint, db *gorm.DB) error {
	var match schemas.Matches

	if err := db.Where("id = ? AND status = ?", matchID, "pending").First(&match).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("record not found")
		}
		return err
	}

	if match.Status != "pending" {
		return errors.New("match decision cannot be changed")
	}

	switch {
	case match.Profile2ID != nil && profileID == *match.Profile2ID:
		if match.Profile4ID != nil {
			return errors.New("match target is already set")
		}
		match.Status = "rejected"
	case match.Profile3ID == profileID:
		if !match.IsDuo {
			match.Status = "rejected"
		} else {
			match.Profile3Accepted = false
			if match.Profile4ID == nil || !match.Profile4Accepted {
				match.Status = "rejected"
			}
		}
	case match.Profile4ID != nil && *match.Profile4ID == profileID:
		if !match.IsDuo {
			return errors.New("invalid profile ID")
		}
		match.Profile4Accepted = false
		if !match.Profile3Accepted {
			match.Status = "rejected"
		}
	default:
		return errors.New("invalid profile ID")
	}

	return db.Save(&match).Error
}

func Unmatch(matchID uint, profileID uint, db *gorm.DB) error {
	var match schemas.Matches

	if err := db.Where("id = ?", matchID).First(&match).Error; err != nil {
		return err
	}

	if match.Status == "rejected" {
		return nil
	}

	match.Status = "rejected"

	return db.Save(&match).Error
}

func ChangeMatchDecision(matchId uint, profileId uint, accept bool, db *gorm.DB) error {
	var match schemas.Matches

	db.Where("id = ?", matchId).Where("profile3_id = ? OR profile4_id = ?", profileId, profileId).Where("status = 'pending'").First(&match)

	if match.ID == 0 {
		return errors.New("record not found")
	}

	if match.Status != "pending" {
		return errors.New("match decision cannot be changed")
	}

	if !match.IsDuo {
		if accept {
			match.Status = "accepted"
		} else {
			match.Status = "rejected"
		}
	} else {
		if match.Profile3ID == profileId {
			match.Profile3Accepted = accept
		} else if match.Profile4ID != nil && *match.Profile4ID == profileId {
			match.Profile4Accepted = accept
		} else {
			return errors.New("invalid profile ID")
		}

		if match.Profile3Accepted && (match.Profile4ID == nil || match.Profile4Accepted) {
			match.Status = "accepted"
		} else if !match.Profile3Accepted && match.Profile4ID != nil && !match.Profile4Accepted {
			match.Status = "rejected"
		}
	}

	if err := db.Save(&match).Error; err != nil {
		return err
	}

	return nil
}

func GetPendingMatches(profileId uint, db *gorm.DB) ([]schemas.Matches, error) {
	var pendingMatches []schemas.Matches

	err := db.
		Where(`
            ( status = 'pending'
              AND profile3_id = ?
              AND profile3_accepted = false
              AND (
                   is_duo = false
                   OR (is_duo = true AND profile4_id IS NOT NULL)
              )
            )
            OR
            (
              status = 'pending'
              AND profile4_id = ?
              AND profile4_accepted = false
            )`,
			profileId,
			profileId,
		).
		Order("CASE WHEN is_standout = true THEN 0 ELSE 1 END, created_at desc").
		Preload("Profile1").
		Preload("Profile2").
		Preload("Profile3").
		Preload("Profile4").
		Find(&pendingMatches).Error

	if err != nil {
		return nil, err
	}

	return pendingMatches, nil
}

func GetAcceptedMatches(profileId uint, db *gorm.DB) ([]schemas.Matches, error) {
	var pendingMatches []schemas.Matches

	err := db.Preload("Profile1").Preload("Profile2").Preload("Profile3").Preload("Profile4").
		Where("status = 'accepted' AND (profile1_id = ? OR profile2_id = ? OR profile3_id = ? OR profile4_id = ?)", profileId, profileId, profileId, profileId).
		Order("updated_at desc").
		Find(&pendingMatches).Error

	if err != nil {
		return nil, err
	}

	return pendingMatches, nil
}

func GetAllMatches(profileId uint, db *gorm.DB) ([]schemas.Matches, error) {
	var pendingMatches []schemas.Matches

	err := db.
		Where("(profile1_id = ? OR profile2_id = ? OR profile3_id = ? OR profile4_id = ?)", profileId, profileId, profileId, profileId).
		Order("created_at desc").
		Preload("Profile1").Preload("Profile2").Preload("Profile3").Preload("Profile4").
		Find(&pendingMatches).Error

	if err != nil {
		return nil, err
	}

	return pendingMatches, nil
}

func GetMatchByID(matchId uint, db *gorm.DB) (*schemas.Matches, error) {

	var match schemas.Matches

	err := db.Preload("Profile1").Preload("Profile2").Preload("Profile3").Preload("Profile4").
		Where(schemas.Matches{ID: matchId}).
		First(&match).Error

	if err != nil {

		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}

		return nil, nil
	}

	return &match, nil
}

func GetSoloMatchByProfileIDs(profileID uint, targetProfileID uint, db *gorm.DB) (*schemas.Matches, error) {
	var match schemas.Matches

	err := db.
		Preload("Profile1").
		Preload("Profile3").
		Where("is_duo = ? AND ((profile1_id = ? AND profile3_id = ?) OR (profile1_id = ? AND profile3_id = ?))",
			false, profileID, targetProfileID, targetProfileID, profileID).First(&match).Error

	if err != nil {
		return nil, err
	}

	return &match, nil
}

func GetDuoMatchByProfileIDs(profileID uint, friendProfileID uint, targetProfileID uint, db *gorm.DB) (*schemas.Matches, error) {
	var match schemas.Matches

	err := db.
		Preload("Profile1").
		Preload("Profile2").
		Preload("Profile3").
		Preload("Profile4").
		Where("is_duo = ? AND ((profile1_id = ? AND profile2_id = ? AND profile3_id = ?) OR (profile2_id = ? AND profile1_id = ? AND profile3_id = ?))",
			true, profileID, friendProfileID, targetProfileID, profileID, friendProfileID, targetProfileID).First(&match).Error

	if err != nil {
		return nil, err
	}

	return &match, nil
}

func GetMatchesPendingProfile4Decision(profileId uint, db *gorm.DB) ([]schemas.Matches, error) {
	var pendingMatches []schemas.Matches

	err := db.
		Preload("Profile1").
		Preload("Profile2").
		Preload("Profile3").
		Preload("Profile4").
		Where("status = ? AND profile2_id = ?", "pending", profileId).
		Where("profile4_id IS NULL").
		Find(&pendingMatches).Error

	if err != nil {
		return nil, err
	}

	return pendingMatches, nil
}

func GetMatchesBetweenProfiles(profileId1 uint, profileId2 uint, db *gorm.DB) ([]schemas.Matches, error) {
	var matches []schemas.Matches

	err := db.
		Preload("Profile1").
		Preload("Profile2").
		Preload("Profile3").
		Preload("Profile4").
		Where("(profile1_id = ? AND profile3_id = ?) OR "+ // Solo match
			"(profile3_id = ? AND profile1_id = ?) OR "+ // Solo match (reversed)
			"(profile1_id = ? AND profile2_id = ?) OR "+ // Friends in duo (sender side)
			"(profile2_id = ? AND profile1_id = ?) OR "+ // Friends in duo (sender side, reversed)
			"(profile3_id = ? AND profile4_id = ?) OR "+ // Friends in duo (receiver side)
			"(profile4_id = ? AND profile3_id = ?) OR "+ // Friends in duo (receiver side, reversed)
			"(profile1_id = ? AND profile3_id = ? AND profile2_id IS NOT NULL AND profile4_id IS NOT NULL) OR "+ // Duo match
			"(profile3_id = ? AND profile1_id = ? AND profile4_id IS NOT NULL AND profile2_id IS NOT NULL) OR "+ // Duo match (reversed)
			"(profile1_id = ? AND profile4_id = ? AND profile2_id IS NOT NULL AND profile3_id IS NOT NULL) OR "+ // Duo match
			"(profile4_id = ? AND profile1_id = ? AND profile3_id IS NOT NULL AND profile2_id IS NOT NULL) OR "+ // Duo match (reversed)
			"(profile2_id = ? AND profile3_id = ? AND profile1_id IS NOT NULL AND profile4_id IS NOT NULL) OR "+ // Duo match
			"(profile3_id = ? AND profile2_id = ? AND profile4_id IS NOT NULL AND profile1_id IS NOT NULL) OR "+ // Duo match (reversed)
			"(profile2_id = ? AND profile4_id = ? AND profile1_id IS NOT NULL AND profile3_id IS NOT NULL) OR "+ // Duo match
			"(profile4_id = ? AND profile2_id = ? AND profile3_id IS NOT NULL AND profile1_id IS NOT NULL)", // Duo match (reversed)
			profileId1, profileId2,
			profileId1, profileId2,
			profileId1, profileId2,
			profileId1, profileId2,
			profileId1, profileId2,
			profileId1, profileId2,
			profileId1, profileId2,
			profileId1, profileId2,
			profileId1, profileId2,
			profileId1, profileId2,
			profileId1, profileId2,
			profileId1, profileId2,
			profileId1, profileId2,
			profileId1, profileId2).
		Find(&matches).Error

	if err != nil {
		return nil, err
	}

	return matches, nil
}

func UpdateMatchToRejected(matchId uint, db *gorm.DB) error {
	var match schemas.Matches

	if err := db.Where("id = ?", matchId).First(&match).Error; err != nil {
		return err
	}

	if match.Status == "rejected" {
		return nil
	}

	match.Status = "rejected"

	return db.Save(&match).Error
}

func DeleteAllProfileMatches(profileId uint, db *gorm.DB) error {
	var matches []schemas.Matches

	if err := db.Where("profile1_id = ? OR profile2_id = ? OR profile3_id = ? OR profile4_id = ?", profileId, profileId, profileId, profileId).Find(&matches).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Println("No matches found for profile", profileId)
			return nil
		}

		return err
	}

	for _, match := range matches {
		if err := chat.DeleteAllChatMessages(match.ID, db); err != nil {
			return err
		}

		if err := db.Delete(&match).Error; err != nil {
			return err
		}
	}

	return nil
}

func GetFriendshipMatch(profileId uint, friendId uint, db *gorm.DB) (*schemas.Matches, error) {
	var match schemas.Matches

	err := db.Preload("Profile1").Preload("Profile3").Where("is_friend = ? AND ((profile1_id = ? AND profile3_id = ?) OR (profile3_id = ? AND profile1_id = ?))", true, profileId, friendId, profileId, friendId).First(&match).Error

	if err != nil {
		return nil, err
	}

	return &match, nil
}

func DeleteMatch(matchID uint, db *gorm.DB) error {
	// Start a transaction
	tx := db.Begin()

	// Delete the match
	if err := tx.Delete(&schemas.Matches{}, matchID).Error; err != nil {
		tx.Rollback()
		return err
	}

	// The related ProfileViews and Messages will be automatically deleted due to the CASCADE constraint]\]

	// Commit the transaction
	return tx.Commit().Error
}
