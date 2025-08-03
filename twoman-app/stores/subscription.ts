import { create } from 'zustand';
import { getSubscriptionStatus, type SubscriptionInfo } from '@/utils/subscription';

interface SubscriptionState {
  subscriptionInfo: SubscriptionInfo | null;
  isLoading: boolean;
  lastFetched: Date | null;
  
  // Actions
  fetchSubscriptionStatus: () => Promise<void>;
  refreshSubscriptionStatus: () => Promise<void>;
  clearSubscriptionInfo: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptionInfo: null,
  isLoading: false,
  lastFetched: null,
  
  fetchSubscriptionStatus: async () => {
    const state = get();
    
    // Don't fetch if already loading or recently fetched (within 30 seconds)
    if (state.isLoading || (state.lastFetched && Date.now() - state.lastFetched.getTime() < 30000)) {
      return;
    }
    
    set({ isLoading: true });
    
    try {
      console.log('Fetching subscription status from store...');
      const subscriptionInfo = await getSubscriptionStatus();
      console.log('Subscription status fetched:', subscriptionInfo);
      
      set({
        subscriptionInfo,
        isLoading: false,
        lastFetched: new Date(),
      });
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      set({
        isLoading: false,
        subscriptionInfo: {
          is_pro: false,
          is_active: false,
          plan: '',
          source: '',
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
    });
  },
}));

// Computed selectors that can be used in components
export const useIsPro = () => useSubscriptionStore(state => state.subscriptionInfo?.is_pro ?? false);
export const useIsActive = () => useSubscriptionStore(state => state.subscriptionInfo?.is_active ?? false);
export const useExpiresAt = () => useSubscriptionStore(state => {
  const expiresAt = state.subscriptionInfo?.expires_at;
  return expiresAt ? new Date(expiresAt) : null;
});
export const useSource = () => useSubscriptionStore(state => state.subscriptionInfo?.source ?? '');
export const usePlan = () => useSubscriptionStore(state => state.subscriptionInfo?.plan ?? '');