package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
	"twoman/handlers/helpers/admin"
	"twoman/handlers/helpers/database"
	"twoman/handlers/helpers/friendship"
	"twoman/handlers/helpers/matches"
	"twoman/handlers/helpers/profile"
	"twoman/handlers/helpers/user"
	"twoman/handlers/response"
	"twoman/schemas"
	"twoman/types"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func (h Handler) HandleRegisterAdmin() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// clientVersion := r.Header.Get("X-Client-Version")

		adminCount, err := admin.AdminCount(h.DB(r))

		if err != nil {
			response.InternalServerError(w, err, "Something went wrong")
			return
		}

		if adminCount > 0 {
			adminRegistrationEnabled, err := admin.IsRegistrationEnabled(h.DB(r))

			if err != nil {
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			if !adminRegistrationEnabled {
				response.Forbidden(w, "Admin registration is not enabled")
				return
			}

		}

		var requestBody *types.AdminAuthRequest
		err = json.NewDecoder(r.Body).Decode(&requestBody)

		if err != nil {
			response.BadRequest(w, "Bad request")
		}

		_, err = admin.GetAdminByUsername(requestBody.Username, h.DB(r))
		if err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				response.BadRequest(w, "Something went wrong")
				return
			}
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(requestBody.Password), bcrypt.DefaultCost)
		if err != nil {
			response.InternalServerError(w, err, "Failed to hash password")
			return
		}

		adminRecord, err := admin.CreateAdmin(requestBody.Username, string(hashedPassword), h.DB(r))

		if err != nil {
			log.Println("Could not create admin record")
			response.InternalServerError(w, err, "Something went wrong")
			return
		}

		session, err := admin.CreateAdminSession(adminRecord, h.rdb, r.Context())

		if err != nil {
			response.InternalServerError(w, err, "Something went wrong")
			return
		}

		response.OKWithData(w, "Successfully registered admin", map[string]string{
			"session": session,
		})
	})
}

func (h Handler) HandleAdminLogin() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		var requestBody *types.AdminAuthRequest
		err := json.NewDecoder(r.Body).Decode(&requestBody)

		if err != nil {
			response.BadRequest(w, "Bad request")
		}

		adminRecord, err := admin.AdminLogin(requestBody.Username, requestBody.Password, h.DB(r))

		if err != nil {
			response.Unauthorized(w, "Unauthorized")
			return
		}

		session, err := admin.CreateAdminSession(adminRecord, h.rdb, r.Context())

		if err != nil {
			response.InternalServerError(w, err, "Something went wrong")
			return
		}

		response.OKWithData(w, "Successfully logged in as admin", map[string]string{
			"session": session,
		})
	})
}

func (h Handler) HandleAdminGetProfiles() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var profiles []schemas.Profile

		if err := h.DB(r).Joins("JOIN users ON users.id = profiles.user_id").Order("users.created_at DESC").Find(&profiles).Error; err != nil {
			log.Println("Could not find profiles")
			response.InternalServerError(w, err, "Something went wrong")
			return
		}

		response.OKWithData(w, "Successfully fetched profiles", profiles)
	})
}

func (h Handler) HandleAdminGetProfile() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		profileId := r.PathValue("profileId")

		parsedProfileId, err := strconv.ParseUint(profileId, 10, 64)

		if err != nil {
			response.BadRequest(w, "Invalid profile id")
			return
		}

		var profileRecord schemas.Profile
		if err := h.DB(r).Find(&schemas.Profile{UserID: uint(parsedProfileId)}).First(&profileRecord).Error; err != nil {
			log.Println("err: ", err)
			response.InternalServerError(w, err, "Something went wrong")
			return
		}

		response.OKWithData(w, "Successfully got profile", profileRecord)
	})
}

func (h Handler) HandleAdminValidateSession() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")

		if authHeader == "" {
			response.Unauthorized(w, "Missing authorization header")
			return
		}

		parts := strings.Split(authHeader, " ")

		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			response.Unauthorized(w, "Invalid authorization header")
			return
		}

		token := parts[1]

		_, err := h.rdb.Get(r.Context(), fmt.Sprintf("admin:%s", token)).Result()

		if err != nil {
			response.Unauthorized(w, "Invalid or expired admin session")
			return
		}

		response.OK(w, "Session is valid")
	})
}

