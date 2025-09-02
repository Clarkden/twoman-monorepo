package standouts

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"
	"twoman/schemas"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// Redis key TTL for standouts (1 week)
const STANDOUTS_TTL = 7 * 24 * time.Hour

// Redis data structures
type DuoStandoutsRedis struct {
	ProfilePairs [][]uint        `json:"profile_pairs"` // Array of [profile1_id, profile2_id] pairs
	Liked        map[string]bool `json:"liked"`         // "profile1_id,profile2_id" -> true
}

type SoloStandoutsRedis struct {
	ProfileIDs []uint          `json:"profile_ids"` // Array of profile IDs
	Liked      map[string]bool `json:"liked"`       // "profile_id" -> true
}

// GetUserStarBalance returns the current star balance for a user
func GetUserStarBalance(userID uint, db *gorm.DB) (int, error) {
	var stars schemas.Stars
	err := db.Where("user_id = ?", userID).First(&stars).Error
	if err != nil {
		log.Printf("Error getting star balance for user %d: %v", userID, err)
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
	log.Printf("User %d has %d stars", userID, stars.Balance)
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

// GetDuoStandouts returns duo standouts from Redis, generating if needed
func GetDuoStandouts(userID uint, limit int, db *gorm.DB, rdb *redis.Client) ([]schemas.DuoStandouts, error) {
	ctx := context.Background()
	key := fmt.Sprintf("user:%d:standouts:duo", userID)

	// Try to get from Redis first
	data, err := rdb.Get(ctx, key).Result()
	if err != nil && !errors.Is(err, redis.Nil) {
		log.Printf("Error getting duo standouts from Redis: %v", err)
		// Continue to generate fresh data
	}

	var duoData DuoStandoutsRedis
	if err == nil {
		// Parse Redis data
		if parseErr := json.Unmarshal([]byte(data), &duoData); parseErr != nil {
			log.Printf("Error parsing duo standouts from Redis: %v", parseErr)
			// Continue to generate fresh data
		} else {
			// We have valid cached data, convert to response format
			return convertDuoRedisToResponse(duoData, db)
		}
	}

	// Generate fresh duo standouts
	log.Printf("Generating fresh duo standouts for user %d", userID)
	if err := generateAndCacheDuoStandouts(userID, limit, db, rdb); err != nil {
		return nil, fmt.Errorf("failed to generate duo standouts: %v", err)
	}

	// Get the newly cached data
	data, err = rdb.Get(ctx, key).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get newly cached duo standouts: %v", err)
	}

	if err := json.Unmarshal([]byte(data), &duoData); err != nil {
		return nil, fmt.Errorf("failed to parse newly cached duo standouts: %v", err)
	}

	return convertDuoRedisToResponse(duoData, db)
}

// GetSoloStandouts returns solo standouts from Redis, generating if needed
func GetSoloStandouts(userID uint, limit int, db *gorm.DB, rdb *redis.Client) ([]schemas.SoloStandouts, error) {
	ctx := context.Background()
	key := fmt.Sprintf("user:%d:standouts:solo", userID)

	// Try to get from Redis first
	data, err := rdb.Get(ctx, key).Result()
	if err != nil && !errors.Is(err, redis.Nil) {
		log.Printf("Error getting solo standouts from Redis: %v", err)
		// Continue to generate fresh data
	}

	var soloData SoloStandoutsRedis
	if err == nil {
		// Parse Redis data
		if parseErr := json.Unmarshal([]byte(data), &soloData); parseErr != nil {
			log.Printf("Error parsing solo standouts from Redis: %v", parseErr)
			// Continue to generate fresh data
		} else {
			// We have valid cached data, convert to response format
			return convertSoloRedisToResponse(soloData, db)
		}
	}

	// Generate fresh solo standouts
	log.Printf("Generating fresh solo standouts for user %d", userID)
	if err := generateAndCacheSoloStandouts(userID, limit, db, rdb); err != nil {
		return nil, fmt.Errorf("failed to generate solo standouts: %v", err)
	}

	// Get the newly cached data
	data, err = rdb.Get(ctx, key).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get newly cached solo standouts: %v", err)
	}

	if err := json.Unmarshal([]byte(data), &soloData); err != nil {
		return nil, fmt.Errorf("failed to parse newly cached solo standouts: %v", err)
	}

	return convertSoloRedisToResponse(soloData, db)
}

