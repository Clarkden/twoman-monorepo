package schemas

import "time"

// Migration tracks which migrations have been executed
type Migration struct {
	ID          uint      `gorm:"primaryKey;autoIncrement"`
	Name        string    `gorm:"uniqueIndex;not null;size:255"`
	ExecutedAt  time.Time `gorm:"autoCreateTime"`
}

// TableName ensures the table is named 'migrations'
func (Migration) TableName() string {
	return "migrations"
}