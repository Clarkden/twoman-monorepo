import * as StoreReview from "expo-store-review";
import { useReviewStore } from "@/stores/reviewStore";
import * as Sentry from "@sentry/react-native";
import appsFlyer from "react-native-appsflyer";

type ReviewStoreState = ReturnType<typeof useReviewStore.getState>;
type MilestoneKey = keyof ReviewStoreState["milestoneEvents"];

export type ReviewTrigger =
  | "first_match"
  | "multiple_matches"
  | "first_chat"
  | "onboarding_complete";

type ReviewPromptOptions = {
  trigger: ReviewTrigger;
  data?: {
    matchCount?: number;
    chatId?: string;
  };
};

class ReviewPromptManager {
  private static instance: ReviewPromptManager;

  static getInstance(): ReviewPromptManager {
    if (!ReviewPromptManager.instance) {
      ReviewPromptManager.instance = new ReviewPromptManager();
    }
    return ReviewPromptManager.instance;
  }

  /**
   * Check if we should show a review prompt for a specific trigger
   */
  shouldShowPrompt(options: ReviewPromptOptions): boolean {
    const store = useReviewStore.getState();

    // Check basic eligibility
    if (!store.canShowPrompt()) {
      return false;
    }

    // Check trigger-specific conditions
    switch (options.trigger) {
      case "first_match":
        return !store.milestoneEvents.firstMatch;

      case "multiple_matches":
        // Show after 3rd or 7th match
        const matchCount = options.data?.matchCount || 0;
        return (
          (matchCount === 3 && !store.milestoneEvents.thirdMatch) ||
          (matchCount === 7 && !store.milestoneEvents.seventhMatch)
        );

      case "first_chat":
        return !store.milestoneEvents.firstChat;

      case "onboarding_complete":
        return !store.milestoneEvents.onboardingComplete;

      default:
        return false;
    }
  }

  /**
   * Mark that a milestone has been reached (but don't necessarily show prompt)
   */
  markMilestone(milestone: MilestoneKey): void {
    const store = useReviewStore.getState();
    store.markMilestone(milestone);

    // Analytics tracking for milestones
    try {
      // Track with AppsFlyer
      appsFlyer.logEvent("review_milestone_reached", {
        milestone: milestone,
        timestamp: new Date().toISOString(),
      });

      // Track with Sentry
      Sentry.addBreadcrumb({
        message: `Review milestone reached: ${milestone}`,
        level: "info",
        data: {
          milestone: milestone,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error tracking review milestone:", error);
    }
  }

  /**
   * Record that a review prompt was shown
   */
  recordPromptShown(): void {
    const store = useReviewStore.getState();
    const now = new Date().toISOString();

    store.setLastPromptDate(now);
    store.incrementPromptCount();
    store.setSessionPromptShown(true);

    // Analytics tracking
    try {
      // Track with AppsFlyer
      appsFlyer.logEvent("review_prompt_shown", {
        prompt_count: store.promptCount + 1,
        timestamp: now,
      });

      // Track with Sentry
      Sentry.addBreadcrumb({
        message: "Review prompt shown",
        level: "info",
        data: {
          prompt_count: store.promptCount + 1,
          timestamp: now,
        },
      });
    } catch (error) {
      console.error("Error tracking review prompt:", error);
    }
  }

  /**
   * Open the native app store review dialog
   */
  async requestReview(): Promise<void> {
    try {
      const isAvailable = await StoreReview.isAvailableAsync();

      if (isAvailable) {
        await StoreReview.requestReview();

        // Mark that user has rated (they probably did if the dialog showed)
        const store = useReviewStore.getState();
        store.setHasRatedApp(true);

        console.log("Review request completed");

        // Analytics tracking for successful review request
        try {
          // Track with AppsFlyer
          appsFlyer.logEvent("review_requested", {
            prompt_count: store.promptCount,
            timestamp: new Date().toISOString(),
          });

          // Track with Sentry
          Sentry.addBreadcrumb({
            message: "Review dialog shown to user",
            level: "info",
            data: {
              prompt_count: store.promptCount,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (analyticsError) {
          console.error("Error tracking review request:", analyticsError);
        }
      } else {
        console.log("Store review not available");

        // Track unavailable review dialog
        try {
          appsFlyer.logEvent("review_unavailable", {
            prompt_count: useReviewStore.getState().promptCount,
          });
        } catch (analyticsError) {
          console.error("Error tracking review unavailable:", analyticsError);
        }
      }
    } catch (error) {
      console.error("Error requesting review:", error);

      // Track review request error
      try {
        Sentry.captureException(error, {
          tags: { component: "review_prompt" },
        });
      } catch (analyticsError) {
        console.error("Error tracking review error:", analyticsError);
      }
    }
  }

  /**
   * Reset session state (call when app starts)
   */
  resetSession(): void {
    const store = useReviewStore.getState();
    store.resetSession();
  }

  /**
   * Get current review state (useful for debugging)
   */
  getState() {
    return useReviewStore.getState();
  }
}

export const reviewPromptManager = ReviewPromptManager.getInstance();

// Convenience functions
export const shouldShowReviewPrompt = (options: ReviewPromptOptions) =>
  reviewPromptManager.shouldShowPrompt(options);

export const markReviewMilestone = (milestone: MilestoneKey) =>
  reviewPromptManager.markMilestone(milestone);

export const requestAppReview = () => reviewPromptManager.requestReview();

export const recordReviewPromptShown = () =>
  reviewPromptManager.recordPromptShown();

export const resetReviewSession = () => reviewPromptManager.resetSession();
