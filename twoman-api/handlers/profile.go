package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
	"twoman/globals"
	"twoman/handlers/helpers/friendship"
	"twoman/handlers/helpers/matches"
	"twoman/handlers/helpers/profile"
	"twoman/handlers/helpers/socket"
	"twoman/handlers/response"
	"twoman/schemas"
	"twoman/types"
	"twoman/utils"
)

func (h Handler) HandleCreateProfile() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			var request types.CreateProfileRequest
			err := json.NewDecoder(r.Body).Decode(&request)

			if err != nil {
				response.BadRequest(w, "Invalid request body")
				return
			}

			// TODO: Improve validation
			if request.Name == "" {
				response.BadRequest(w, "Name is required")
				return
			}

			if request.Username == "" {
				response.BadRequest(w, "Username is required")
				return
			}

			if request.Bio == "" {
				response.BadRequest(w, "Bio is required")
				return

			}
			if request.Gender == "" {
				response.BadRequest(w, "Gender is required")
				return
			}

			if request.Gender != "female" && request.Gender != "male" {
				response.BadRequest(w, "Gender must be male or female")
				return
			}

			if request.Image1 == "" {
				response.BadRequest(w, "Image1 is required")
				return
			}

			if request.PreferredGender == "" {
				response.BadRequest(w, "Preferred Gender is required")
				return
			}
			if request.PreferredAgeMin <= 0 {
				response.BadRequest(w, "Preferred Age Min must be greater than 0")
				return
			}

			if request.PreferredAgeMin > 100 {
				response.BadRequest(w, "Preferred Age Min must be less than 100")
				return
			}

			if request.PreferredAgeMax <= 0 {
				response.BadRequest(w, "Preferred Age Max must be greater than 0")
				return
			}

			if request.PreferredAgeMax > 100 {
				response.BadRequest(w, "Preferred Age Max must be less than 100")
				return
			}

			if request.PreferredAgeMin > request.PreferredAgeMax {
				response.BadRequest(w, "Preferred Age Min must be less than Preferred Age Max")
				return
			}
			if request.PreferredGender != "female" && request.PreferredGender != "male" {
				response.BadRequest(w, "Preferred gender must be female or male")
				return
			}

			if request.PreferredDistanceMax <= 0 {
				response.BadRequest(w, "Preferred Distance Max must be greater than 0")
				return
			}

			if request.Lat == 0 || request.Lon == 0 {
				response.BadRequest(w, "Location is required")
				return
			}

			if len(request.Interests) > 50 {
				response.BadRequest(w, "Interests must be less than 50 characters")
				return
			}

			if len(request.Bio) > 200 {
				response.BadRequest(w, "Bio must be less than 200 characters")
				return
			}

			if len(request.Name) > 50 {
				response.BadRequest(w, "Name must be less than 50 characters")
				return
			}

			if len(request.Username) > 50 {
				response.BadRequest(w, "Username must be less than 50 characters")
				return
			}

			city, err := profile.GetCity(request.Lat, request.Lon, h.maps)

			if err != nil {
				log.Println(err)
				response.BadRequest(w, "Invalid location")
				return
			}

			parsedDateOfBirth, err := time.Parse(time.RFC3339, request.DateOfBirth)

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

			trimmedBio := strings.TrimSpace(request.Bio)
			if trimmedBio == "" {
				response.BadRequest(w, "Bio Cannot Be Empty")
				return
			}

			newImagesRaw := []string{request.Image1, request.Image2, request.Image3, request.Image4}
			newImages := utils.CompactImages(newImagesRaw)

			// Update the request with the compacted images
			request.Image1 = newImages[0]
			request.Image2 = newImages[1]
			request.Image3 = newImages[2]
			request.Image4 = newImages[3]

			newProfile := schemas.Profile{
				UserID:               session.UserID,
				Name:                 request.Name,
				Username:             request.Username,
				Bio:                  trimmedBio,
				Gender:               request.Gender,
				DateOfBirth:          parsedDateOfBirth,
				LocationPoint:        *schemas.NewPoint(request.Lat, request.Lon),
				City:                 city,
				Education:            "",
				Occupation:           "",
				Interests:            request.Interests,
				Image1:               request.Image1,
				Image2:               request.Image2,
				Image3:               request.Image3,
				Image4:               request.Image4,
				PreferredGender:      request.PreferredGender,
				PreferredAgeMin:      request.PreferredAgeMin,
				PreferredAgeMax:      request.PreferredAgeMax,
				PreferredDistanceMax: request.PreferredDistanceMax,
			}

			if err := profile.CreateProfileWithData(newProfile, h.DB(r)); err != nil {
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			response.OK(w, "OK")
			return
		}
	})
}

