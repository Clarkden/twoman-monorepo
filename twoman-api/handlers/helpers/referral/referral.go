package referral

import (
	"crypto/rand"
	"errors"
	"log"
	"math/big"
	"time"
	"twoman/handlers/helpers/friendship"
	"twoman/schemas"
	"twoman/types"
	"twoman/utils"

	"gorm.io/gorm"
)

const (
	// ReferralCodeLength defines the length of referral codes
	ReferralCodeLength = 8
	// ReferralCodeChars defines the characters used in referral codes (avoiding confusing characters)
	ReferralCodeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	// ReferralRewardThreshold is the number of completed referrals needed for reward
	ReferralRewardThreshold = 3
	// RewardDurationDays is how long referral rewards last (30 days)
	RewardDurationDays = 30
)

// GenerateReferralCode creates a unique 8-character referral code
func GenerateReferralCode() (string, error) {
	code := make([]byte, ReferralCodeLength)
	for i := range code {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(ReferralCodeChars))))
		if err != nil {
			return "", err
		}
		code[i] = ReferralCodeChars[num.Int64()]
	}
	return string(code), nil
}

// CreateReferralCodeForUser generates and stores a unique referral code for a user
func CreateReferralCodeForUser(userID uint, db *gorm.DB) (*schemas.ReferralCode, error) {
	// Check if user already has a referral code
	var existingCode schemas.ReferralCode
	err := db.Where("user_id = ?", userID).First(&existingCode).Error
	if err == nil {
		return &existingCode, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Generate a unique code
	var code string
	for attempts := 0; attempts < 10; attempts++ {
		code, err = GenerateReferralCode()
		if err != nil {
			return nil, err
		}

		// Check if code already exists
		var existingCodeCheck schemas.ReferralCode
		err = db.Where("code = ?", code).First(&existingCodeCheck).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Code is unique, break out of loop
			break
		}
		if err != nil {
			return nil, err
		}
		// Code exists, try again
	}

	if code == "" {
		return nil, errors.New("failed to generate unique referral code after 10 attempts")
	}

	// Create the referral code record
	referralCode := schemas.ReferralCode{
		UserID: userID,
		Code:   code,
	}

	if err := db.Create(&referralCode).Error; err != nil {
		return nil, err
	}

	return &referralCode, nil
}

// ValidateReferralCode checks if a referral code exists and is valid
func ValidateReferralCode(code string, db *gorm.DB) (*schemas.ReferralCode, error) {
	var referralCode schemas.ReferralCode
	err := db.Preload("User").Where("code = ?", code).First(&referralCode).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid referral code")
		}
		return nil, err
	}

	return &referralCode, nil
}

// RedeemReferralCode creates a referral relationship when a user signs up with a referral code
func RedeemReferralCode(referralCode string, referredUserID uint, db *gorm.DB) (*schemas.Referral, error) {
	// Validate the referral code
	refCode, err := ValidateReferralCode(referralCode, db)
	if err != nil {
		return nil, err
	}

	// Prevent self-referral
	if refCode.UserID == referredUserID {
		return nil, errors.New("cannot use your own referral code")
	}

	// Check if user has already been referred
	var existingReferral schemas.Referral
	err = db.Where("referred_id = ?", referredUserID).First(&existingReferral).Error
	if err == nil {
		return nil, errors.New("user has already been referred")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Create the referral relationship
	now := time.Now()
	referral := schemas.Referral{
		ReferrerID:   refCode.UserID,
		ReferredID:   referredUserID,
		ReferralCode: referralCode,
		Status:       schemas.ReferralStatusCompleted, // Mark as completed immediately
		RedeemedAt:   &now,
		CompletedAt:  &now, // Set completed time immediately
	}

	if err := db.Create(&referral).Error; err != nil {
		return nil, err
	}

	// Create friendship between referrer and referred user automatically
	_, err = friendship.CreateAcceptedFriendship(refCode.UserID, referredUserID, db)
	if err != nil {
		log.Printf("Failed to create friendship between referrer and referred user: %v", err)
	}

	return &referral, nil
}

// CompleteReferral marks a referral as completed when the referred user finishes profile setup
func CompleteReferral(referredUserID uint, db *gorm.DB) error {
	var referral schemas.Referral
	err := db.Where("referred_id = ? AND status = ?", referredUserID, schemas.ReferralStatusPending).First(&referral).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil // No pending referral found, that's fine
		}
		return err
	}

	// Mark referral as completed
	now := time.Now()
	referral.Status = schemas.ReferralStatusCompleted
	referral.CompletedAt = &now

	if err := db.Save(&referral).Error; err != nil {
		return err
	}

	// Check if referrer is eligible for reward
	return CheckAndCreateReferrerReward(referral.ReferrerID, db)
}

