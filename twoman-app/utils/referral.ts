import { fetchWithAuth } from './fetch';

export interface ReferralStats {
  referral_code: string;
  completed_count: number;
  pending_count: number;
  remaining_needed: number;
  available_rewards: number;
  reward_threshold: number;
  was_referred: boolean;
}

export interface ReferralReward {
  id: number;
  user_id: number;
  reward_type: 'referrer_reward' | 'friend_reward';
  status: 'eligible' | 'claimed' | 'expired';
  eligible_at: string;
  claimed_at?: string;
  expires_at?: string;
  referral_count: number;
  subscription_id?: number;
}

export interface ReferralRedeemRequest {
  referral_code: string;
}

export interface ReferralRedeemResponse {
  referral_id: number;
  referrer_id: number;
}

export interface ClaimRewardResponse {
  subscription_id: number;
  expires_at: string;
}

// Get user's referral code
export async function getReferralCode(): Promise<{ referral_code: string }> {
  const response = await fetchWithAuth('/v1/referral/code', {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to get referral code');
  }

  const data = await response.json();
  return data.data;
}

// Get referral statistics
export async function getReferralStats(): Promise<ReferralStats> {
  const response = await fetchWithAuth('/v1/referral/stats', {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to get referral stats');
  }

  const data = await response.json();
  return data.data;
}

// Redeem a referral code
export async function redeemReferralCode(referralCode: string): Promise<ReferralRedeemResponse> {
  const response = await fetchWithAuth('/v1/referral/redeem', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ referral_code: referralCode }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to redeem referral code');
  }

  const data = await response.json();
  return data.data;
}

// Complete referral (called when user finishes profile setup)
export async function completeReferral(): Promise<void> {
  const response = await fetchWithAuth('/v1/referral/complete', {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to complete referral');
  }
}

// Get available rewards
export async function getAvailableRewards(): Promise<ReferralReward[]> {
  const response = await fetchWithAuth('/v1/referral/rewards', {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to get available rewards');
  }

  const data = await response.json();
  return data.data;
}

// Claim a referral reward
export async function claimReferralReward(rewardId: number): Promise<ClaimRewardResponse> {
  const response = await fetchWithAuth(`/v1/referral/reward/${rewardId}/claim`, {
    method: 'POST',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to claim reward');
  }

  const data = await response.json();
  return data.data;
}

// Helper to format reward type for display
export function formatRewardType(rewardType: string): string {
  switch (rewardType) {
    case 'referrer_reward':
      return 'Referrer Reward';
    case 'friend_reward':
      return 'Friend Reward';
    default:
      return 'Unknown Reward';
  }
}

// Helper to check if user needs more referrals
export function getReferralProgress(stats: ReferralStats): {
  progress: number;
  isComplete: boolean;
  remaining: number;
} {
  const progress = stats.completed_count / stats.reward_threshold;
  const isComplete = stats.completed_count >= stats.reward_threshold;
  const remaining = Math.max(0, stats.reward_threshold - stats.completed_count);

  return {
    progress: Math.min(1, progress),
    isComplete,
    remaining,
  };
}

// Helper to check if user is eligible to redeem a referral code
export function canRedeemReferralCode(stats: ReferralStats): boolean {
  // User can redeem if they haven't been referred by anyone yet
  return !stats.was_referred;
}