package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"
	"twoman/globals"
	"twoman/handlers/helpers/matches"
	"twoman/handlers/helpers/notifications"
	"twoman/handlers/helpers/profile"
	"twoman/handlers/helpers/referral"
	"twoman/handlers/helpers/subscription"
	"twoman/handlers/response"
	"twoman/schemas"
	"twoman/types"

	"github.com/getsentry/sentry-go"
)

// @Summary Get Referral Code
// @Description Get the user's referral code (creates one if it doesn't exist)
// @Tags Referral
// @Accept json
// @Produce json
// @Success 200 {object} types.Response
// @Failure 500 {object} types.Response
// @Router /referral/code [get]
func (h Handler) HandleGetReferralCode() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)
		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {
		default:
			referralCode, err := referral.CreateReferralCodeForUser(session.UserID, h.DB(r))
			if err != nil {
				log.Println("Error creating referral code:", err)
				sentry.CaptureException(err)
				response.InternalServerError(w, err, "Failed to get referral code")
				return
			}

			response.OKWithData(w, "OK", map[string]string{
				"referral_code": referralCode.Code,
			})
		}
	})
}

// @Summary Redeem Referral Code
// @Description Redeem a referral code during user registration
// @Tags Referral
// @Accept json
// @Produce json
// @Param request body types.ReferralCodeRequest true "Referral code to redeem"
// @Success 200 {object} types.Response
// @Failure 400 {object} types.Response
// @Failure 409 {object} types.Response
// @Failure 500 {object} types.Response
// @Router /referral/redeem [post]
func (h Handler) HandleRedeemReferralCode() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)
		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {
		default:
			var req types.ReferralCodeRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				response.BadRequest(w, "Invalid request body")
				return
			}

			if len(req.ReferralCode) != 8 {
				response.BadRequest(w, "Referral code must be 8 characters")
				return
			}

			referralRecord, err := referral.RedeemReferralCode(req.ReferralCode, session.UserID, h.DB(r))
			if err != nil {
				log.Println("Error redeeming referral code:", err)
				sentry.CaptureException(err)
				switch err.Error() {
				case "invalid referral code":
					response.BadRequest(w, "Invalid referral code")
				case "cannot use your own referral code":
					response.BadRequest(w, "Cannot use your own referral code")
				case "user has already been referred":
					response.Conflict(w, "User has already been referred")
				default:
					response.InternalServerError(w, err, "Failed to redeem referral code")
				}
				return
			}

			// Create friend reward for the referred user
			friendReward, err := referral.CreateFriendReward(session.UserID, h.DB(r))
			if err != nil {
				log.Println("Error creating friend reward:", err)
				sentry.CaptureException(err)
				// Don't fail the request for this
			} else {
				// Grant the Pro subscription immediately for the referral reward
				sub, err := subscription.GrantReferralReward(session.UserID, friendReward.RewardType, h.DB(r))
				if err != nil {
					log.Println("Error granting referral subscription:", err)
					sentry.CaptureException(err)
					// Don't fail the request for this
				} else {
					// Mark reward as claimed
					friendReward.Status = schemas.RewardStatusClaimed
					now := time.Now()
					friendReward.ClaimedAt = &now
					friendReward.SubscriptionID = &sub.ID

					if err := h.DB(r).Save(friendReward).Error; err != nil {
						log.Println("Error updating friend reward status:", err)
						sentry.CaptureException(err)
						// Don't fail the request for this
					}
				}
			}

			// Create friend match so they can chat
			_, err = matches.CreateFriendMatch(referralRecord.ReferrerID, session.UserID, h.DB(r))
			if err != nil {
				log.Printf("Error creating friend match for referral: %v", err)
				// Don't fail the request for this
			}

			// Send notification to referrer about successful referral
			go func() {
				// Get referred user's profile for the notification
				referredProfile, err := profile.GetProfileById(session.UserID, h.DB(r))
				if err != nil {
					log.Printf("Error getting referred user profile for notification: %v", err)
					return
				}

				// Get updated referral stats for the referrer
				stats, err := referral.GetReferralStats(referralRecord.ReferrerID, h.DB(r))
				if err != nil {
					log.Printf("Error getting referral stats for notification: %v", err)
					return
				}

				// Send notification using new V2 system
				err = notifications.SendReferralSuccessNotificationV2(
					referralRecord.ReferrerID,
					referredProfile.Name,
					stats.CompletedCount,
					stats.RemainingNeeded,
					h.DB(r),
				)
				if err != nil {
					log.Printf("Error sending referral notification: %v", err)
				} else {
					log.Printf("Sent referral success notification to user %d", referralRecord.ReferrerID)
				}
			}()

			response.OKWithData(w, "Referral code redeemed successfully", map[string]interface{}{
				"referral_id": referralRecord.ID,
				"referrer_id": referralRecord.ReferrerID,
			})
		}
	})
}