// CheckAndCreateReferrerReward checks if a user has enough completed referrals for a reward
func CheckAndCreateReferrerReward(referrerID uint, db *gorm.DB) error {
	// Count completed referrals
	var completedCount int64
	err := db.Model(&schemas.Referral{}).Where("referrer_id = ? AND status = ?",
		referrerID, schemas.ReferralStatusCompleted).Count(&completedCount).Error
	if err != nil {
		return err
	}

	// Check if user reached the threshold and doesn't already have a reward
	if completedCount >= ReferralRewardThreshold {
		var existingReward schemas.ReferralReward
		err = db.Where("user_id = ? AND reward_type = ?",
			referrerID, schemas.RewardTypeReferrer).First(&existingReward).Error

		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create reward
			reward := schemas.ReferralReward{
				UserID:        referrerID,
				RewardType:    schemas.RewardTypeReferrer,
				Status:        schemas.RewardStatusEligible,
				EligibleAt:    time.Now(),
				ReferralCount: int(completedCount),
			}

			if err := db.Create(&reward).Error; err != nil {
				return err
			}
		} else if err != nil {
			return err
		}
	}

	return nil
}

// CreateFriendReward creates a reward for a referred friend
func CreateFriendReward(referredUserID uint, db *gorm.DB) (*schemas.ReferralReward, error) {
	// Check if friend already has a reward
	var existingReward schemas.ReferralReward
	err := db.Where("user_id = ? AND reward_type = ?",
		referredUserID, schemas.RewardTypeFriend).First(&existingReward).Error

	if err == nil {
		return &existingReward, nil // Already has reward
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Create friend reward
	reward := schemas.ReferralReward{
		UserID:     referredUserID,
		RewardType: schemas.RewardTypeFriend,
		Status:     schemas.RewardStatusEligible,
		EligibleAt: time.Now(),
	}

	if err := db.Create(&reward).Error; err != nil {
		return nil, err
	}

	return &reward, nil
}

// GetReferralStats returns referral statistics for a user
func GetReferralStats(userID uint, db *gorm.DB) (*types.ReferralStats, error) {
	// Get or create referral code
	referralCodeRecord, err := CreateReferralCodeForUser(userID, db)
	if err != nil {
		return nil, err
	}

	// Count completed referrals
	var completedCount int64
	db.Model(&schemas.Referral{}).Where("referrer_id = ? AND status = ?",
		userID, schemas.ReferralStatusCompleted).Count(&completedCount)

	// Count pending referrals
	var pendingCount int64
	db.Model(&schemas.Referral{}).Where("referrer_id = ? AND status = ?",
		userID, schemas.ReferralStatusPending).Count(&pendingCount)

	// Check for available rewards
	var availableRewards []schemas.ReferralReward
	db.Where("user_id = ? AND status = ?", userID, schemas.RewardStatusEligible).Find(&availableRewards)

	// Check if user was referred by someone
	var wasReferred bool
	var referralRecord schemas.Referral
	if err := db.Where("referred_user_id = ?", userID).First(&referralRecord).Error; err == nil {
		wasReferred = true
	}

	stats := &types.ReferralStats{
		CompletedCount:   completedCount,
		PendingCount:     pendingCount,
		RemainingNeeded:  utils.Max(0, ReferralRewardThreshold-int(completedCount)),
		AvailableRewards: len(availableRewards),
		RewardThreshold:  ReferralRewardThreshold,
		WasReferred:      wasReferred,
		CanRedeemCode:    !wasReferred, // Can redeem code if they weren't referred by someone
	}

	stats.ReferralCode = referralCodeRecord.Code

	return stats, nil
}
