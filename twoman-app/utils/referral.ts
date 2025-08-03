import { User } from "@/types/api";
import apiFetch from "./fetch";

export interface ReferralStats {
  referral_code: string;
  completed_count: number;
  pending_count: number;
  remaining_needed: number;
  available_rewards: number;
  reward_threshold: number;
  was_referred: boolean;
  can_redeem_code: boolean;
}

export interface ReferralReward {
  ID: number;
  CreatedAt: string;
  UpdatedAt: string;
  UserID: number;
  RewardType: "referrer_reward" | "friend_reward";
  Status: "eligible" | "claimed" | "expired";
  EligibleAt: string;
  ClaimedAt?: string;
  ExpiresAt?: string;
  ReferralCount: number;
  SubscriptionID?: number;
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
export async function getReferralCode() {
  const response = await apiFetch<{ referral_code: string }>("/referral/code", {
    method: "GET",
  });

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data.referral_code;
}

// Get referral statistics
export async function getReferralStats(): Promise<ReferralStats> {
  const response = await apiFetch<ReferralStats>("/referral/stats", {
    method: "GET",
  });

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
}

// Redeem a referral code
export async function redeemReferralCode(
  referralCode: string,
): Promise<ReferralRedeemResponse> {
  const response = await apiFetch<ReferralRedeemResponse>("/referral/redeem", {
    method: "POST",
    body: { referral_code: referralCode },
  });

  if (!response.success) {
    throw new Error(response.error || "Failed to redeem referral code");
  }

  return response.data;
}

// Complete referral (called when user finishes profile setup)
export async function completeReferral(): Promise<void> {
  const response = await apiFetch("/referral/complete", {
    method: "POST",
  });

  if (!response.success) {
    throw new Error(response.error);
  }
}

// Get available rewards
export async function getAvailableRewards(): Promise<ReferralReward[]> {
  const response = await apiFetch<ReferralReward[]>("/referral/rewards", {
    method: "GET",
  });

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
}

// Claim a referral reward
export async function claimReferralReward(
  rewardId: number,
): Promise<ClaimRewardResponse> {
  const response = await apiFetch<ClaimRewardResponse>(
    `/referral/reward/${rewardId}/claim`,
    {
      method: "POST",
    },
  );

  if (!response.success) {
    throw new Error(response.error || "Failed to claim reward");
  }

  return response.data;
}

// Helper to format reward type for display
export function formatRewardType(
  rewardType: "referrer_reward" | "friend_reward",
): string {
  switch (rewardType) {
    case "referrer_reward":
      return "Referrer Reward";
    case "friend_reward":
      return "Friend Reward";
    default:
      return "Unknown Reward";
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
