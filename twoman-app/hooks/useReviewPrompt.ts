import {
  shouldShowReviewPrompt,
  requestAppReview,
  recordReviewPromptShown,
  ReviewTrigger,
} from "@/utils/reviewPrompt";

type UseReviewPromptOptions = {
  trigger: ReviewTrigger;
  data?: {
    matchCount?: number;
    chatId?: string;
  };
};

export function useReviewPrompt(options: UseReviewPromptOptions) {
  const checkAndShowPrompt = async () => {
    if (shouldShowReviewPrompt(options)) {
      recordReviewPromptShown();
      await requestAppReview();
    }
  };

  return {
    checkAndShowPrompt,
    trigger: options.trigger,
  };
}
