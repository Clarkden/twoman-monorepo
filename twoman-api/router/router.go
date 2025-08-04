package router

import (
	"net/http"
	"twoman/handlers"
	"twoman/middleware"

	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/redis/go-redis/v9"
	httpSwagger "github.com/swaggo/http-swagger"
	"github.com/twilio/twilio-go"
	"googlemaps.github.io/maps"
	"gorm.io/gorm"

	_ "twoman/docs"
)

func Router(liveDB, demoDB *gorm.DB, rdb *redis.Client, s3 *s3.S3, rlmdb *redis.Client, mapsClient *maps.Client, twClient *twilio.RestClient, development bool) *http.ServeMux {

	router := http.NewServeMux()
	handler := handlers.NewHandler(liveDB, demoDB, s3, rdb, rlmdb, mapsClient, twClient)

	middlewareProvider := middleware.NewMiddlewareProvider(rdb, rlmdb, liveDB, demoDB)

	// Auth Routes
	router.Handle("POST /v1/auth/apple", middlewareProvider.DatabaseMiddleware(handler.HandleAppleAuth()))
	router.Handle("GET /v1/auth/check", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleCheckSession())))
	router.Handle("POST /v1/auth/refresh", middlewareProvider.DatabaseMiddleware(handler.HandleRefreshToken()))
	router.Handle("GET /v1/session/validate", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleValidateSession(rdb))))
	router.Handle("POST /v1/auth/phone", middlewareProvider.DatabaseMiddleware(handler.HandlePhoneAuth()))
	router.Handle("POST /v1/auth/phone/verify", middlewareProvider.DatabaseMiddleware(handler.HandlePhoneVerify()))

	// Logout Routes
	router.HandleFunc("GET /v1/logout", middlewareProvider.AuthMiddleware(handler.HandleLogout(rdb)))

	// User Routes
	router.Handle("GET /v1/user/me", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetUserSelf())))
	router.Handle("POST /v1/user/push-token", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleUpdatePushToken())))
	router.Handle("DELETE /v1/user", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleDeleteUser())))
	router.Handle("PUT /v1/user/notification/preferences", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleUpdateNotificationPreferences())))
	router.Handle("GET /v1/user/notification/preferences", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetNotificationPreferences())))

	// Profile Routes
	router.Handle("GET /v1/profile/search", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleSearchByUsername())))
	router.Handle("PATCH /v1/profile", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleUpdateProfile())))
	router.Handle("POST /v1/profile", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleCreateProfile())))
	router.Handle("GET /v1/profile/username", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleCheckUsernameAvailability())))
	router.Handle("GET /v1/profile/{profileId}", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetProfile())))
	router.Handle("GET /v1/profile/{profileId}/friends", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetProfileFriends())))
	router.Handle("GET /v1/profile/discover", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleDiscoverProfiles())))
	router.Handle("POST /v1/profile/location", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleUpdateProfileLocation())))
	router.Handle("POST /v1/profile/block", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleBlockProfile())))
	router.Handle("POST /v1/profile/unblock", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleUnblockProfile())))
	router.Handle("GET /v1/profile/blocked", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetBlockedProfiles())))
	router.Handle("POST /v1/profile/report", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleReportProfile())))
	router.Handle("PATCH /v1/profile/dateOfBirth", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleUpdateDateOfBirth())))

	// Friendship Routes
	router.Handle("GET /v1/friendship", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetFriends())))
	router.Handle("GET /v1/friendship/requests", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetFriendRequests())))
	router.Handle("DELETE /v1/friendship/requests", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleRejectFriendRequest())))
	router.Handle("POST /v1/friendship/{username}", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleSendFriendInvite())))
	router.Handle("PATCH /v1/friendship/{friendshipId}/accept", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleAcceptFriendRequest())))
	router.Handle("PATCH /v1/friendship/{friendshipId}/reject", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleRejectFriendRequest())))
	router.Handle("POST /v1/friendship/{profileId}/remove", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleRemoveFriendship())))

	// Referral Routes
	router.Handle("GET /v1/referral/code", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetReferralCode())))
	router.Handle("POST /v1/referral/redeem", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleRedeemReferralCode())))
	router.Handle("GET /v1/referral/stats", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetReferralStats())))
	router.Handle("POST /v1/referral/complete", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleCompleteReferral())))
	router.Handle("GET /v1/referral/rewards", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetAvailableRewards())))
	router.Handle("POST /v1/referral/reward/{rewardId}/claim", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleClaimReferralReward())))

	// Subscription Routes
	router.Handle("GET /v1/subscription/status", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetSubscriptionStatus())))

	// Match Routes
	router.Handle("GET /v1/match", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetAcceptedMatches())))
	router.Handle("GET /v1/match/{matchId}", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetMatch())))
	router.Handle("GET /v1/match/pending", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetPendingMatches())))
	router.Handle("GET /v1/match/pending/target", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetPendingMatchTarget())))

	//Bug Routes
	router.Handle("POST /v1/bug", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleReportBug())))

	// Chat Routes
	router.Handle("GET /v1/chat/{matchId}", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetMatchChats())))

	// Standouts Routes
	router.Handle("GET /v1/stars/balance", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetUserStarBalance())))
	router.Handle("GET /v1/standouts/duo", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetDuoStandouts())))
	router.Handle("GET /v1/standouts/solo", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleGetSoloStandouts())))

	router.Handle("PUT /v1/stars/balance/{userId}", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleUpdateStarBalance())))

	// File Routes
	router.Handle("POST /v1/file/upload", middlewareProvider.AuthMiddleware(middlewareProvider.DatabaseMiddleware(handler.HandleFileUpload())))

	// Feature Flag Routes
	router.Handle("GET /v1/flag/{name}", middlewareProvider.DatabaseMiddleware(handler.HandleGetFeatureFlag()))

	// Websocket Route
	router.Handle("GET /ws", handler.HandleWebsocket())

	// Revenue Cat Route
	router.Handle("POST /v1/revenuecat", handler.HandleRevenueCatWebhook())

	// Health Route
	router.Handle("GET /health", handler.HandleHealth())

	// Public File Server
	publicFileServer := http.FileServer(http.Dir("./public"))
	router.Handle("/public/", http.StripPrefix("/public/", publicFileServer))

	if development {

		// Swagger Route
		router.HandleFunc("/swagger/*", httpSwagger.WrapHandler)

		router.HandleFunc("/development", func(w http.ResponseWriter, r *http.Request) {
			http.ServeFile(w, r, "./static/development.html")
		})

		// User
		router.Handle("GET /dev/users", handler.HandleGetAllProfiles())

		// Auth
		router.Handle("POST /dev/session/create", handler.HandleCreateDevSession(rdb))
		router.Handle("POST /dev/session/delete", handler.HandleDeleteDevSession(rdb))
	}

	// Admin Routes
	router.Handle("POST /admin/register", handler.HandleRegisterAdmin())
	router.Handle("POST /admin/login", handler.HandleAdminLogin())
	router.HandleFunc("GET /admin/validate", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminValidateSession()))
	router.HandleFunc("GET /admin/users/profiles", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminGetProfiles()))
	router.HandleFunc("POST /admin/users/profiles", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminCreateProfile()))
	router.HandleFunc("GET /admin/users/profiles/{profileId}", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminGetProfile()))
	router.HandleFunc("PATCH /admin/users/profiles/{profileId}", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminUpdateProfile()))
	router.HandleFunc("DELETE /admin/users/profiles/{profileId}", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminDeleteProfile()))
	router.HandleFunc("GET /admin/users/profiles/{profileId}/friends", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminGetProfileFriends()))
	router.HandleFunc("POST /admin/users/profiles/{profileId}/friends", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminCreateFriendship()))
	router.HandleFunc("DELETE /admin/users/profiles/{profileId}/friends", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminDeleteFriendship()))
	router.HandleFunc("GET /admin/users/profiles/{profileId}/matches", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminGetProfileMatches()))
	router.HandleFunc("POST /admin/users/profiles/{profileId}/matches", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminCreateMatch()))
	router.HandleFunc("DELETE /admin/matches", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminDeleteMatch()))
	router.HandleFunc("GET /admin/flags", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminGetFlags()))
	router.HandleFunc("POST /admin/flags", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminCreateFlag()))
	router.HandleFunc("PATCH /admin/flags/{flagId}", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminUpdateFlag()))
	router.HandleFunc("DELETE /admin/flags/{flagId}", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminDeleteFlag()))
	router.HandleFunc("GET /admin/users/profiles/matches", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminGetAllMatches()))
	router.HandleFunc("POST /admin/users/demo/seed", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminSeedDemoDatabase()))
	router.HandleFunc("GET /admin/reports", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminGetReports()))
	router.HandleFunc("DELETE /admin/reports/{reportId}", middlewareProvider.AdminAuthMiddleware(handler.HandleAdminDeleteReport()))

	return router
}
