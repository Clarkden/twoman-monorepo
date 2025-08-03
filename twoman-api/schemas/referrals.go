package schemas

import "time"

// ReferralCode stores unique referral codes for each user
type ReferralCode struct {
	ID        uint      `gorm:"primarykey"`
	CreatedAt time.Time
	UpdatedAt time.Time
	UserID    uint   `gorm:"unique;not null"`
	Code      string `gorm:"unique;size:8;not null"`
	User      User   `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

// Referral tracks referral relationships between users
type Referral struct {
	ID           uint       `gorm:"primarykey"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
	ReferrerID   uint       `gorm:"not null"`                                                                      // User who sent the referral
	ReferredID   uint       `gorm:"not null"`                                                                      // User who was referred
	ReferralCode string     `gorm:"size:8;not null"`                                                              // The referral code used
	Status       string     `gorm:"type:enum('pending','completed','rewarded');default:'pending'"`               // Referral completion status
	RedeemedAt   *time.Time                                                                                       // When the referral code was redeemed
	CompletedAt  *time.Time                                                                                       // When the referred user completed setup
	Referrer     User       `gorm:"foreignKey:ReferrerID;constraint:OnDelete:CASCADE"`
	Referred     User       `gorm:"foreignKey:ReferredID;constraint:OnDelete:CASCADE"`
}

// ProSubscriptionV2 enhanced subscription management that works with RevenueCat
// This will eventually replace PaidUser table
type ProSubscriptionV2 struct {
	ID                    uint       `gorm:"primarykey"`
	CreatedAt             time.Time
	UpdatedAt             time.Time
	UserID                uint       `gorm:"not null"`
	Source                string     `gorm:"type:enum('revenuecat','referral_reward','friend_reward');not null"`  // Subscription source
	Plan                  string     `gorm:"type:enum('monthly','yearly','referral_free','friend_free')"`         // Subscription plan type
	IsActive              bool       `gorm:"default:true"`
	ExpiresAt             *time.Time                                                                               // For referral rewards (1 month), nil for RevenueCat subscriptions
	RevenueCatCustomerID  *string    `gorm:"size:100"`                                                            // RevenueCat customer ID
	RevenueCatProductID   *string    `gorm:"size:100"`                                                            // RevenueCat product identifier
	LastRevenueCatEventAt *time.Time                                                                              // Last time we received RevenueCat webhook
	User                  User       `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

// ReferralReward tracks reward eligibility and redemption
type ReferralReward struct {
	ID              uint      `gorm:"primarykey"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
	UserID          uint      `gorm:"not null"`
	RewardType      string    `gorm:"type:enum('referrer_reward','friend_reward');not null"`   // Type of reward
	Status          string    `gorm:"type:enum('eligible','claimed','expired');not null"`      // Reward status
	EligibleAt      time.Time                                                                   // When the reward became eligible
	ClaimedAt       *time.Time                                                                  // When the reward was claimed
	ExpiresAt       *time.Time                                                                  // When the reward expires if not claimed
	ReferralCount   int       `gorm:"default:0"`                                               // Number of completed referrals (for referrer rewards)
	SubscriptionID  *uint                                                                      // Reference to the ProSubscriptionV2 created
	User            User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

// Constants for referral status
const (
	ReferralStatusPending   = "pending"
	ReferralStatusCompleted = "completed" 
	ReferralStatusRewarded  = "rewarded"
)

// Constants for subscription sources
const (
	SubscriptionSourceRevenueCat     = "revenuecat"
	SubscriptionSourceReferralReward = "referral_reward"
	SubscriptionSourceFriendReward   = "friend_reward"
)

// Constants for subscription plans
const (
	// RevenueCat plans
	PlanMonthly = "monthly"
	PlanYearly  = "yearly"
	
	// Referral reward plans (1 month free)
	PlanReferralFree = "referral_free"
	PlanFriendFree   = "friend_free"
)

// Constants for reward types
const (
	RewardTypeReferrer = "referrer_reward"
	RewardTypeFriend   = "friend_reward"
)

// Constants for reward status
const (
	RewardStatusEligible = "eligible"
	RewardStatusClaimed  = "claimed"
	RewardStatusExpired  = "expired"
)