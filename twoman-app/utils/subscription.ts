import apiFetch from "./fetch";

export interface SubscriptionInfo {
  is_pro: boolean;
  plan: string;
  source: string;
  expires_at: string | null;
  is_active: boolean;
}

// Get user's subscription status from backend
export async function getSubscriptionStatus(): Promise<SubscriptionInfo> {
  const response = await apiFetch<SubscriptionInfo>("/subscription/status", {
    method: "GET",
  });

  console.log("Subscription status:", response.data);

  if (!response.success) {
    throw new Error(response.error || "Failed to get subscription status");
  }

  return response.data;
}

// Helper to check if user has active Pro subscription
export async function isUserPro(): Promise<boolean> {
  try {
    const status = await getSubscriptionStatus();
    return status.is_pro && status.is_active;
  } catch (error) {
    console.error("Error checking Pro status:", error);
    return false;
  }
}

// Helper to format subscription source for display
export function formatSubscriptionSource(source: string): string {
  switch (source) {
    case "revenuecat":
      return "Subscription";
    case "referral_reward":
      return "Referral Reward";
    case "friend_reward":
      return "Friend Reward";
    case "legacy":
      return "Legacy Pro";
    default:
      return "Pro";
  }
}

// Helper to get time remaining until expiration
export function getTimeRemaining(expiresAt: string | null): {
  days: number;
  hours: number;
  minutes: number;
  isExpired: boolean;
} {
  if (!expiresAt) {
    return { days: 0, hours: 0, minutes: 0, isExpired: false };
  }

  const now = new Date();
  const expiration = new Date(expiresAt);
  const timeRemaining = expiration.getTime() - now.getTime();

  if (timeRemaining <= 0) {
    return { days: 0, hours: 0, minutes: 0, isExpired: true };
  }

  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, isExpired: false };
}
