package standouts

import (
	"errors"
	"fmt"
	"log"
	"time"
	"twoman/schemas"

	"gorm.io/gorm"
)

// GetUserStarBalance returns the current star balance for a user
func GetUserStarBalance(userID uint, db *gorm.DB) (int, error) {
	var stars schemas.Stars
	err := db.Where("user_id = ?", userID).First(&stars).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create initial star balance if doesn't exist
			newStars := schemas.Stars{
				UserID:  userID,
				Balance: 0,
			}
			if createErr := db.Create(&newStars).Error; createErr != nil {
				return 0, createErr
			}
			return 0, nil
		}
		return 0, err
	}
	return stars.Balance, nil
}

// UpdateUserStarBalance updates a user's star balance and records transaction
func UpdateUserStarBalance(userID uint, amount int, transactionType string, description string, db *gorm.DB) error {
	// Get current balance
	var stars schemas.Stars
	err := db.Where("user_id = ?", userID).First(&stars).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create initial star balance
			stars = schemas.Stars{
				UserID:  userID,
				Balance: 0,
			}
			if createErr := db.Create(&stars).Error; createErr != nil {
				return createErr
			}
		} else {
			return err
		}
	}

	// Check if user has enough stars for negative transactions
	if amount < 0 && stars.Balance+amount < 0 {
		return errors.New("insufficient star balance")
	}

	// Update balance
	stars.Balance += amount
	if err := db.Save(&stars).Error; err != nil {
		return err
	}

	// Record transaction
	transaction := schemas.StarTransactions{
		UserID:          userID,
		Amount:          amount,
		TransactionType: transactionType,
		Description:     description,
	}
	if err := db.Create(&transaction).Error; err != nil {
		return err
	}

	return nil
}

// CheckAndRefreshStandouts checks if standouts need to be refreshed for a user and refreshes if needed
func CheckAndRefreshStandouts(userID uint, db *gorm.DB) error {
	now := time.Now()
	weekAgo := now.AddDate(0, 0, -7)

	// Use FirstOrCreate to handle the refresh record safely
	var refresh schemas.StandoutRefresh
	err := db.Where("user_id = ?", userID).FirstOrCreate(&refresh, schemas.StandoutRefresh{
		UserID:          userID,
		LastRefreshedAt: now.AddDate(0, 0, -8), // Set to 8 days ago to trigger refresh on first creation
	}).Error

	if err != nil {
		return err
	}

	// Check if a week has passed (7 days)
	needsRefresh := refresh.LastRefreshedAt.Before(weekAgo)

	if needsRefresh {
		// Refresh standouts
		if err := RefreshStandoutsForUser(userID, db); err != nil {
			return err
		}

		// Update refresh timestamp
		refresh.LastRefreshedAt = now
		if err := db.Save(&refresh).Error; err != nil {
			return err
		}
	}

	return nil
}

