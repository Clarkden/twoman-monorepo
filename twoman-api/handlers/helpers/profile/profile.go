package profile

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"
	"twoman/handlers/helpers/file"
	"twoman/handlers/helpers/friendship"
	"twoman/handlers/helpers/matches"
	"twoman/handlers/helpers/notifications"
	"twoman/schemas"
	"twoman/types"
	"twoman/utils"

	"github.com/aws/aws-sdk-go/service/s3"
	"googlemaps.github.io/maps"
	"gorm.io/gorm"
)

func CheckUsernameAvailability(username string, db *gorm.DB) (bool, error) {
	var user schemas.Profile
	err := db.Where("username = ?", username).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return true, nil
		}
		return false, err
	}
	return false, nil

}

func CreateProfile(userId uint, db *gorm.DB) error {
	if err := db.Create(&schemas.Profile{UserID: userId}).Error; err != nil {
		return err
	}

	return nil
}

func CreateProfileWithData(schema schemas.Profile, db *gorm.DB) error {
	if err := db.Create(&schema).Error; err != nil {
		return err
	}

	return nil
}

func UpdateProfile(request types.UpdateProfileRequest, userID uint, db *gorm.DB, s3 *s3.S3) error {
	if userID == 0 {
		return errors.New("no user id")
	}
	if request.Name == "" {
		return errors.New("profile must have a name")
	}
	if request.Image1 == "" {
		return errors.New("profile must have an image")
	}
	if request.Gender != "male" && request.Gender != "female" {
		return errors.New("gender is not valid")
	}

	var oldProfile schemas.Profile
	if err := db.First(&oldProfile, "user_id = ?", userID).Error; err != nil {
		return err
	}

	// Get all old images
	oldImages := []string{oldProfile.Image1, oldProfile.Image2, oldProfile.Image3, oldProfile.Image4}

	// Get new images and compact them (shift forward to fill empty slots)
	newImagesRaw := []string{request.Image1, request.Image2, request.Image3, request.Image4}
	newImages := utils.CompactImages(newImagesRaw)

	// Update the request with the compacted images
	request.Image1 = newImages[0]
	request.Image2 = newImages[1]
	request.Image3 = newImages[2]
	request.Image4 = newImages[3]

	// Find images to delete (as in current code)
	for _, oldURL := range oldImages {
		if oldURL == "" {
			continue
		}

		found := false
		for _, newURL := range newImages {
			if oldURL == newURL {
				found = true
				break
			}
		}

		if !found {
			// This image is no longer used, delete it
			oldFileName := getFileNameFromURL(oldURL)
			if err := file.DeleteFileByName(oldFileName, db, s3); err != nil {
				log.Printf("Warning: failed to delete old image %s: %v", oldFileName, err)
			}
		}
	}

	// Update profile (same as current code)
	return db.Model(&schemas.Profile{}).Where("user_id = ?", userID).Updates(map[string]interface{}{
		"name":                   request.Name,
		"bio":                    request.Bio,
		"image1":                 request.Image1,
		"image2":                 request.Image2,
		"image3":                 request.Image3,
		"image4":                 request.Image4,
		"gender":                 request.Gender,
		"education":              request.Education,
		"occupation":             request.Occupation,
		"interests":              request.Interests,
		"preferred_gender":       request.PreferredGender,
		"preferred_age_min":      request.PreferredAgeMin,
		"preferred_age_max":      request.PreferredAgeMax,
		"preferred_distance_max": request.PreferredDistanceMax,
	}).Error
}

func getFileNameFromURL(url string) string {
	parts := strings.Split(url, "/")
	return parts[len(parts)-1]
}

func GetProfileById(profileId uint, db *gorm.DB) (*schemas.Profile, error) {
	var profile *schemas.Profile
	if err := db.Where("user_id = ?", profileId).First(&profile).Error; err != nil {
		return nil, err
	}

	if profile == nil {
		return nil, errors.New("profile not found")
	}

	return profile, nil
}

// func DiscoverNewProfile(userProfile schemas.Profile, db *gorm.DB) (schemas.Profile, error) {
// 	var profile schemas.Profile

// 	// Subquery for blocked profiles
// 	blockedSubquery := db.Table("blocks").
// 		Select("CASE WHEN profile_id = ? THEN blocked_profile_id ELSE profile_id END", userProfile.UserID).
// 		Where("profile_id = ? OR blocked_profile_id = ?", userProfile.UserID, userProfile.UserID)

