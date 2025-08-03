package types

// ReferralStats represents user referral statistics and progress
type ReferralStats struct {
	ReferralCode     string `json:"referral_code"`     // User's unique referral code
	CompletedCount   int64  `json:"completed_count"`   // Number of completed referrals
	PendingCount     int64  `json:"pending_count"`     // Number of pending referrals
	RemainingNeeded  int    `json:"remaining_needed"`  // Referrals needed for next reward
	AvailableRewards int    `json:"available_rewards"` // Number of unclaimed rewards
	RewardThreshold  int    `json:"reward_threshold"`  // Total referrals needed for reward
	WasReferred      bool   `json:"was_referred"`      // Whether this user was referred by someone
}

// ReferralCodeRequest represents a request to redeem a referral code
type ReferralCodeRequest struct {
	ReferralCode string `json:"referral_code" validate:"required,len=8"`
}

// ReferralRewardClaim represents a request to claim a referral reward
type ReferralRewardClaim struct {
	RewardID uint `json:"reward_id" validate:"required"`
}