// RefreshStandoutsForUser clears old standouts and generates new ones for a user
func RefreshStandoutsForUser(userID uint, db *gorm.DB) error {
	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Get user's location for filtering
	var userProfile schemas.Profile
	if err := tx.Where("user_id = ?", userID).First(&userProfile).Error; err != nil {
		tx.Rollback()
		return err
	}

	// For now, we'll just mark existing standouts as inactive rather than deleting them
	// This preserves data for analytics while refreshing the active set

	// Deactivate existing duo standouts
	if err := tx.Model(&schemas.DuoStandouts{}).Where("is_active = true").Update("is_active", false).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Deactivate existing solo standouts
	if err := tx.Model(&schemas.SoloStandouts{}).Where("is_active = true").Update("is_active", false).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

// GetDuoStandouts returns the top duo friend pairs with most matches (with location filtering)
func GetDuoStandouts(userID uint, limit int, db *gorm.DB) ([]schemas.DuoStandouts, error) {
	// First check if we need to refresh standouts
	if err := CheckAndRefreshStandouts(userID, db); err != nil {
		log.Printf("Error checking standouts refresh: %v", err)
		// Continue anyway to return existing standouts
	}

	var duoStandouts []schemas.DuoStandouts

	// Get user's profile for location filtering
	var userProfile schemas.Profile
	if err := db.Where("user_id = ?", userID).First(&userProfile).Error; err != nil {
		return nil, fmt.Errorf("failed to get user profile: %v", err)
	}

	// Get user's location point for distance calculation
	userLocationWKT := fmt.Sprintf("POINT(%f %f)",
		userProfile.LocationPoint.Point.Coords()[0],
		userProfile.LocationPoint.Point.Coords()[1])

	// Get all friend pairs within the user's preferred distance and count their combined matches
	query := `
		SELECT 
			f1.profile_id as profile1_id,
			f1.friend_id as profile2_id,
			COUNT(DISTINCT m.id) as match_count
		FROM friendships f1
		JOIN friendships f2 ON f1.profile_id = f2.friend_id AND f1.friend_id = f2.profile_id
		JOIN profiles p1 ON f1.profile_id = p1.user_id
		JOIN profiles p2 ON f1.friend_id = p2.user_id
		JOIN matches m ON (
			(m.profile1_id = f1.profile_id AND m.profile2_id = f1.friend_id AND m.is_duo = true AND m.status = 'accepted')
			OR
			(m.profile1_id = f1.friend_id AND m.profile2_id = f1.profile_id AND m.is_duo = true AND m.status = 'accepted')
		)
		LEFT JOIN standout_likes sl ON (
			sl.sender_id = ? AND sl.is_duo = true AND 
			((sl.target_profile1_id = f1.profile_id AND sl.target_profile2_id = f1.friend_id) OR
			 (sl.target_profile1_id = f1.friend_id AND sl.target_profile2_id = f1.profile_id))
		)
		WHERE f1.accepted = true 
		AND f2.accepted = true
		AND f1.profile_id != ? 
		AND f1.friend_id != ?
		AND f1.profile_id < f1.friend_id -- Avoid duplicates
		AND (ST_Distance_Sphere(p1.location_point, ST_GeomFromText(?)) <= ? * 1000
		     OR ST_Distance_Sphere(p2.location_point, ST_GeomFromText(?)) <= ? * 1000)
		AND sl.id IS NULL -- Exclude duos already liked
		GROUP BY f1.profile_id, f1.friend_id
		ORDER BY match_count DESC
		LIMIT ?
	`

	type DuoStandoutResult struct {
		Profile1ID uint `json:"profile1_id"`
		Profile2ID uint `json:"profile2_id"`
		MatchCount int  `json:"match_count"`
	}

	var results []DuoStandoutResult
	if err := db.Raw(query, userID, userID, userID, userLocationWKT, userProfile.PreferredDistanceMax, userLocationWKT, userProfile.PreferredDistanceMax, limit).Scan(&results).Error; err != nil {
		log.Printf("Error getting duo standouts: %v", err)
		return nil, err
	}

	// If no results from match-based query, fall back to random nearby friend pairs
	if len(results) == 0 {
		fallbackQuery := `
			SELECT 
				f1.profile_id as profile1_id,
				f1.friend_id as profile2_id,
				0 as match_count
			FROM friendships f1
			JOIN friendships f2 ON f1.profile_id = f2.friend_id AND f1.friend_id = f2.profile_id
			JOIN profiles p1 ON f1.profile_id = p1.user_id
			JOIN profiles p2 ON f1.friend_id = p2.user_id
			LEFT JOIN standout_likes sl ON (
				sl.sender_id = ? AND sl.is_duo = true AND 
				((sl.target_profile1_id = f1.profile_id AND sl.target_profile2_id = f1.friend_id) OR
				 (sl.target_profile1_id = f1.friend_id AND sl.target_profile2_id = f1.profile_id))
			)
			WHERE f1.accepted = true 
			AND f2.accepted = true
			AND f1.profile_id != ? 
			AND f1.friend_id != ?
			AND f1.profile_id < f1.friend_id -- Avoid duplicates
			AND (ST_Distance_Sphere(p1.location_point, ST_GeomFromText(?)) <= ? * 1000
			     OR ST_Distance_Sphere(p2.location_point, ST_GeomFromText(?)) <= ? * 1000)
			AND sl.id IS NULL -- Exclude duos already liked
			ORDER BY RAND()
			LIMIT ?
		`
		if err := db.Raw(fallbackQuery, userID, userID, userID, userLocationWKT, userProfile.PreferredDistanceMax, userLocationWKT, userProfile.PreferredDistanceMax, limit).Scan(&results).Error; err != nil {
			log.Printf("Error getting fallback duo standouts: %v", err)
			return nil, err
		}
	}

	// Convert results to DuoStandouts with profile data
	for _, result := range results {
		standout := schemas.DuoStandouts{
			Profile1ID: result.Profile1ID,
			Profile2ID: result.Profile2ID,
			MatchCount: result.MatchCount,
			IsActive:   true,
		}

		// Load profile data
		if err := db.Preload("Profile1").Preload("Profile2").Where("profile1_id = ? AND profile2_id = ?", result.Profile1ID, result.Profile2ID).FirstOrCreate(&standout).Error; err != nil {
			log.Printf("Error creating/loading duo standout: %v", err)
			continue
		}

		duoStandouts = append(duoStandouts, standout)
	}

	return duoStandouts, nil
}

// GetSoloStandouts returns popular individual profiles (with location filtering)
func GetSoloStandouts(userID uint, limit int, db *gorm.DB) ([]schemas.SoloStandouts, error) {
	// First check if we need to refresh standouts
	if err := CheckAndRefreshStandouts(userID, db); err != nil {
		log.Printf("Error checking standouts refresh: %v", err)
		// Continue anyway to return existing standouts
	}

	var soloStandouts []schemas.SoloStandouts

	// Get user's profile for location filtering
	var userProfile schemas.Profile
	if err := db.Where("user_id = ?", userID).First(&userProfile).Error; err != nil {
		return nil, fmt.Errorf("failed to get user profile: %v", err)
	}

	// Get user's location point for distance calculation
	userLocationWKT := fmt.Sprintf("POINT(%f %f)",
		userProfile.LocationPoint.Point.Coords()[0],
		userProfile.LocationPoint.Point.Coords()[1])

	// First try to get profiles with matches (popularity-based)
	query := `
		SELECT 
			p1.user_id as profile_id,
			COUNT(DISTINCT m.id) as popularity_score
		FROM profiles p1
		JOIN matches m ON (
			(m.profile3_id = p1.user_id AND m.status = 'accepted')
			OR
			(m.profile4_id = p1.user_id AND m.status = 'accepted')
		)
		LEFT JOIN standout_likes sl ON (
			sl.sender_id = ? AND sl.target_profile1_id = p1.user_id AND sl.is_duo = false
		)
		WHERE p1.user_id != ?
		AND ST_Distance_Sphere(p1.location_point, ST_GeomFromText(?)) <= ? * 1000
		AND sl.id IS NULL -- Exclude profiles already liked
		GROUP BY p1.user_id
		ORDER BY popularity_score DESC
		LIMIT ?
	`

	type SoloStandoutResult struct {
		ProfileID       uint `json:"profile_id"`
		PopularityScore int  `json:"popularity_score"`
	}

	var results []SoloStandoutResult
	if err := db.Raw(query, userID, userID, userLocationWKT, userProfile.PreferredDistanceMax, limit).Scan(&results).Error; err != nil {
		log.Printf("Error getting solo standouts: %v", err)
		return nil, err
	}

	// If no results from popularity-based query, fall back to random nearby profiles
	if len(results) == 0 {
		fallbackQuery := `
			SELECT 
				p1.user_id as profile_id,
				0 as popularity_score
			FROM profiles p1
			LEFT JOIN standout_likes sl ON (
				sl.sender_id = ? AND sl.target_profile1_id = p1.user_id AND sl.is_duo = false
			)
			WHERE p1.user_id != ?
			AND ST_Distance_Sphere(p1.location_point, ST_GeomFromText(?)) <= ? * 1000
			AND sl.id IS NULL -- Exclude profiles already liked
			ORDER BY RAND()
			LIMIT ?
		`
		if err := db.Raw(fallbackQuery, userID, userID, userLocationWKT, userProfile.PreferredDistanceMax, limit).Scan(&results).Error; err != nil {
			log.Printf("Error getting fallback solo standouts: %v", err)
			return nil, err
		}
	}

	// Convert results to SoloStandouts with profile data
	for _, result := range results {
		standout := schemas.SoloStandouts{
			ProfileID:       result.ProfileID,
			PopularityScore: result.PopularityScore,
			IsActive:        true,
		}

		// Load profile data
		if err := db.Preload("Profile").Where("profile_id = ?", result.ProfileID).FirstOrCreate(&standout).Error; err != nil {
			log.Printf("Error creating/loading solo standout: %v", err)
			continue
		}

		soloStandouts = append(soloStandouts, standout)
	}

	return soloStandouts, nil
}
