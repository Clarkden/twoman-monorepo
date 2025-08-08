import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type ReviewState = {
  lastPromptDate: string | null;
  promptCount: number;
  hasRatedApp: boolean;
  sessionPromptShown: boolean;
  milestoneEvents: {
    firstMatch: boolean;
    thirdMatch: boolean;
    seventhMatch: boolean;
    firstChat: boolean;
    onboardingComplete: boolean;
  };

  // Actions
  setLastPromptDate(date: string): void;
  incrementPromptCount(): void;
  setHasRatedApp(hasRated: boolean): void;
  setSessionPromptShown(shown: boolean): void;
  markMilestone(milestone: keyof ReviewState["milestoneEvents"]): void;
  canShowPrompt(): boolean;
  resetSession(): void;
};

export const useReviewStore = create(
  persist<ReviewState>(
    (set, get) => ({
      lastPromptDate: null,
      promptCount: 0,
      hasRatedApp: false,
      sessionPromptShown: false,
      milestoneEvents: {
        firstMatch: false,
        thirdMatch: false,
        seventhMatch: false,
        firstChat: false,
        onboardingComplete: false,
      },

      setLastPromptDate: (date: string) => {
        set({ lastPromptDate: date });
      },

      incrementPromptCount: () => {
        set((state) => ({ promptCount: state.promptCount + 1 }));
      },

      setHasRatedApp: (hasRated: boolean) => {
        set({ hasRatedApp: hasRated });
      },

      setSessionPromptShown: (shown: boolean) => {
        set({ sessionPromptShown: shown });
      },

      markMilestone: (milestone) => {
        set((state) => ({
          milestoneEvents: {
            ...state.milestoneEvents,
            [milestone]: true,
          },
        }));
      },

      canShowPrompt: () => {
        const state = get();

        // Don't show if user already rated
        if (state.hasRatedApp) return false;

        // Don't show more than once per session
        if (state.sessionPromptShown) return false;

        // Don't show if prompted in last 30 days
        if (state.lastPromptDate) {
          const lastPrompt = new Date(state.lastPromptDate);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          if (lastPrompt > thirtyDaysAgo) return false;
        }

        // Don't show more than 3 times total
        if (state.promptCount >= 3) return false;

        return true;
      },

      resetSession: () => {
        set({ sessionPromptShown: false });
      },
    }),
    {
      name: "reviewStore",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
