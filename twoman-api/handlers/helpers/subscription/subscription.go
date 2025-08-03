package subscription

import (
	"errors"
	"log"
	"time"
	"twoman/schemas"

	"gorm.io/gorm"
)

// IsUserPro checks if a user has an active pro subscription from any source
func IsUserPro(userID uint, db *gorm.DB) (bool, error) {
	// Check legacy PaidUser table first for backward compatibility
	var paidUser schemas.PaidUser
	err := db.Where("user_id = ?", userID).First(&paidUser).Error
	if err == nil {
		return true, nil // Legacy pro user
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return false, err
	}

	// Check new ProSubscriptionV2 table
	var subscription schemas.ProSubscriptionV2
	err = db.Where("user_id = ? AND is_active = ?", userID, true).First(&subscription).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}

	// Check if subscription has expired (for referral rewards)
	if subscription.ExpiresAt != nil && subscription.ExpiresAt.Before(time.Now()) {
		// Mark as inactive
		subscription.IsActive = false
		db.Save(&subscription)
		return false, nil
	}

	return true, nil
}

// UpgradeUserToProRevenueCat creates a pro subscription from RevenueCat
func UpgradeUserToProRevenueCat(userID uint, customerID, productID string, db *gorm.DB) error {
	// Deactivate any existing subscriptions
	err := DeactivateExistingSubscriptions(userID, db)
	if err != nil {
		return err
	}

	// Create new RevenueCat subscription
	subscription := schemas.ProSubscriptionV2{
		UserID:                userID,
		Source:                schemas.SubscriptionSourceRevenueCat,
		Plan:                  getRevenueCatPlan(productID),
		IsActive:              true,
		ExpiresAt:             nil, // RevenueCat manages expiration
		RevenueCatCustomerID:  &customerID,
		RevenueCatProductID:   &productID,
		LastRevenueCatEventAt: timePtr(time.Now()),
	}

	if err := db.Create(&subscription).Error; err != nil {
		return err
	}

	// Also create legacy PaidUser record for backward compatibility
	return createLegacyPaidUser(userID, db)
}

// GrantReferralReward grants a 1-month pro subscription as a referral reward
func GrantReferralReward(userID uint, rewardType string, db *gorm.DB) (*schemas.ProSubscriptionV2, error) {
	// Check if user already has active subscription
	isPro, err := IsUserPro(userID, db)
	if err != nil {
		return nil, err
	}

	var plan string
	switch rewardType {
	case schemas.RewardTypeReferrer:
		plan = schemas.PlanReferralFree
	case schemas.RewardTypeFriend:
		plan = schemas.PlanFriendFree
	default:
		return nil, errors.New("invalid reward type")
	}

	// If user is already pro, we should not override their subscription
	// Instead, we could extend it or queue the reward for later
	if isPro {
		log.Printf("User %d is already pro, skipping referral reward", userID)
		return nil, errors.New("user already has active pro subscription")
	}

	// Create referral reward subscription (1 month)
	expiresAt := time.Now().Add(30 * 24 * time.Hour) // 30 days
	subscription := schemas.ProSubscriptionV2{
		UserID:    userID,
		Source:    getSourceFromRewardType(rewardType),
		Plan:      plan,
		IsActive:  true,
		ExpiresAt: &expiresAt,
	}

	if err := db.Create(&subscription).Error; err != nil {
		return nil, err
	}

	// Create legacy PaidUser record for backward compatibility
	err = createLegacyPaidUser(userID, db)
	if err != nil {
		log.Printf("Warning: Failed to create legacy PaidUser record: %v", err)
	}

	return &subscription, nil
}

// DowngradeUserFromPro removes pro status (called from RevenueCat webhook)
func DowngradeUserFromPro(userID uint, db *gorm.DB) error {
	// Deactivate all subscriptions
	err := DeactivateExistingSubscriptions(userID, db)
	if err != nil {
		return err
	}

	// Remove legacy PaidUser record
	return db.Where("user_id = ?", userID).Delete(&schemas.PaidUser{}).Error
}

// DeactivateExistingSubscriptions marks all user subscriptions as inactive
func DeactivateExistingSubscriptions(userID uint, db *gorm.DB) error {
	return db.Model(&schemas.ProSubscriptionV2{}).
		Where("user_id = ? AND is_active = ?", userID, true).
		Update("is_active", false).Error
}

// CleanupExpiredSubscriptions removes expired referral rewards
func CleanupExpiredSubscriptions(db *gorm.DB) error {
	now := time.Now()
	
	// Find expired subscriptions
	var expiredSubs []schemas.ProSubscriptionV2
	err := db.Where("expires_at IS NOT NULL AND expires_at < ? AND is_active = ?", 
		now, true).Find(&expiredSubs).Error
	if err != nil {
		return err
	}

	// Deactivate expired subscriptions
	for _, sub := range expiredSubs {
		sub.IsActive = false
		if err := db.Save(&sub).Error; err != nil {
			log.Printf("Failed to deactivate expired subscription %d: %v", sub.ID, err)
		}

		// Remove legacy PaidUser if no other active subscriptions
		var activeCount int64
		db.Model(&schemas.ProSubscriptionV2{}).
			Where("user_id = ? AND is_active = ?", sub.UserID, true).
			Count(&activeCount)
		
		if activeCount == 0 {
			db.Where("user_id = ?", sub.UserID).Delete(&schemas.PaidUser{})
		}
	}

	return nil
}

// Helper functions

func getRevenueCatPlan(productID string) string {
	// Map RevenueCat product IDs to plan names
	switch productID {
	case "monthly_pro", "pro_monthly":
		return schemas.PlanMonthly
	case "yearly_pro", "pro_yearly":
		return schemas.PlanYearly
	default:
		return schemas.PlanMonthly // Default
	}
}

func getSourceFromRewardType(rewardType string) string {
	switch rewardType {
	case schemas.RewardTypeReferrer:
		return schemas.SubscriptionSourceReferralReward
	case schemas.RewardTypeFriend:
		return schemas.SubscriptionSourceFriendReward
	default:
		return schemas.SubscriptionSourceReferralReward
	}
}

func createLegacyPaidUser(userID uint, db *gorm.DB) error {
	var existingPaidUser schemas.PaidUser
	err := db.Where("user_id = ?", userID).First(&existingPaidUser).Error
	if err == nil {
		return nil // Already exists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	paidUser := schemas.PaidUser{
		UserID: userID,
		Plan:   "pro", // Generic plan for legacy compatibility
	}

	return db.Create(&paidUser).Error
}

func timePtr(t time.Time) *time.Time {
	return &t
}