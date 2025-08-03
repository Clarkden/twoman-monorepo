package schemas

import "time"

type FileMetadata struct {
	ID        uint `gorm:"primaryKey"`
	CreatedAt time.Time
	UpdatedAt time.Time
	Filename  string
	Size      int64
	UserID    uint
	User      User `gorm:"foreignKey:UserID;"`
}
