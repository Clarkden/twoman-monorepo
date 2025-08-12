package migrations

import (
	"log"
	"twoman/schemas"
	"gorm.io/gorm"
)

// MigrationDef defines a migration
type MigrationDef struct {
	Name string
	Func func(*gorm.DB) error
}

// RunMigrations runs all pending migrations
func RunMigrations(db *gorm.DB) error {
	log.Println("Running database migrations...")

	// Initialize migration tracking table
	if err := initMigrationTable(db); err != nil {
		return err
	}

	// Define migrations in order
	migrations := []MigrationDef{
		{
			Name: "001_redesign_notifications",
			Func: MigrateNotificationSystem,
		},
		// Add future migrations here
	}

	for _, migration := range migrations {
		// Check if migration already ran
		if hasMigrationRun(db, migration.Name) {
			log.Printf("Migration %s already executed, skipping...", migration.Name)
			continue
		}

		log.Printf("Running migration %s...", migration.Name)
		if err := migration.Func(db); err != nil {
			log.Printf("Migration %s failed: %v", migration.Name, err)
			return err
		}

		// Mark migration as completed
		if err := markMigrationComplete(db, migration.Name); err != nil {
			log.Printf("Error marking migration %s as complete: %v", migration.Name, err)
			return err
		}

		log.Printf("Migration %s completed successfully", migration.Name)
	}

	log.Println("All migrations completed successfully")
	return nil
}

// initMigrationTable creates the migrations table if it doesn't exist
func initMigrationTable(db *gorm.DB) error {
	return db.AutoMigrate(&schemas.Migration{})
}

// hasMigrationRun checks if a migration has already been executed
func hasMigrationRun(db *gorm.DB, name string) bool {
	var migration schemas.Migration
	err := db.Where("name = ?", name).First(&migration).Error
	return err == nil
}

// markMigrationComplete records that a migration has been executed
func markMigrationComplete(db *gorm.DB, name string) error {
	migration := schemas.Migration{
		Name: name,
	}
	return db.Create(&migration).Error
}