func (h Handler) HandleUpdateProfile() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			if session == nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
			}

			var request types.UpdateProfileRequest
			err := json.NewDecoder(r.Body).Decode(&request)

			if err != nil {
				response.BadRequest(w, "Invalid request body")
				return
			}

			if request.Name == "" {
				response.BadRequest(w, "Name is required")
				return
			}

			if request.Bio == "" {
				response.BadRequest(w, "Bio is required")
				return
			}

			if request.Image1 == "" {
				response.BadRequest(w, "Image1 is required")
				return
			}

			if request.PreferredGender == "" {
				response.BadRequest(w, "Preferred Gender is required")
				return
			}
			if request.PreferredAgeMin <= 0 {
				response.BadRequest(w, "Preferred Age Min must be greater than 0")
				return
			}

			if request.PreferredAgeMin > 100 {
				response.BadRequest(w, "Preferred Age Min must be less than 100")
				return
			}

			if request.PreferredAgeMax <= 0 {
				response.BadRequest(w, "Preferred Age Max must be greater than 0")
				return
			}

			if request.PreferredAgeMax > 100 {
				response.BadRequest(w, "Preferred Age Max must be less than 100")
				return
			}

			if request.PreferredAgeMin > request.PreferredAgeMax {
				response.BadRequest(w, "Preferred Age Min must be less than Preferred Age Max")
				return
			}
			if request.PreferredGender != "female" && request.PreferredGender != "male" {
				response.BadRequest(w, "Preferred gender must be female or male")
				return
			}

			if request.PreferredDistanceMax <= 0 {
				response.BadRequest(w, "Preferred Distance Max must be greater than 0")
				return
			}

			if request.Education != "" {

				if request.Education != "" && request.Education != "High School" && request.Education != "College" && request.Education != "Graduate School" {
					response.BadRequest(w, "Education must be High School, College, or Graduate School")
					return
				}
			}

			if len(request.Interests) > 50 {
				response.BadRequest(w, "Interests must be less than 50 characters")
				return
			}

			if len(request.Bio) > 200 {
				response.BadRequest(w, "Bio must be less than 200 characters")
				return
			}

			if len(request.Name) > 50 {
				response.BadRequest(w, "Name must be less than 50 characters")
				return
			}

			trimmedBio := strings.TrimSpace(request.Bio)
			if trimmedBio == "" {
				response.BadRequest(w, "Bio Cannot Be Empty")
				return
			}

			request.Bio = trimmedBio

			if err := profile.UpdateProfile(request, session.UserID, h.DB(r), h.s3); err != nil {
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			response.OK(w, "OK")
		}
	})
}

func (h Handler) HandleUpdateProfileLocation() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			if session == nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
			}

			var request types.UpdateProfileLocationRequest
			err := json.NewDecoder(r.Body).Decode(&request)

			if err != nil {
				response.BadRequest(w, "Invalid request body")
				return
			}

			if request.Lat == 0 || request.Lon == 0 {
				response.BadRequest(w, "Location is required")
				return
			}

			city, err := profile.GetCity(request.Lat, request.Lon, h.maps)

			if err != nil {
				log.Println(err)
				response.BadRequest(w, "Invalid location")
				return
			}

			if err := profile.UpdateProfileLocation(request, session.UserID, city, h.DB(r)); err != nil {
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			response.OK(w, "OK")
		}
	})
}

func (h Handler) HandleGetProfile() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		id := r.PathValue("profileId")

		if id == "" {
			response.BadRequest(w, "Path param id is required")
			return
		}

		if id == "me" {
			session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

			if session == nil {
				response.BadRequest(w, "Invalid session")
				return
			}

			id = strconv.FormatUint(uint64(session.UserID), 10)
		}

		profileId, err := strconv.ParseUint(id, 10, 64)

		if err != nil {
			response.BadRequest(w, "Invalid profile id")
			return
		}

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			var profileRecord *schemas.Profile
			profileRecord, err = profile.GetProfileById(uint(profileId), h.DB(r))

			if err != nil {
				response.NotFound(w, "Profile not found")
				return
			}

			response.OKWithData(w, "OK", profileRecord)
		}
	})
}