func (h Handler) HandleAdminCreateProfile() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		var requestBody *types.AdminCreateProfileRequest
		err := json.NewDecoder(r.Body).Decode(&requestBody)

		if err != nil {
			log.Println("Could not decode request body: ", err)
			response.BadRequest(w, "Bad request")
			return
		}

		var db *gorm.DB

		if requestBody.IsDemoNumber {
			db = h.demoDB
		} else {
			db = h.liveDB
		}

		userRecord, err := user.CreateUserWithPhoneNumber(requestBody.PhoneNumber, requestBody.IsDemoNumber, db)

		if err != nil {
			response.InternalServerError(w, err, "Could not create user with email")
			return
		}

		profileData := requestBody.Profile

		if profileData.Name == "" {
			response.BadRequest(w, "Name is required")
			return
		}

		if profileData.Username == "" {
			response.BadRequest(w, "Username is required")
			return
		}

		if profileData.Bio == "" {
			response.BadRequest(w, "Bio is required")
			return

		}
		if profileData.Gender == "" {
			response.BadRequest(w, "Gender is required")
			return
		}

		if profileData.Gender != "female" && profileData.Gender != "male" {
			response.BadRequest(w, "Gender must be male or female")
			return
		}

		if profileData.Image1 == "" {
			response.BadRequest(w, "Image1 is required")
			return
		}
		if profileData.PreferredGender == "" {
			response.BadRequest(w, "Preferred Gender is required")
			return
		}
		if profileData.PreferredAgeMin <= 0 {
			response.BadRequest(w, "Preferred Age Min must be greater than 0")
			return
		}

		if profileData.PreferredAgeMin > 100 {
			response.BadRequest(w, "Preferred Age Min must be less than 100")
			return
		}

		if profileData.PreferredAgeMax <= 0 {
			response.BadRequest(w, "Preferred Age Max must be greater than 0")
			return
		}

		if profileData.PreferredAgeMax > 100 {
			response.BadRequest(w, "Preferred Age Max must be less than 100")
			return
		}

		if profileData.PreferredAgeMin > profileData.PreferredAgeMax {
			response.BadRequest(w, "Preferred Age Min must be less than Preferred Age Max")
			return
		}
		if profileData.PreferredGender != "female" && profileData.PreferredGender != "male" {
			response.BadRequest(w, "Preferred gender must be female or male")
			return
		}

		if profileData.PreferredDistanceMax <= 0 {
			response.BadRequest(w, "Preferred Distance Max must be greater than 0")
			return
		}

		if profileData.Lat == 0 || profileData.Lon == 0 {
			response.BadRequest(w, "Location is required")
			return
		}

		if len(profileData.Interests) > 50 {
			response.BadRequest(w, "Interests must be less than 50 characters")
			return
		}

		if len(profileData.Bio) > 200 {
			response.BadRequest(w, "Bio must be less than 200 characters")
			return
		}

		if len(profileData.Name) > 50 {
			response.BadRequest(w, "Name must be less than 50 characters")
			return
		}

		if len(profileData.Username) > 50 {
			response.BadRequest(w, "Username must be less than 50 characters")
			return
		}

		city, err := profile.GetCity(profileData.Lat, profileData.Lon, h.maps)

		if err != nil {
			log.Println(err)
			response.BadRequest(w, "Invalid location")
			return
		}

		parsedDateOfBirth, err := time.Parse(time.DateOnly, profileData.DateOfBirth)

		if err != nil {
			response.BadRequest(w, "Invalid date of birth")
			return
		}

		minAge := 18
		minBirthDate := time.Now().AddDate(-minAge, 0, 0)
		if parsedDateOfBirth.After(minBirthDate) {
			response.BadRequest(w, "User must be at least 18 years old")
			return
		}

		newProfile := schemas.Profile{
			UserID:               userRecord.ID,
			Name:                 profileData.Name,
			Username:             profileData.Username,
			Bio:                  profileData.Bio,
			Gender:               profileData.Gender,
			DateOfBirth:          parsedDateOfBirth,
			LocationPoint:        *schemas.NewPoint(profileData.Lat, profileData.Lon),
			City:                 city,
			Education:            "",
			Occupation:           "",
			Interests:            profileData.Interests,
			Image1:               profileData.Image1,
			Image2:               profileData.Image2,
			Image3:               profileData.Image3,
			Image4:               profileData.Image4,
			PreferredGender:      profileData.PreferredGender,
			PreferredAgeMin:      profileData.PreferredAgeMin,
			PreferredAgeMax:      profileData.PreferredAgeMax,
			PreferredDistanceMax: profileData.PreferredDistanceMax,
		}

		if err := profile.CreateProfileWithData(newProfile, db); err != nil {
			response.InternalServerError(w, err, "Something went wrong")
			return
		}

		response.OKWithData(w, "Successfully created profile", newProfile)
	})
}