// 	// Main query
// 	query := db.Where("user_id != ?", userProfile.UserID).
// 		Where("user_id NOT IN (?)",
// 			db.Table("profile_views").
// 				Select("profile_id").
// 				Where("user_id = ?", userProfile.UserID)).
// 		Where("user_id NOT IN (?)", blockedSubquery)

// 	// Filter by Preferred Gender
// 	if userProfile.PreferredGender != "" {
// 		query = query.Where("gender = ?", userProfile.PreferredGender)
// 	}

// 	// Filter by Preferred Age Range
// 	if userProfile.PreferredAgeMin > 0 && userProfile.PreferredAgeMax > 0 {
// 		query = query.Where(`
//             (YEAR(CURDATE()) - YEAR(date_of_birth))
//              - (DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(date_of_birth, '%m%d')) >= ?
//             AND
//             (YEAR(CURDATE()) - YEAR(date_of_birth))
//              - (DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(date_of_birth, '%m%d')) <= ?
//         `,
// 			userProfile.PreferredAgeMin,
// 			userProfile.PreferredAgeMax,
// 		)
// 	}

// 	// --- Prioritizing by distance (without filtering) ---
// 	// Make sure the user actually has a valid location before calling ST_Distance_Sphere.

// 	if userProfile.LocationPoint.Valid() && userProfile.LocationPoint.Point != nil {
// 		query = query.Order(
// 			gorm.Expr(
// 				"ST_Distance_Sphere(location_point, ST_GeomFromText(?)) ASC, RAND()",
// 				userProfile.LocationPoint.String(),
// 			),
// 		)
// 	} else {
// 		query = query.Order("RAND()")
// 	}

// 	// Limit to 1 to get just the top-priority record
// 	err := query.Limit(1).First(&profile).Error
// 	if err != nil {
// 		if errors.Is(err, gorm.ErrRecordNotFound) {
// 			return schemas.Profile{}, fmt.Errorf("no matching profiles found")
// 		}
// 		return schemas.Profile{}, fmt.Errorf("error executing query: %w", err)
// 	}

// 	fmt.Printf("Fetched profile ID: %d\n", profile.UserID)
// 	return profile, nil
// }

func DiscoverNewProfile(userProfile schemas.Profile, db *gorm.DB) (schemas.Profile, error) {
	var profile schemas.Profile

	log.Println("Profile Latitude: ", userProfile.LocationPoint.Point.Y(), " Longitude: ", userProfile.LocationPoint.Point.X())
	log.Println("Profile Point Valid: ", userProfile.LocationPoint.Valid())

	// Subquery to get the IDs of profiles that are blocked or have blocked the user
	blockedSubquery := db.Table("blocks").
		Select("CASE WHEN profile_id = ? THEN blocked_profile_id ELSE profile_id END", userProfile.UserID).
		Where("profile_id = ? OR blocked_profile_id = ?", userProfile.UserID, userProfile.UserID)

	query := db.Where("user_id != ?", userProfile.UserID).
		Where("user_id NOT IN (?)",
			db.Table("profile_views").
				Select("profile_id").
				Where("user_id = ?", userProfile.UserID)).
		Where("user_id NOT IN (?)", blockedSubquery)

	if userProfile.PreferredGender != "" {
		query = query.Where("gender = ?", userProfile.PreferredGender)
	}

	if userProfile.PreferredAgeMin > 0 && userProfile.PreferredAgeMax > 0 {
		query = query.Where("(YEAR(CURDATE()) - YEAR(date_of_birth)) - (DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(date_of_birth, '%m%d')) >= ? AND "+
			"(YEAR(CURDATE()) - YEAR(date_of_birth)) - (DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(date_of_birth, '%m%d')) <= ?",
			userProfile.PreferredAgeMin, userProfile.PreferredAgeMax)
	}

	if userProfile.PreferredDistanceMax > 0 {
		if userProfile.LocationPoint.Point == nil {
			return schemas.Profile{}, fmt.Errorf("invalid user location point")
		}

		query = query.Where("ST_Distance_Sphere(location_point, ST_GeomFromText(?)) <= ?",
			userProfile.LocationPoint.String(),
			userProfile.PreferredDistanceMax*1000*4) // TODO: Remove this *4 multiplier (The 1000 is for meters, the 4 is for the distance multiplier)
	}

	query = query.Order("RAND()").Limit(1)

	err := query.First(&profile).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return schemas.Profile{}, fmt.Errorf("no matching profiles found")
		}
		return schemas.Profile{}, fmt.Errorf("error executing query: %w", err)
	}

	fmt.Printf("Fetched profile ID: %d\n", profile.UserID)

	return profile, nil
}