func (h Handler) HandleGetProfileFriends() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		id := r.PathValue("profileId")

		if id == "" {
			log.Println("No path param for id")
			response.BadRequest(w, "Path param id is required")
			return
		}

		profileId, err := strconv.ParseUint(id, 10, 64)

		if err != nil {
			log.Println("Invalid profile id")
			response.BadRequest(w, "Invalid profile id")
			return
		}

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			var friends []*schemas.Friendship
			friends, err = friendship.GetAllFriends(uint(profileId), h.DB(r))

			if err != nil {
				log.Println("No friends found: ", err)
				response.NotFound(w, "Friends not found")
				return
			}

			response.OKWithData(w, "OK", friends)
		}
	})
}

func (h Handler) HandleDiscoverProfiles() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		if session == nil {
			log.Println("Invalid session")
			response.BadRequest(w, "Invalid session")
			return
		}

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			userProfile, err := profile.GetProfileById(session.UserID, h.DB(r))

			if err != nil {
				log.Println("Error getting user discoverNewProfileprofile:", err)
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			if userProfile == nil {
				log.Println("User discoverNewProfileprofile not found")
				response.BadRequest(w, "User discoverNewProfileprofile not found")
				return
			}

			discoverNewProfile, err := profile.DiscoverNewProfile(*userProfile, h.DB(r))
			if err != nil {
				log.Println("Error getting discoverNewProfileprofile:", err)
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			response.OKWithData(w, "OK", discoverNewProfile)
		}
	})
}

func (h Handler) HandleGetAllProfiles() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			profiles, err := profile.GetAllProfiles(h.DB(r))
			if err != nil {
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			response.OKWithData(w, "OK", profiles)
		}
	})
}

func (h Handler) HandleCheckUsernameAvailability() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		username := r.URL.Query().Get("username")

		if username == "" {
			response.BadRequest(w, "Username is required")
			return
		}

		if len(username) > 50 {
			response.BadRequest(w, "Username must be less than 50 characters")
			return
		}

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			available, err := profile.CheckUsernameAvailability(username, h.DB(r))
			if err != nil {
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			response.OKWithData(w, "OK", available)
		}
	})
}

func (h Handler) HandleSearchByUsername() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		username := r.URL.Query().Get("username")

		if username == "" {
			response.BadRequest(w, "Username is required")
			return
		}

		if len(username) > 50 {
			response.BadRequest(w, "Username must be less than 50 characters")
			return
		}

		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {
		default:
			foundProfile, err := profile.SearchProfilesByUsername(username, session.UserID, h.DB(r))

			if err != nil {
				response.NotFound(w, "Profile not found")
				return
			}

			response.OKWithData(w, "OK", foundProfile)
		}
	})
}

func (h Handler) HandleBlockProfile() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		if session == nil {
			response.BadRequest(w, "Invalid session")
			return
		}

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {
		default:
			type BlockProfileRequest struct {
				ProfileID uint `json:"profile_id"`
			}

			var request BlockProfileRequest
			err := json.NewDecoder(r.Body).Decode(&request)

			if err != nil {
				response.BadRequest(w, "Invalid request body")
				return
			}

			if request.ProfileID == 0 {
				response.BadRequest(w, "Profile ID is required")
				return
			}

			matchesBetweenProfiles, err := matches.GetMatchesBetweenProfiles(session.UserID, request.ProfileID, h.DB(r))

			if err != nil {
				response.InternalServerError(w, err, err.Error())
				return
			}

			if len(matchesBetweenProfiles) > 0 {
				for _, match := range matchesBetweenProfiles {

					if match.IsFriend {

						socketMatchRemovedMessage := types.SocketMessage[*schemas.Matches]{
							Type: "match_removed",
							Data: &match,
						}

						socket.BroadcastToUser(match.Profile1ID, socketMatchRemovedMessage, h.rdb, h.DB(r))
						socket.BroadcastToUser(match.Profile3ID, socketMatchRemovedMessage, h.rdb, h.DB(r))

						if err := h.DB(r).Delete(&match).Error; err != nil {
							response.InternalServerError(w, err, err.Error())
							return
						}

						continue
					}

					err := matches.UpdateMatchToRejected(match.ID, h.DB(r))

					matchSocketMessage := types.SocketMessage[*schemas.Matches]{
						Type: "match",
						Data: &match,
					}

					socket.BroadcastToUser[schemas.Matches](match.Profile1.UserID, matchSocketMessage, h.rdb, h.DB(r))
					socket.BroadcastToUser[schemas.Matches](match.Profile2.UserID, matchSocketMessage, h.rdb, h.DB(r))
					socket.BroadcastToUser[schemas.Matches](match.Profile3.UserID, matchSocketMessage, h.rdb, h.DB(r))
					socket.BroadcastToUser[schemas.Matches](match.Profile4.UserID, matchSocketMessage, h.rdb, h.DB(r))

					if err != nil {
						response.InternalServerError(w, err, err.Error())
						return
					}

				}
			}

			friendshipRecord, err := friendship.GetFriendShipBetweenProfiles(session.UserID, request.ProfileID, h.DB(r))

			if err != nil {
				log.Println(err)
			}

			if friendshipRecord != nil {
				err = friendship.RemoveFriendship(session.UserID, request.ProfileID, h.DB(r))
				if err != nil {
					response.InternalServerError(w, err, err.Error())
					return
				}
			}

			err = profile.BlockProfile(session.UserID, request.ProfileID, h.DB(r))
			if err != nil {
				response.InternalServerError(w, err, err.Error())
				return
			}

			response.OK(w, "OK")
		}
	})
}