func (h Handler) HandleAdminDeleteProfile() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		profileId := r.PathValue("profileId")

		parsedProfileId, err := strconv.ParseUint(profileId, 10, 64)

		if err != nil {
			response.BadRequest(w, "Invalid profileId")
			return
		}

		if err := user.DeleteUser(uint(parsedProfileId), h.DB(r), h.s3); err != nil {
			response.InternalServerError(w, err, "Something went wrong")
			return
		}

		response.OK(w, "Create profile")
	})
}

func (h Handler) HandleAdminUpdateProfile() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		profileId := r.PathValue("profileId")

		var requestBody types.AdminUpdateProfileRequest
		err := json.NewDecoder(r.Body).Decode(&requestBody)

		if err != nil {
			response.BadRequest(w, "Invalid request")
			return
		}

		parsedProfileId, err := strconv.ParseUint(profileId, 10, 64)

		if err != nil {
			response.BadRequest(w, "Invalid profileId")
			return
		}

		if err := profile.AdminUpdateProfile(requestBody, uint(parsedProfileId), h.DB(r), h.s3, h.maps); err != nil {
			log.Println(err)
			response.InternalServerError(w, err, "Something went wrong")
			return
		}

		response.OK(w, "Update profile")
	})
}

func (h Handler) HandleAdminGetProfileFriends() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		profileId := r.PathValue("profileId")

		parsedProfileId, err := strconv.ParseUint(profileId, 10, 64)

		if err != nil {
			response.BadRequest(w, "Invalid profileId")
			return
		}

		friendshipRecords, err := friendship.GetAllFriends(uint(parsedProfileId), h.DB(r))

		if err != nil {
			response.InternalServerError(w, err, "Something went wrong")
			return
		}

		response.OKWithData(w, "Successfully fetched friends", friendshipRecords)
	})
}

func (h Handler) HandleAdminCreateFriendship() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		profileId := r.PathValue("profileId")

		parsedProfileId, err := strconv.ParseUint(profileId, 10, 64)

		if err != nil {
			response.BadRequest(w, "Invalid profileId")
			return
		}

		var requestBody types.AdminCreateFriendshipRequest
		err = json.NewDecoder(r.Body).Decode(&requestBody)

		if err != nil {
			response.BadRequest(w, "Invalid request body")
			return
		}

		profileRecord, err := profile.FindProfileByUsername(requestBody.Username, h.DB(r))

		if err != nil {
			response.NotFound(w, "Could not find profile by username")
			return
		}

		friendshipRecord, err := friendship.ForceCreateFriendship(uint(parsedProfileId), profileRecord.UserID, h.DB(r))

		if err != nil {
			response.InternalServerError(w, err, "Could not create friendship")
			return
		}

		response.OKWithData(w, "Create friendship", friendshipRecord)
	})
}

func (h Handler) HandleAdminDeleteFriendship() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		profileId := r.PathValue("profileId")

		parsedProfileId, err := strconv.ParseUint(profileId, 10, 64)

		if err != nil {
			response.BadRequest(w, "Invalid profileId")
			return
		}

		var requestBody types.AdminDeleteFriendshipRequest
		err = json.NewDecoder(r.Body).Decode(&requestBody)

		if err != nil {
			response.BadRequest(w, "Invalid request body")
			return
		}

		err = friendship.RemoveFriendship(uint(parsedProfileId), requestBody.FriendID, h.DB(r))
		if err != nil {
			response.InternalServerError(w, err, "Could not delete friendship: "+err.Error())
			return
		}

		response.OK(w, "Delete friendship")
	})
}