func CreateProfileView(userID uint, targetProfileID uint, db *gorm.DB) error {
	// Check if the profiles exist
	var userProfile, targetProfile schemas.Profile
	if err := db.First(&userProfile, userID).Error; err != nil {
		return fmt.Errorf("user profile not found: %w", err)
	}
	if err := db.First(&targetProfile, targetProfileID).Error; err != nil {
		return fmt.Errorf("target profile not found: %w", err)
	}

	// Check if a view already exists
	var existingView schemas.ProfileView
	err := db.Where("user_id = ? AND profile_id = ?", userID, targetProfileID).First(&existingView).Error

	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("error checking for existing profile view: %w", err)
		}
		// If no view exists, create a new one
		newView := schemas.ProfileView{
			UserID:    userID,
			ProfileID: targetProfileID,
		}
		if err := db.Create(&newView).Error; err != nil {
			return fmt.Errorf("error creating new profile view: %w", err)
		}
	} else {
		// If a view already exists, update its timestamp
		existingView.UpdatedAt = time.Now()
		if err := db.Save(&existingView).Error; err != nil {
			return fmt.Errorf("error updating existing profile view: %w", err)
		}
	}

	return nil
}

func GetAllProfiles(db *gorm.DB) ([]schemas.Profile, error) {
	var profiles []schemas.Profile
	err := db.Find(&profiles).Error
	return profiles, err
}

func GetCity(lat, lon float64, mapsClient *maps.Client) (string, error) {
	r := &maps.GeocodingRequest{
		LatLng: &maps.LatLng{
			Lat: lat,
			Lng: lon,
		},
	}
	resp, err := mapsClient.ReverseGeocode(context.Background(), r)
	if err != nil {
		return "", err
	}
	if len(resp) == 0 {
		return "", errors.New("no results found")
	}

	for _, result := range resp {
		for _, component := range result.AddressComponents {
			for _, t := range component.Types {
				if t == "locality" {
					return component.LongName, nil
				}
			}
		}
	}

	return "", errors.New("city not found in response")
}

func UpdateProfileLocation(data types.UpdateProfileLocationRequest, userId uint, city string, db *gorm.DB) error {
	profile, err := GetProfileById(userId, db)
	if err != nil {
		return err
	}

	profile.LocationPoint = *schemas.NewPoint(data.Lat, data.Lon)
	profile.City = city

	if err = db.Save(&profile).Error; err != nil {
		return err
	}

	return nil
}

func FindProfileByUsername(username string, db *gorm.DB) (*schemas.Profile, error) {
	var profile *schemas.Profile
	if err := db.Where("username = ?", username).First(&profile).Error; err != nil {
		return nil, err
	}

	if profile == nil {
		return nil, errors.New("profile not found")
	}

	return profile, nil
}

func SearchProfilesByUsername(username string, userId uint, db *gorm.DB) ([]*schemas.Profile, error) {
	var profiles []*schemas.Profile

	// Subquery to get the IDs of profiles that are blocked or have blocked the user
	blockedSubquery := db.Table("blocks").
		Select("CASE WHEN profile_id = ? THEN blocked_profile_id ELSE profile_id END", userId).
		Where("profile_id = ? OR blocked_profile_id = ?", userId, userId)

	// Main query
	err := db.Where("username LIKE ?", username+"%").
		Not("user_id = ?", userId).
		Not("user_id IN (?)", blockedSubquery).
		Limit(5).
		Find(&profiles).Error

	if err != nil {
		return nil, err
	}

	return profiles, nil
}

func BlockProfile(userId uint, targetProfileId uint, db *gorm.DB) error {
	var blockRecord schemas.Block
	if err := db.Where("profile_id = ? AND blocked_profile_id = ?", userId, targetProfileId).First(&blockRecord).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return db.Create(&schemas.Block{ProfileID: userId, BlockedProfileID: targetProfileId}).Error
		}
		return err
	}

	return nil
}