func (h Handler) HandleGetBlockedProfiles() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		if session == nil {
			response.BadRequest(w, "Invalid session")
			return
		}

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {
		default:
			blocks, err := profile.GetBlockedProfiles(session.UserID, h.DB(r))
			if err != nil {
				response.InternalServerError(w, err, err.Error())
				return
			}

			response.OKWithData(w, "OK", blocks)
		}
	})
}

func (h Handler) HandleUnblockProfile() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		if session == nil {
			response.BadRequest(w, "Invalid session")
			return
		}

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {
		default:
			type UnblockProfileRequest struct {
				ProfileID uint `json:"profile_id"`
			}

			var request UnblockProfileRequest
			err := json.NewDecoder(r.Body).Decode(&request)

			if err != nil {
				response.BadRequest(w, "Invalid request body")
				return
			}

			if request.ProfileID == 0 {
				response.BadRequest(w, "Profile ID is required")
				return
			}

			err = profile.UnblockProfile(session.UserID, request.ProfileID, h.DB(r))
			if err != nil {
				response.InternalServerError(w, err, err.Error())
				return
			}

			response.OK(w, "OK")
		}
	})
}

func (h Handler) HandleReportProfile() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		if session == nil {
			response.BadRequest(w, "Invalid session")
			return
		}

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {
		default:

			var request types.ReportProfileRequest
			err := json.NewDecoder(r.Body).Decode(&request)

			if err != nil {
				response.BadRequest(w, "Invalid request body")
				return
			}

			if request.ReportedID == 0 {
				response.BadRequest(w, "Profile ID is required")
				return
			}

			if request.Reason == "" {
				response.BadRequest(w, "Reason is required")
				return
			}

			err = profile.ReportProfile(session.UserID, request, h.DB(r))
			if err != nil {
				response.InternalServerError(w, err, err.Error())
				return
			}

			response.OK(w, "OK")
		}
	})
}

func (h Handler) HandleReportBug() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		if session == nil {
			response.BadRequest(w, "Invalid session")
			return
		}

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {
		default:

			var request types.ReportBugRequest
			err := json.NewDecoder(r.Body).Decode(&request)

			if err != nil {
				response.BadRequest(w, "Invalid request body")
				return
			}

			if request.Problem == "" {
				response.BadRequest(w, "Problem is required")
				return
			}

			err = profile.ReportBug(session.UserID, request, h.DB(r))
			if err != nil {
				response.InternalServerError(w, err, err.Error())
				return
			}

			response.OK(w, "OK")
		}
	})
}

func (h Handler) HandleUpdateDateOfBirth() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		var requestBody types.UpdateDateOfBirthRequest
		err := json.NewDecoder(r.Body).Decode(&requestBody)

		if err != nil {
			response.BadRequest(w, "Invalid request body")
			return
		}

		parsedDateOfBirth, err := time.Parse(time.RFC3339, requestBody.DateOfBirth)

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

		profileRecord, err := profile.GetProfileById(session.UserID, h.DB(r))

		if err != nil {
			response.NotFound(w, "Could not find requested user")
			return
		}

		if profileRecord.UserID == 0 {
			response.NotFound(w, "Could not find requested user")
			return
		}

		if time.Now().AddDate(-100, 0, 0).After(profileRecord.DateOfBirth) {
			response.Forbidden(w, "Date of Birth is already set")
			return
		}

		if err := profile.UpdateDateOfBirth(session.UserID, parsedDateOfBirth, h.DB(r)); err != nil {
			response.InternalServerError(w, err, "Something went wrong")
			return
		}

		response.OK(w, "Updated Date of Birth")
	})
}
