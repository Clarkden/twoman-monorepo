import { create } from "zustand";
import {
  getSubscriptionStatus,
  type SubscriptionInfo,
} from "@/utils/subscription";
import Purchases from "react-native-purchases";
import { AppState } from "react-native";

interface SubscriptionState {
  subscriptionInfo: SubscriptionInfo | null;
  isLoading: boolean;
  lastFetched: Date | null;

  // Star balance
  starBalance: number;
  starBalanceLoading: boolean;
  lastStarFetched: Date | null;

  // Actions
  fetchSubscriptionStatus: () => Promise<void>;
  refreshSubscriptionStatus: () => Promise<void>;
  clearSubscriptionInfo: () => void;

  // Star actions
  fetchStarBalance: () => Promise<void>;
  refreshStarBalance: () => Promise<void>;
  deductStars: (amount: number) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptionInfo: null,
  isLoading: false,
  lastFetched: null,

  starBalance: 0,
  starBalanceLoading: false,
  lastStarFetched: null,

  fetchSubscriptionStatus: async () => {
    const state = get();

    // Don't fetch if already loading or recently fetched (within 30 seconds)
    if (
      state.isLoading ||
      (state.lastFetched && Date.now() - state.lastFetched.getTime() < 30000)
    ) {
      return;
    }

    set({ isLoading: true });

    try {
      console.log("Fetching subscription status from store...");
      const subscriptionInfo = await getSubscriptionStatus();
      console.log("Subscription status fetched:", subscriptionInfo);

      set({
        subscriptionInfo,
        isLoading: false,
        lastFetched: new Date(),
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      set({
        isLoading: false,
        subscriptionInfo: {
          is_pro: false,
          is_active: false,
          plan: "",
          source: "",
          expires_at: null,
        },
      });
    }
  },

  refreshSubscriptionStatus: async () => {
    // Force refresh by clearing lastFetched
    set({ lastFetched: null });
    return get().fetchSubscriptionStatus();
  },

  clearSubscriptionInfo: () => {
    set({
      subscriptionInfo: null,
      lastFetched: null,
      starBalance: 0,
      lastStarFetched: null,
    });
  },

  fetchStarBalance: async () => {
    const state = get();

    // Don't fetch if already loading or recently fetched (within 30 seconds)
    if (
      state.starBalanceLoading ||
      (state.lastStarFetched &&
        Date.now() - state.lastStarFetched.getTime() < 30000)
    ) {
      return;
    }

    set({ starBalanceLoading: true });

    try {
      console.log("Fetching star balance from RevenueCat...");
      const virtualCurrencies = await Purchases.getVirtualCurrencies();
      const starBalance = virtualCurrencies.all.STR?.balance || 0;
      console.log("Star balance fetched:", starBalance);

      set({
        starBalance,
        starBalanceLoading: false,
        lastStarFetched: new Date(),
      });
    } catch (error) {
      console.error("Error fetching star balance:", error);
      set({
        starBalanceLoading: false,
        starBalance: 0,
      });
    }
  },

  refreshStarBalance: async () => {
    // Force refresh by clearing lastStarFetched
    set({ lastStarFetched: null });
    return get().fetchStarBalance();
  },

  deductStars: (amount: number) => {
    // Optimistic update - deduct stars immediately
    const currentBalance = get().starBalance;
    const newBalance = Math.max(0, currentBalance - amount);
    set({ starBalance: newBalance });

    // Refresh from server after a short delay to get actual balance
    setTimeout(() => {
      get().refreshStarBalance();
    }, 2000);
  },
}));

// Computed selectors that can be used in components
export const useIsPro = () =>
  useSubscriptionStore((state) => state.subscriptionInfo?.is_pro ?? false);
export const useIsActive = () =>
  useSubscriptionStore((state) => state.subscriptionInfo?.is_active ?? false);
export const useExpiresAt = () =>
  useSubscriptionStore((state) => {
    const expiresAt = state.subscriptionInfo?.expires_at;
    return expiresAt ? new Date(expiresAt) : null;
  });
export const useSource = () =>
  useSubscriptionStore((state) => state.subscriptionInfo?.source ?? "");
export const usePlan = () =>
  useSubscriptionStore((state) => state.subscriptionInfo?.plan ?? "");

// Star balance selectors
export const useStarBalance = () =>
  useSubscriptionStore((state) => state.starBalance);
export const useStarBalanceLoading = () =>
  useSubscriptionStore((state) => state.starBalanceLoading);
export const useFetchStarBalance = () =>
  useSubscriptionStore((state) => state.fetchStarBalance);
export const useRefreshStarBalance = () =>
  useSubscriptionStore((state) => state.refreshStarBalance);
export const useDeductStars = () =>
  useSubscriptionStore((state) => state.deductStars);