func UnblockProfile(userId uint, targetProfileId uint, db *gorm.DB) error {
	var blockRecord schemas.Block
	if err := db.Where("profile_id = ? AND blocked_profile_id = ?", userId, targetProfileId).First(&blockRecord).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("block record not found")
		}
		return err
	}

	return db.Delete(&blockRecord).Error
}

func GetBlockedProfiles(userId uint, db *gorm.DB) ([]schemas.Block, error) {
	var blocks []schemas.Block
	if err := db.Preload("BlockedProfile").Where("profile_id = ?", userId).Find(&blocks).Error; err != nil {
		return nil, err
	}

	return blocks, nil
}

func ReportProfile(userId uint, reportRequest types.ReportProfileRequest, db *gorm.DB) error {
	var reportRecord schemas.Report
	if err := db.Where("reporter_id = ? AND reported_id = ?", userId, reportRequest.ReportedID).First(&reportRecord).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return db.Create(&schemas.Report{ReporterID: userId, ReportedID: reportRequest.ReportedID, Reason: reportRequest.Reason}).Error
		}
		return err
	}

	return nil
}

func ReportBug(userId uint, bugReport types.ReportBugRequest, db *gorm.DB) error {
	if err := db.Create(&schemas.BugReport{ReporterID: userId, Problem: bugReport.Problem}).Error; err != nil {
		return err
	}

	return nil
}

func DeleteProfileViews(userId uint, db *gorm.DB) error {
	if err := db.Where("user_id = ? OR profile_id = ?", userId, userId).Delete(&schemas.ProfileView{}).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}

		return err
	}

	return nil
}

func DeleteProfileBlocks(userId uint, db *gorm.DB) error {
	if err := db.Where("profile_id = ? OR blocked_profile_id = ?", userId, userId).Delete(&schemas.Block{}).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}

		return err
	}

	return nil
}

func DeleteProfile(userId uint, db *gorm.DB, s3Client *s3.S3) error {

	var profile *schemas.Profile
	if err := db.Where("user_id = ?", userId).First(&profile).Error; err != nil {
		return err
	}

	if profile == nil {
		return errors.New("profile not found")
	}

	if profile.UserID == 0 {
		return errors.New("invalid user ID")
	}

	if err := file.DeleteAllUserFiles(profile.UserID, db, s3Client); err != nil {
		log.Println("Error deleting user files: ", err)
		return err
	}

	if err := matches.DeleteAllProfileMatches(profile.UserID, db); err != nil {
		log.Println("Error deleting profile matches: ", err)
		return err
	}

	if err := friendship.DeleteAllProfileFriendships(profile.UserID, db); err != nil {
		log.Println("Error deleting profile friendships: ", err)
		return err
	}

	if err := DeleteProfileViews(profile.UserID, db); err != nil {
		log.Println("Error deleting profile views: ", err)
		return err
	}

	if err := DeleteProfileBlocks(userId, db); err != nil {
		log.Println("Error deleting profile blocks: ", err)
		return err
	}

	if err := notifications.DeletePushTokens(userId, db); err != nil {
		log.Println("Error deleting push tokens: ", err)
		return err
	}

	if err := db.Where("user_id = ?", userId).Delete(&schemas.Profile{}).Error; err != nil {
		log.Println("Error deleting profile: ", err)
		return err
	}

	return nil
}

func UpdateDateOfBirth(userId uint, dateOfBirth time.Time, db *gorm.DB) error {
	// TODO: Implement functionality
	return nil
}

