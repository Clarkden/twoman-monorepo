package handlers

import (
	"log"
	"net/http"
	"twoman/globals"
	"twoman/handlers/helpers/subscription"
	"twoman/handlers/response"
	"twoman/schemas"
	"twoman/types"

	"github.com/getsentry/sentry-go"
	"gorm.io/gorm"
)

// @Summary Get User Subscription Status
// @Description Get the current user's subscription status including Pro expiration
// @Tags Subscription
// @Accept json
// @Produce json
// @Success 200 {object} types.Response
// @Failure 500 {object} types.Response
// @Router /subscription/status [get]
func (h Handler) HandleGetSubscriptionStatus() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)
		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {
		default:
			isPro, err := subscription.IsUserPro(session.UserID, h.DB(r))
			if err != nil {
				log.Println("Error checking pro status:", err)
				sentry.CaptureException(err)
				response.InternalServerError(w, err, "Failed to check subscription status")
				return
			}

			var subscriptionInfo *types.SubscriptionInfo
			if isPro {
				// Get subscription details
				var sub schemas.ProSubscriptionV2
				err = h.DB(r).Where("user_id = ? AND is_active = ?", session.UserID, true).First(&sub).Error
				if err != nil && err != gorm.ErrRecordNotFound {
					log.Println("Error getting subscription details:", err)
					sentry.CaptureException(err)
					response.InternalServerError(w, err, "Failed to get subscription details")
					return
				}

				if err == nil {
					subscriptionInfo = &types.SubscriptionInfo{
						IsPro:     true,
						Plan:      sub.Plan,
						Source:    sub.Source,
						ExpiresAt: sub.ExpiresAt,
						IsActive:  sub.IsActive,
					}
				} else {
					// Fallback to basic pro status (legacy PaidUser)
					subscriptionInfo = &types.SubscriptionInfo{
						IsPro:     true,
						Plan:      "legacy",
						Source:    "legacy",
						ExpiresAt: nil,
						IsActive:  true,
					}
				}
			} else {
				subscriptionInfo = &types.SubscriptionInfo{
					IsPro:     false,
					Plan:      "",
					Source:    "",
					ExpiresAt: nil,
					IsActive:  false,
				}
			}

			response.OKWithData(w, "OK", subscriptionInfo)
		}
	})
}