func (h Handler) HandleAdminGetProfileMatches() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		profileId := r.PathValue("profileId")

		parsedProfileId, err := strconv.ParseUint(profileId, 10, 64)

		if err != nil {
			response.BadRequest(w, "Invalid profileId")
			return
		}

		matches, err := matches.GetAllMatches(uint(parsedProfileId), h.DB(r))
		if err != nil {
			response.InternalServerError(w, err, "Something went wrong")
			return
		}

		response.OKWithData(w, "Successfully retrieved pending matches", matches)
	})
}

func (h Handler) HandleAdminCreateMatch() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		profileId := r.PathValue("profileId")

		parsedProfileId, err := strconv.ParseUint(profileId, 10, 64)

		if err != nil {
			response.BadRequest(w, "Invalid profileId")
			return
		}

		var requestBody types.AdminCreateMatchRequest
		err = json.NewDecoder(r.Body).Decode(&requestBody)

		if err != nil {
			response.BadRequest(w, "Invalid request body")
			return
		}

		if requestBody.State != "rejected" && requestBody.State != "accepted" && requestBody.State != "pending" {
			response.BadRequest(w, "Invalidate staate")
			return
		}

		if requestBody.IsDuo {

			if uint(parsedProfileId) == requestBody.TargetID || uint(parsedProfileId) == requestBody.FriendID || uint(parsedProfileId) == requestBody.SecondTargetID {
				response.BadRequest(w, "Cannot create a match with self")
				return
			}

			// TODO: Implement validation so duplicate matches aren't made

			// var existingMatch schemas.Matches
			// h.DB(r).Where("is_duo = ? AND ((profile1_id = ? AND profile2_id = ? AND profile3_id = ?) OR (profile2_id = ? AND profile1_id = ? AND profile3_id = ?))",
			// 	true, profileID, friendProfileID, targetProfileID, profileID, friendProfileID, targetProfileID).First(&existingMatch)
			// if existingMatch.ID != 0 {
			// 	return errors.New("a duo match already exists with the given profile combination")
			// }

			newMatch := schemas.Matches{
				Profile1ID: uint(parsedProfileId),
				Profile2ID: &requestBody.FriendID,
				Profile3ID: requestBody.TargetID,
				IsDuo:      true,
				Status:     requestBody.State,
			}

			if requestBody.SecondTargetID != 0 {
				newMatch.Profile4ID = &requestBody.SecondTargetID

				if requestBody.State == "accepted" {
					newMatch.Profile3Accepted = true
					newMatch.Profile4Accepted = true
				}
			}

			if err := h.DB(r).Create(&newMatch).Error; err != nil {
				log.Println(err)
				response.InternalServerError(w, err, "Could not save duo match")
				return
			}

		} else {
			if uint(parsedProfileId) == requestBody.TargetID {
				response.BadRequest(w, "Cannot create a match with self")
				return
			}

			var existingMatch schemas.Matches
			h.DB(r).Where("is_duo = ? AND ((profile1_id = ? AND profile3_id = ?) OR (profile1_id = ? AND profile3_id = ?))",
				false, uint(parsedProfileId), requestBody.TargetID, requestBody.TargetID, uint(parsedProfileId)).First(&existingMatch)

			if existingMatch.ID != 0 {
				response.Conflict(w, "A solo match already exists between the two profiles")
				return
			}

			newMatch := schemas.Matches{
				Profile1ID: uint(parsedProfileId),
				Profile3ID: requestBody.TargetID,
				IsDuo:      false,
				Status:     requestBody.State,
			}

			if err := h.DB(r).Create(&newMatch).Error; err != nil {
				log.Println(err)
				response.InternalServerError(w, err, "Could not save duo match")
				return
			}
		}

		response.OK(w, "Match Created")
	})
}

