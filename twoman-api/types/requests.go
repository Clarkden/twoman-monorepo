package types

import (
	"net/http"

	"gorm.io/gorm"
)

type RequestHandler interface {
	DB(r *http.Request) *gorm.DB
}

type CreateProfileRequest struct {
	Name                 string  `json:"name"`
	Username             string  `json:"username"`
	Bio                  string  `json:"bio"`
	Gender               string  `json:"gender"`
	DateOfBirth          string  `json:"date_of_birth"`
	Lat                  float64 `json:"lat"`
	Lon                  float64 `json:"lon"`
	Image1               string  `json:"image1"`
	Image2               string  `json:"image2,omitempty"`
	Image3               string  `json:"image3,omitempty"`
	Image4               string  `json:"image4,omitempty"`
	Interests            string  `json:"interests"`
	PreferredGender      string  `json:"preferred_gender"`
	PreferredAgeMin      int     `json:"preferred_age_min"`
	PreferredAgeMax      int     `json:"preferred_age_max"`
	PreferredDistanceMax int     `json:"preferred_distance_max"`
}

type UpdateProfileRequest struct {
	Name                 string `json:"name"`
	Bio                  string `json:"bio"`
	Image1               string `json:"image1"`
	Image2               string `json:"image2,omitempty"`
	Image3               string `json:"image3,omitempty"`
	Image4               string `json:"image4,omitempty"`
	Education            string `json:"education"`
	Occupation           string `json:"occupation"`
	Interests            string `json:"interests"`
	Gender               string `json:"gender"`
	PreferredGender      string `json:"preferred_gender"`
	PreferredAgeMin      int    `json:"preferred_age_min"`
	PreferredAgeMax      int    `json:"preferred_age_max"`
	PreferredDistanceMax int    `json:"preferred_distance_max"`
}

type UpdateDateOfBirthRequest struct {
	DateOfBirth string `json:"date_of_birth"`
}

type UpdateProfileLocationRequest struct {
	Lat float64 `json:"lat"`
	Lon float64 `json:"lon"`
}

type PhoneAuthRequest struct {
	PhoneNumber string `json:"phone_number"`
}

type VerifyOTPRequest struct {
	PhoneNumber string `json:"phone_number"`
	Code        string `json:"code"`
}

type SwipeRequest struct {
	TargetProfileID string `json:"target_profile_id"`
	Liked           bool   `json:"liked"`
}

type CreateMatchRequest struct {
	IsDuo         bool   `json:"is_duo"`
	FriendProfile string `json:"friend_profile,omitempty"`
	TargetProfile string `json:"target_profile"`
}

type UpdateMatchRequest struct {
	MatchId       string `json:"match_id"`
	TargetProfile string `json:"target_profile"`
}

type MatchDecisionRequest struct {
	MatchId string `json:"match_id"`
	Accept  bool   `json:"accept"`
}

type ChangeMatchDecisionRequest struct {
	MatchId string `json:"match_id"`
	Accept  bool   `json:"accept"`
}

type CreateProfileDecisionRequest struct {
	TargetProfile string `json:"target_profile"`
	Decision      string `json:"decision"`
}

type UpdatePushTokenRequest struct {
	PushToken string `json:"push_token"`
}

type AppleAuthRequest struct {
	IdentityToken string `json:"identity_token"`
	UserID        string `json:"user_id"`
	Email         string `json:"email"`
}
type ReportProfileRequest struct {
	ReportedID uint   `json:"reported_id"`
	Reason     string `json:"reason"`
}

type ReportBugRequest struct {
	Problem string `json:"problem"`
}

type FeatureFlagRequest struct {
	FlagName string `json:"flag_name"`
}

type UpdateNotificationPreferencesRequest struct {
	ExpoPushToken                        string `json:"expo_push_token"`
	NotificationsEnabled                 bool   `json:"notifications_enabled"`
	NewMatchesNotificationsEnabled       bool   `json:"new_matches_notifications_enabled"`
	NewMessagesNotificationsEnabled      bool   `json:"new_messages_notifications_enabled"`
	NewFriendRequestNotificationsEnabled bool   `json:"new_friend_request_notifications_enabled"`
}

type AdminAuthRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AdminCreateProfileRequest struct {
	PhoneNumber  string               `json:"phone_number"`
	IsDemoNumber bool                 `json:"is_demo_number"`
	Profile      CreateProfileRequest `json:"profile"`
}

type AdminCreateFriendshipRequest struct {
	Username string `json:"username"`
}

type AdminDeleteFriendshipRequest struct {
	FriendID uint `json:"friend_id"`
}

type AdminCreateMatchRequest struct {
	IsDuo          bool   `json:"is_duo"`
	TargetID       uint   `json:"target_id"`
	FriendID       uint   `json:"friend_id"`
	SecondTargetID uint   `json:"second_target_id"`
	State          string `json:"state"`
}

type AdminDeleteMatchRequest struct {
	MatchID uint `json:"match_id"`
}

type AdminCreateFlagRequest struct {
	Name      string `json:"name"`
	IsEnabled bool   `json:"is_enabled"`
}

type AdminUpdateFlagRequest struct {
	IsEnabled bool `json:"is_enabled"`
}

type AdminUpdateProfileRequest struct {
	Username             string  `json:"username"`
	Name                 string  `json:"name"`
	Bio                  string  `json:"bio"`
	Image1               string  `json:"image1"`
	Image2               string  `json:"image2,omitempty"`
	Image3               string  `json:"image3,omitempty"`
	Image4               string  `json:"image4,omitempty"`
	DateOfBirth          string  `json:"date_of_birth"`
	Lat                  float64 `json:"lat"`
	Lon                  float64 `json:"lon"`
	Education            string  `json:"education"`
	Occupation           string  `json:"occupation"`
	Interests            string  `json:"interests"`
	Gender               string  `json:"gender"`
	PreferredGender      string  `json:"preferred_gender"`
	PreferredAgeMin      int     `json:"preferred_age_min"`
	PreferredAgeMax      int     `json:"preferred_age_max"`
	PreferredDistanceMax int     `json:"preferred_distance_max"`
}