func AdminUpdateProfile(request types.AdminUpdateProfileRequest, userID uint, db *gorm.DB, s3 *s3.S3, mapsclient *maps.Client) error {
	if userID == 0 {
		return errors.New("no user id")
	}
	if request.Name == "" {
		return errors.New("profile must have a name")
	}
	if request.Image1 == "" {
		return errors.New("profile must have an image")
	}
	if request.Gender != "male" && request.Gender != "female" {
		return errors.New("gender is not valid")
	}

	var oldProfile schemas.Profile
	if err := db.First(&oldProfile, "user_id = ?", userID).Error; err != nil {
		log.Println("could not find oldProfile")
		return err
	}

	// Get all old images
	oldImages := []string{oldProfile.Image1, oldProfile.Image2, oldProfile.Image3, oldProfile.Image4}

	// Get new images and compact them
	newImagesRaw := []string{request.Image1, request.Image2, request.Image3, request.Image4}
	newImages := utils.CompactImages(newImagesRaw)

	// Update the request with the compacted images
	request.Image1 = newImages[0]
	request.Image2 = newImages[1]
	request.Image3 = newImages[2]
	request.Image4 = newImages[3]

	// Find images to delete
	for _, oldURL := range oldImages {
		if oldURL == "" {
			continue
		}

		found := false
		for _, newURL := range newImages {
			if oldURL == newURL {
				found = true
				break
			}
		}

		if !found {
			// This image is no longer used, delete it
			oldFileName := getFileNameFromURL(oldURL)
			if err := file.DeleteFileByName(oldFileName, db, s3); err != nil {
				// Log the error but don't stop the update process
				log.Printf("Warning: failed to delete old image %s: %v", oldFileName, err)
			}
		}
	}

	parsedDateOfBirth, err := time.Parse(time.RFC3339, request.DateOfBirth)

	if err != nil {
		return err
	}

	minAge := 18
	minBirthDate := time.Now().AddDate(-minAge, 0, 0)
	if parsedDateOfBirth.After(minBirthDate) {
		return err
	}

	updateData := map[string]interface{}{
		"name":                   request.Name,
		"username":               request.Username,
		"bio":                    request.Bio,
		"gender":                 request.Gender,
		"date_of_birth":          parsedDateOfBirth,
		"education":              request.Education,
		"occupation":             request.Occupation,
		"interests":              request.Interests,
		"image1":                 request.Image1,
		"image2":                 request.Image2,
		"image3":                 request.Image3,
		"image4":                 request.Image4,
		"preferred_gender":       request.PreferredGender,
		"preferred_age_min":      request.PreferredAgeMin,
		"preferred_age_max":      request.PreferredAgeMax,
		"preferred_distance_max": request.PreferredDistanceMax,
	}

	if request.Lat != 0 && request.Lon != 0 {
		log.Println("LAT: ", request.Lat, " | LON: ", request.Lon)

		city, err := GetCity(request.Lat, request.Lon, mapsclient)

		if err != nil {
			log.Println("no city found")
			return err
		}

		updateData["location_point"] = *schemas.NewPoint(request.Lat, request.Lon)
		updateData["city"] = city
	}

	log.Println(userID)
	return db.Model(&schemas.Profile{}).Where("user_id = ?", userID).Updates(updateData).Error
}

func DeleteProfileViewsBetweenUsers(userID1 uint, userID2 uint, db *gorm.DB) error {
	err := db.Where("(user_id = ? AND profile_id = ?) OR (user_id = ? AND profile_id = ?)",
		userID1, userID2, userID2, userID1).Delete(&schemas.ProfileView{}).Error

	if err != nil {
		return fmt.Errorf("error deleting profile views between users: %w", err)
	}

	return nil
}

func DeleteProfileViewsForMatch(match schemas.Matches, db *gorm.DB) error {
	profileIDs := []uint{match.Profile1ID, match.Profile3ID}
	if match.Profile2ID != nil {
		profileIDs = append(profileIDs, *match.Profile2ID)
	}
	if match.Profile4ID != nil {
		profileIDs = append(profileIDs, *match.Profile4ID)
	}

	for i, id1 := range profileIDs {
		for j, id2 := range profileIDs {
			if i != j {
				if err := db.Where("(user_id = ? AND profile_id = ?) OR (user_id = ? AND profile_id = ?)",
					id1, id2, id2, id1).Delete(&schemas.ProfileView{}).Error; err != nil {
					return fmt.Errorf("error deleting profile views: %w", err)
				}
			}
		}
	}

	return nil
}

func updateImage(oldURL, newURL string, db *gorm.DB, s3 *s3.S3) (string, error) {
	if newURL == "" || newURL == oldURL {
		return oldURL, nil
	}
	if oldURL != "" {
		oldFileName := getFileNameFromURL(oldURL)
		if err := file.DeleteFileByName(oldFileName, db, s3); err != nil {
			log.Printf("Warning: failed to delete old image %s: %v", oldFileName, err)
		}
	}
	return newURL, nil
}