// MarkDuoStandoutLiked marks a duo standout as liked in Redis
func MarkDuoStandoutLiked(userID uint, profile1ID uint, profile2ID uint, rdb *redis.Client) error {
	ctx := context.Background()
	key := fmt.Sprintf("user:%d:standouts:duo", userID)

	// Get current data
	data, err := rdb.Get(ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			log.Printf("No duo standouts found in Redis for user %d", userID)
			return nil // Nothing to mark as liked
		}
		return fmt.Errorf("failed to get duo standouts from Redis: %v", err)
	}

	var duoData DuoStandoutsRedis
	if err := json.Unmarshal([]byte(data), &duoData); err != nil {
		return fmt.Errorf("failed to parse duo standouts from Redis: %v", err)
	}

	// Initialize liked map if nil
	if duoData.Liked == nil {
		duoData.Liked = make(map[string]bool)
	}

	// Mark as liked (order doesn't matter for the key)
	likedKey := fmt.Sprintf("%d,%d", profile1ID, profile2ID)
	duoData.Liked[likedKey] = true

	// Also try the reverse order in case it exists
	reverseKey := fmt.Sprintf("%d,%d", profile2ID, profile1ID)
	duoData.Liked[reverseKey] = true

	// Save back to Redis
	updatedData, err := json.Marshal(duoData)
	if err != nil {
		return fmt.Errorf("failed to marshal updated duo standouts: %v", err)
	}

	if err := rdb.Set(ctx, key, updatedData, STANDOUTS_TTL).Err(); err != nil {
		return fmt.Errorf("failed to save updated duo standouts to Redis: %v", err)
	}

	log.Printf("Marked duo standout %d,%d as liked for user %d", profile1ID, profile2ID, userID)
	return nil
}

// MarkSoloStandoutLiked marks a solo standout as liked in Redis
func MarkSoloStandoutLiked(userID uint, profileID uint, rdb *redis.Client) error {
	ctx := context.Background()
	key := fmt.Sprintf("user:%d:standouts:solo", userID)

	// Get current data
	data, err := rdb.Get(ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			log.Printf("No solo standouts found in Redis for user %d", userID)
			return nil // Nothing to mark as liked
		}
		return fmt.Errorf("failed to get solo standouts from Redis: %v", err)
	}

	var soloData SoloStandoutsRedis
	if err := json.Unmarshal([]byte(data), &soloData); err != nil {
		return fmt.Errorf("failed to parse solo standouts from Redis: %v", err)
	}

	// Initialize liked map if nil
	if soloData.Liked == nil {
		soloData.Liked = make(map[string]bool)
	}

	// Mark as liked
	likedKey := fmt.Sprintf("%d", profileID)
	soloData.Liked[likedKey] = true

	// Save back to Redis
	updatedData, err := json.Marshal(soloData)
	if err != nil {
		return fmt.Errorf("failed to marshal updated solo standouts: %v", err)
	}

	if err := rdb.Set(ctx, key, updatedData, STANDOUTS_TTL).Err(); err != nil {
		return fmt.Errorf("failed to save updated solo standouts to Redis: %v", err)
	}

	log.Printf("Marked solo standout %d as liked for user %d", profileID, userID)
	return nil
}