// @Summary Get Referral Statistics
// @Description Get user's referral statistics and progress
// @Tags Referral
// @Accept json
// @Produce json
// @Success 200 {object} types.Response
// @Failure 500 {object} types.Response
// @Router /referral/stats [get]
func (h Handler) HandleGetReferralStats() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)
		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {
		default:
			stats, err := referral.GetReferralStats(session.UserID, h.DB(r))
			if err != nil {
				log.Println("Error getting referral stats:", err)
				sentry.CaptureException(err)
				response.InternalServerError(w, err, "Failed to get referral statistics")
				return
			}

			response.OKWithData(w, "OK", stats)
		}
	})
}

// @Summary Complete Referral
// @Description Mark a referral as completed when user finishes profile setup (internal endpoint)
// @Tags Referral
// @Accept json
// @Produce json
// @Success 200 {object} types.Response
// @Failure 500 {object} types.Response
// @Router /referral/complete [post]
func (h Handler) HandleCompleteReferral() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)
		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {
		default:
			err := referral.CompleteReferral(session.UserID, h.DB(r))
			if err != nil {
				log.Println("Error completing referral:", err)
				sentry.CaptureException(err)
				response.InternalServerError(w, err, "Failed to complete referral")
				return
			}

			response.OK(w, "Referral completed successfully")
		}
	})
}

// @Summary Claim Referral Reward
// @Description Claim an available referral reward (1 month Pro)
// @Tags Referral
// @Accept json
// @Produce json
// @Param rewardId path string true "Reward ID to claim"
// @Success 200 {object} types.Response
// @Failure 400 {object} types.Response
// @Failure 404 {object} types.Response
// @Failure 409 {object} types.Response
// @Failure 500 {object} types.Response
// @Router /referral/reward/{rewardId}/claim [post]
func (h Handler) HandleClaimReferralReward() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)
		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {
		default:
			rewardIdStr := r.PathValue("rewardId")
			if rewardIdStr == "" {
				response.BadRequest(w, "Reward ID is required")
				return
			}

			rewardId, err := strconv.ParseUint(rewardIdStr, 10, 64)
			if err != nil {
				response.BadRequest(w, "Invalid reward ID")
				return
			}

			// Get the reward
			var reward schemas.ReferralReward
			err = h.DB(r).Where("id = ? AND user_id = ? AND status = ?",
				uint(rewardId), session.UserID, schemas.RewardStatusEligible).First(&reward).Error
			if err != nil {
				log.Println("Error getting reward:", err)
				sentry.CaptureException(err)
				response.NotFound(w, "Reward not found or already claimed")
				return
			}

			// Check if user already has active subscription
			isPro, err := subscription.IsUserPro(session.UserID, h.DB(r))
			if err != nil {
				log.Println("Error checking pro status:", err)
				sentry.CaptureException(err)
				response.InternalServerError(w, err, "Failed to check subscription status")
				return
			}

			if isPro {
				response.Conflict(w, "User already has active Pro subscription")
				return
			}

			// Grant the reward
			sub, err := subscription.GrantReferralReward(session.UserID, reward.RewardType, h.DB(r))
			if err != nil {
				log.Println("Error granting reward:", err)
				sentry.CaptureException(err)
				response.InternalServerError(w, err, "Failed to grant reward")
				return
			}

			// Mark reward as claimed
			reward.Status = schemas.RewardStatusClaimed
			now := time.Now()
			reward.ClaimedAt = &now
			reward.SubscriptionID = &sub.ID

			if err := h.DB(r).Save(&reward).Error; err != nil {
				log.Println("Error updating reward status:", err)
				sentry.CaptureException(err)
				// Don't fail the request for this
			}

			response.OKWithData(w, "Reward claimed successfully", map[string]interface{}{
				"subscription_id": sub.ID,
				"expires_at":      sub.ExpiresAt,
			})
		}
	})
}

// @Summary Get Available Rewards
// @Description Get list of available rewards for the user
// @Tags Referral
// @Accept json
// @Produce json
// @Success 200 {object} types.Response
// @Failure 500 {object} types.Response
// @Router /referral/rewards [get]
func (h Handler) HandleGetAvailableRewards() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)
		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {
		default:
			var rewards []schemas.ReferralReward
			err := h.DB(r).Where("user_id = ? AND status = ?",
				session.UserID, schemas.RewardStatusEligible).Find(&rewards).Error
			if err != nil {
				log.Println("Error getting rewards:", err)
				sentry.CaptureException(err)
				response.InternalServerError(w, err, "Failed to get rewards")
				return
			}

			response.OKWithData(w, "OK", rewards)
		}
	})
}