func (h Handler) HandleAdminDeleteMatch() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var requestBody types.AdminDeleteMatchRequest
		err := json.NewDecoder(r.Body).Decode(&requestBody)

		if err != nil {
			response.BadRequest(w, "Invalid request body")
			return
		}

		// First, check if the match exists
		match, err := matches.GetMatchByID(requestBody.MatchID, h.DB(r))
		if err != nil {
			response.NotFound(w, fmt.Sprintf("Match not found with ID: %d", requestBody.MatchID))
			return
		}

		if match == nil {
			response.NotFound(w, fmt.Sprintf("Match not found with ID: %d", requestBody.MatchID))
			return
		}

		// Delete the match
		err = matches.DeleteMatch(match.ID, h.DB(r))
		if err != nil {
			response.InternalServerError(w, err, "Could not delete match")
			return
		}

		// Delete profile views between matched profiles
		err = profile.DeleteProfileViewsForMatch(*match, h.DB(r))
		if err != nil {
			log.Printf("Error deleting profile views: %v", err)
		}

		response.OK(w, "Match Deleted")
	})
}

func (h Handler) HandleAdminGetFlags() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		var flags []schemas.FeatureFlags
		if err := h.DB(r).Find(&flags).Error; err != nil {
			log.Println(err)
		}

		response.OKWithData(w, "Successfully retrieved feature flags", flags)
	})
}

func (h Handler) HandleAdminCreateFlag() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		var requestBody types.AdminCreateFlagRequest
		err := json.NewDecoder(r.Body).Decode(&requestBody)

		if err != nil {
			response.BadRequest(w, "Invalid request body")
			return
		}

		featureFlag := schemas.FeatureFlags{
			FlagName:  requestBody.Name,
			IsEnabled: requestBody.IsEnabled,
		}

		if err := h.DB(r).Save(&featureFlag).Error; err != nil {
			response.InternalServerError(w, err, "Could not save feature flag")
			return
		}

		response.OK(w, "Successfully created flag")
	})
}

func (h Handler) HandleAdminUpdateFlag() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		flagId := r.PathValue("flagId")

		parsedFlagId, err := strconv.ParseUint(flagId, 10, 64)

		if err != nil {
			response.BadRequest(w, "Invalid profileId")
			return
		}

		var requestBody types.AdminUpdateFlagRequest
		err = json.NewDecoder(r.Body).Decode(&requestBody)

		if err != nil {
			response.BadRequest(w, "Invalid request body")
			return
		}

		if err := h.DB(r).Model(&schemas.FeatureFlags{}).Where("id = ?", parsedFlagId).Update("is_enabled", requestBody.IsEnabled).Error; err != nil {
			log.Println(err)
			response.InternalServerError(w, err, "Could not update flag")
			return
		}

		response.OK(w, "Successfully updated flag")
	})
}

func (h Handler) HandleAdminDeleteFlag() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		flagId := r.PathValue("flagId")

		parsedFlagId, err := strconv.ParseUint(flagId, 10, 64)

		if err != nil {
			response.BadRequest(w, "Invalid profileId")
			return
		}

		if err := h.DB(r).Where("id = ?", uint(parsedFlagId)).Delete(&schemas.FeatureFlags{}).Error; err != nil {
			response.InternalServerError(w, err, "Could not delete flag: "+err.Error())
			return
		}

		response.OK(w, "Successfully deleted flag")
	})
}

func (h Handler) HandleAdminGetReports() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		reports, err := admin.GetAllReports(h.DB(r))
		if err != nil {
			response.InternalServerError(w, err, "Something went wrong")
			return
		}

		response.OKWithData(w, "Successfully retrieved reports", reports)
	})
}

func (h Handler) HandleAdminDeleteReport() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		reportIdStr := r.PathValue("reportId")
		reportId, err := strconv.ParseUint(reportIdStr, 10, 64)
		if err != nil {
			response.InternalServerError(w, err, "Something went wrong")
			return
		}

		if err := admin.DeleteReport(uint(reportId), h.DB(r)); err != nil {
			response.InternalServerError(w, err, "Something went wrong")
			return
		}

		response.OK(w, "View report")
	})
}

func (h Handler) HandleAdminGetAllMatches() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		matches, err := admin.GetAllMatches(h.DB(r))
		if err != nil {
			log.Println("Error fetching all matches:", err)
			response.InternalServerError(w, err, "Something went wrong while fetching matches")
			return
		}

		response.OKWithData(w, "Successfully retrieved all matches", matches)
	})
}

func (h Handler) HandleAdminSeedDemoDatabase() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		lat := 34.0549
		lng := -118.2426

		database.CreateUsersAndProfiles(h.demoDB, 100, lat, lng, h.maps)

		response.OK(w, "Successfully seeded database")
	})
}