// generateAndCacheDuoStandouts generates fresh duo standouts and caches them in Redis
func generateAndCacheDuoStandouts(userID uint, limit int, db *gorm.DB, rdb *redis.Client) error {
	// Get user's profile for location filtering
	var userProfile schemas.Profile
	if err := db.Where("user_id = ?", userID).First(&userProfile).Error; err != nil {
		return fmt.Errorf("failed to get user profile: %v", err)
	}

	// Log gender preference for debugging
	log.Printf("Generating duo standouts for user %d with gender preference: '%s'", userID, userProfile.PreferredGender)

	// Get user's location point for distance calculation
	userLocationWKT := fmt.Sprintf("POINT(%f %f)",
		userProfile.LocationPoint.Point.Coords()[0],
		userProfile.LocationPoint.Point.Coords()[1])

	// Query to find friend pairs within distance, ordered by match count
	query := `
		SELECT
			f1.profile_id as profile1_id,
			f1.friend_id as profile2_id,
			COUNT(DISTINCT m.id) as match_count
		FROM friendships f1
		JOIN friendships f2 ON f1.profile_id = f2.friend_id AND f1.friend_id = f2.profile_id
		JOIN profiles p1 ON f1.profile_id = p1.user_id
		JOIN profiles p2 ON f1.friend_id = p2.user_id
		LEFT JOIN matches m ON (
			(m.profile3_id = f1.profile_id AND m.profile4_id = f1.friend_id AND m.is_duo = true AND m.status = 'accepted')
			OR
			(m.profile3_id = f1.friend_id AND m.profile4_id = f1.profile_id AND m.is_duo = true AND m.status = 'accepted')
		)
		WHERE f1.accepted = true
		AND f2.accepted = true
		AND f1.profile_id != ?
		AND f1.friend_id != ?
		AND f1.profile_id < f1.friend_id -- Avoid duplicates
		AND (ST_Distance_Sphere(p1.location_point, ST_GeomFromText(?)) <= ? * 1000
		     OR ST_Distance_Sphere(p2.location_point, ST_GeomFromText(?)) <= ? * 1000)
		AND (p1.gender = ? OR ? = '')
		AND (p2.gender = ? OR ? = '')
		GROUP BY f1.profile_id, f1.friend_id
		ORDER BY match_count DESC, RAND()
		LIMIT ?
	`

	type DuoResult struct {
		Profile1ID uint `json:"profile1_id"`
		Profile2ID uint `json:"profile2_id"`
		MatchCount int  `json:"match_count"`
	}

	var results []DuoResult
	if err := db.Raw(query, userID, userID, userLocationWKT, userProfile.PreferredDistanceMax, userLocationWKT, userProfile.PreferredDistanceMax, userProfile.PreferredGender, userProfile.PreferredGender, userProfile.PreferredGender, userProfile.PreferredGender, limit).Scan(&results).Error; err != nil {
		return fmt.Errorf("failed to query duo standouts: %v", err)
	}

	log.Printf("Primary duo query returned %d results for user %d", len(results), userID)

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
			WHERE f1.accepted = true
			AND f2.accepted = true
			AND f1.profile_id != ?
			AND f1.friend_id != ?
			AND f1.profile_id < f1.friend_id -- Avoid duplicates
			AND (ST_Distance_Sphere(p1.location_point, ST_GeomFromText(?)) <= ? * 1000
			     OR ST_Distance_Sphere(p2.location_point, ST_GeomFromText(?)) <= ? * 1000)
			AND (p1.gender = ? OR ? = '')
			AND (p2.gender = ? OR ? = '')
			ORDER BY RAND()
			LIMIT ?
		`
		if err := db.Raw(fallbackQuery, userID, userID, userLocationWKT, userProfile.PreferredDistanceMax, userLocationWKT, userProfile.PreferredDistanceMax, userProfile.PreferredGender, userProfile.PreferredGender, userProfile.PreferredGender, userProfile.PreferredGender, limit).Scan(&results).Error; err != nil {
			return fmt.Errorf("failed to query fallback duo standouts: %v", err)
		}

		log.Printf("Fallback duo query returned %d results for user %d", len(results), userID)

		// If still no results, fall back to random friend pairs without distance constraint
		if len(results) == 0 {
			noDistanceFallbackQuery := `
				SELECT
					f1.profile_id as profile1_id,
					f1.friend_id as profile2_id,
					0 as match_count
				FROM friendships f1
				JOIN friendships f2 ON f1.profile_id = f2.friend_id AND f1.friend_id = f2.profile_id
				JOIN profiles p1 ON f1.profile_id = p1.user_id
				JOIN profiles p2 ON f1.friend_id = p2.user_id
				WHERE f1.accepted = true
				AND f2.accepted = true
				AND f1.profile_id != ?
				AND f1.friend_id != ?
				AND f1.profile_id < f1.friend_id -- Avoid duplicates
				AND (p1.gender = ? OR ? = '')
				AND (p2.gender = ? OR ? = '')
				ORDER BY RAND()
				LIMIT ?
			`
			if err := db.Raw(noDistanceFallbackQuery, userID, userID, userProfile.PreferredGender, userProfile.PreferredGender, userProfile.PreferredGender, userProfile.PreferredGender, limit).Scan(&results).Error; err != nil {
				return fmt.Errorf("failed to query no-distance fallback duo standouts: %v", err)
			}

			log.Printf("No-distance fallback duo query returned %d results for user %d", len(results), userID)

			// If still no results, try a simple query for any two profiles that are friends (not necessarily mutual)
			if len(results) == 0 {
				log.Printf("No mutual friendships found, trying simple friendship query for user %d", userID)
				simpleFriendshipQuery := `
					SELECT
						f.profile_id as profile1_id,
						f.friend_id as profile2_id,
						0 as match_count
					FROM friendships f
					JOIN profiles p1 ON f.profile_id = p1.user_id
					JOIN profiles p2 ON f.friend_id = p2.user_id
					WHERE f.accepted = true
					AND f.profile_id != ?
					AND f.friend_id != ?
					AND f.profile_id != f.friend_id
					AND (p1.gender = ? OR ? = '')
					AND (p2.gender = ? OR ? = '')
					ORDER BY RAND()
					LIMIT ?
				`
				if err := db.Raw(simpleFriendshipQuery, userID, userID, userProfile.PreferredGender, userProfile.PreferredGender, userProfile.PreferredGender, userProfile.PreferredGender, limit).Scan(&results).Error; err != nil {
					log.Printf("Failed to query simple friendship duo standouts for user %d: %v", userID, err)
					return fmt.Errorf("failed to query simple friendship duo standouts: %v", err)
				}

				log.Printf("Simple friendship duo query returned %d results for user %d", len(results), userID)
			}
		}
	}

	// Convert to Redis format
	duoData := DuoStandoutsRedis{
		ProfilePairs: make([][]uint, 0, len(results)),
		Liked:        make(map[string]bool),
	}

	for _, result := range results {
		duoData.ProfilePairs = append(duoData.ProfilePairs, []uint{result.Profile1ID, result.Profile2ID})
	}

	// Cache in Redis
	ctx := context.Background()
	key := fmt.Sprintf("user:%d:standouts:duo", userID)
	data, err := json.Marshal(duoData)
	if err != nil {
		return fmt.Errorf("failed to marshal duo standouts: %v", err)
	}

	if err := rdb.Set(ctx, key, data, STANDOUTS_TTL).Err(); err != nil {
		return fmt.Errorf("failed to cache duo standouts in Redis: %v", err)
	}

	log.Printf("Generated and cached %d duo standouts for user %d", len(results), userID)
	return nil
}

// generateAndCacheSoloStandouts generates fresh solo standouts and caches them in Redis
func generateAndCacheSoloStandouts(userID uint, limit int, db *gorm.DB, rdb *redis.Client) error {
	// Get user's profile for location filtering
	var userProfile schemas.Profile
	if err := db.Where("user_id = ?", userID).First(&userProfile).Error; err != nil {
		return fmt.Errorf("failed to get user profile: %v", err)
	}

	// Log gender preference for debugging
	log.Printf("Generating solo standouts for user %d with gender preference: '%s'", userID, userProfile.PreferredGender)

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
		LEFT JOIN matches m ON (
			(m.profile1_id = p1.user_id AND m.status = 'accepted')
			OR
			(m.profile2_id = p1.user_id AND m.status = 'accepted')
			OR
			(m.profile3_id = p1.user_id AND m.status = 'accepted')
			OR
			(m.profile4_id = p1.user_id AND m.status = 'accepted')
		)
		WHERE p1.user_id != ?
		AND ST_Distance_Sphere(p1.location_point, ST_GeomFromText(?)) <= ? * 1000
		AND (p1.gender = ? OR ? = '')
		GROUP BY p1.user_id
		ORDER BY popularity_score DESC, RAND()
		LIMIT ?
	`

	type SoloResult struct {
		ProfileID       uint `json:"profile_id"`
		PopularityScore int  `json:"popularity_score"`
	}

	var results []SoloResult
	if err := db.Raw(query, userID, userLocationWKT, userProfile.PreferredDistanceMax, userProfile.PreferredGender, userProfile.PreferredGender, limit).Scan(&results).Error; err != nil {
		return fmt.Errorf("failed to query solo standouts: %v", err)
	}

	// If no results from popularity-based query, fall back to random nearby profiles
	if len(results) == 0 {
		fallbackQuery := `
			SELECT
				p1.user_id as profile_id,
				0 as popularity_score
			FROM profiles p1
			WHERE p1.user_id != ?
			AND ST_Distance_Sphere(p1.location_point, ST_GeomFromText(?)) <= ? * 1000
			AND (p1.gender = ? OR ? = '')
			ORDER BY RAND()
			LIMIT ?
		`
		if err := db.Raw(fallbackQuery, userID, userLocationWKT, userProfile.PreferredDistanceMax, userProfile.PreferredGender, userProfile.PreferredGender, limit).Scan(&results).Error; err != nil {
			return fmt.Errorf("failed to query fallback solo standouts: %v", err)
		}
	}

	// Convert to Redis format
	soloData := SoloStandoutsRedis{
		ProfileIDs: make([]uint, 0, len(results)),
		Liked:      make(map[string]bool),
	}

	for _, result := range results {
		soloData.ProfileIDs = append(soloData.ProfileIDs, result.ProfileID)
	}

	// Cache in Redis
	ctx := context.Background()
	key := fmt.Sprintf("user:%d:standouts:solo", userID)
	data, err := json.Marshal(soloData)
	if err != nil {
		return fmt.Errorf("failed to marshal solo standouts: %v", err)
	}

	if err := rdb.Set(ctx, key, data, STANDOUTS_TTL).Err(); err != nil {
		return fmt.Errorf("failed to cache solo standouts in Redis: %v", err)
	}

	log.Printf("Generated and cached %d solo standouts for user %d", len(results), userID)
	return nil
}

