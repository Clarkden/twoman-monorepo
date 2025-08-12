package migrations

import (
	"log"
	"twoman/schemas"
	"gorm.io/gorm"
)

// MigrateNotificationSystem creates new tables alongside old ones without touching existing data
func MigrateNotificationSystem(db *gorm.DB) error {
	log.Println("Starting notification system migration...")

	// Step 1: Create new tables using AutoMigrate (TableName() handles naming)
	log.Println("Creating new notification tables...")
	err := db.AutoMigrate(
		&schemas.NotificationPreferences{}, // Creates notification_preferences table
		&schemas.PushToken{},               // Creates user_push_tokens table (via TableName())
	)
	if err != nil {
		log.Printf("Error creating new tables: %v", err)
		return err
	}
	log.Println("New notification tables created successfully")

	// Step 2: Optionally migrate data from old push_tokens table if new tables are empty
	// Only migrate if we just created the tables (they would be empty)
	var prefsCount, tokensCount int64
	db.Table("notification_preferences").Count(&prefsCount)
	db.Table("user_push_tokens").Count(&tokensCount)

	if prefsCount == 0 && tokensCount == 0 {
		log.Println("New tables are empty, migrating data from legacy push_tokens table...")
		
		var oldTokens []schemas.PushTokens
		if err := db.Table("push_tokens").Find(&oldTokens).Error; err != nil {
			log.Printf("Error fetching old push tokens: %v", err)
			// Don't fail migration if old table doesn't exist or has issues
		} else {
			// Create notification preferences (one per user)
			userPreferencesMap := make(map[uint]schemas.NotificationPreferences)
			for _, oldToken := range oldTokens {
				userPreferencesMap[oldToken.UserID] = schemas.NotificationPreferences{
					UserID:                               oldToken.UserID,
					NotificationsEnabled:                 oldToken.NotificationsEnabled,
					NewMatchesNotificationsEnabled:       oldToken.NewMatchesNotificationsEnabled,
					NewMessagesNotificationsEnabled:      oldToken.NewMessagesNotificationsEnabled,
					NewFriendRequestNotificationsEnabled: oldToken.NewFriendRequestNotificationsEnabled,
				}
			}

			// Insert notification preferences
			for _, pref := range userPreferencesMap {
				if err := db.Table("notification_preferences").Create(&pref).Error; err != nil {
					log.Printf("Error creating notification preferences for user %d: %v", pref.UserID, err)
				}
			}

			// Create push tokens (only valid ones)
			for _, oldToken := range oldTokens {
				if oldToken.Token != "" && len(oldToken.Token) > 0 {
					newToken := schemas.PushToken{
						UserID:   oldToken.UserID,
						Token:    oldToken.Token,
						Platform: getPlatformFromTokenMigration(oldToken.Token),
						IsActive: true,
					}

					if err := db.Table("user_push_tokens").Create(&newToken).Error; err != nil {
						log.Printf("Error creating push token for user %d: %v", oldToken.UserID, err)
					}
				}
			}

			log.Printf("Migrated %d user preferences and tokens from legacy table", len(userPreferencesMap))
		}
	} else {
		log.Println("New tables already contain data, skipping data migration")
	}

	log.Println("Notification system migration completed successfully")
	return nil
}

// Helper function to determine platform from token format (migration-specific)
func getPlatformFromTokenMigration(token string) string {
	if len(token) > 17 && token[:17] == "ExponentPushToken" {
		return "expo"
	}
	return "unknown"
}

// RollbackNotificationMigration removes the new tables (for development/testing)
func RollbackNotificationMigration(db *gorm.DB) error {
	log.Println("Rolling back notification system migration...")
	
	// Drop new tables
	if err := db.Migrator().DropTable(&schemas.PushToken{}); err != nil {
		log.Printf("Error dropping push_tokens table: %v", err)
	}
	
	if err := db.Migrator().DropTable(&schemas.NotificationPreferences{}); err != nil {
		log.Printf("Error dropping notification_preferences table: %v", err)
	}

	log.Println("Notification system migration rolled back")
	return nil
}