// convertDuoRedisToResponse converts Redis duo data to API response format
func convertDuoRedisToResponse(duoData DuoStandoutsRedis, db *gorm.DB) ([]schemas.DuoStandouts, error) {
	var standouts []schemas.DuoStandouts

	for i, pair := range duoData.ProfilePairs {
		if len(pair) != 2 {
			continue
		}

		profile1ID := pair[0]
		profile2ID := pair[1]

		// Check if this pair is liked
		likedKey1 := fmt.Sprintf("%d,%d", profile1ID, profile2ID)
		likedKey2 := fmt.Sprintf("%d,%d", profile2ID, profile1ID)
		if duoData.Liked[likedKey1] || duoData.Liked[likedKey2] {
			continue // Skip liked pairs
		}

		// Create standout entry
		standout := schemas.DuoStandouts{
			ID:         uint(i + 1), // Fake ID for response
			Profile1ID: profile1ID,
			Profile2ID: profile2ID,
			MatchCount: 0, // We can calculate this if needed, but not essential for display
			IsActive:   true,
		}

		// Load profile data
		if err := db.Where("user_id = ?", profile1ID).First(&standout.Profile1).Error; err != nil {
			log.Printf("Error loading profile1 %d: %v", profile1ID, err)
			continue
		}
		if err := db.Where("user_id = ?", profile2ID).First(&standout.Profile2).Error; err != nil {
			log.Printf("Error loading profile2 %d: %v", profile2ID, err)
			continue
		}

		standouts = append(standouts, standout)
	}

	log.Printf("Converted %d duo standouts from Redis to response format", len(standouts))
	return standouts, nil
}

// convertSoloRedisToResponse converts Redis solo data to API response format
func convertSoloRedisToResponse(soloData SoloStandoutsRedis, db *gorm.DB) ([]schemas.SoloStandouts, error) {
	var standouts []schemas.SoloStandouts

	for i, profileID := range soloData.ProfileIDs {
		// Check if this profile is liked
		likedKey := fmt.Sprintf("%d", profileID)
		if soloData.Liked[likedKey] {
			continue // Skip liked profiles
		}

		// Create standout entry
		standout := schemas.SoloStandouts{
			ID:              uint(i + 1), // Fake ID for response
			ProfileID:       profileID,
			PopularityScore: 0, // We can calculate this if needed, but not essential for display
			IsActive:        true,
		}

		// Load profile data
		if err := db.Where("user_id = ?", profileID).First(&standout.Profile).Error; err != nil {
			log.Printf("Error loading profile %d: %v", profileID, err)
			continue
		}

		standouts = append(standouts, standout)
	}

	return standouts, nil
}
