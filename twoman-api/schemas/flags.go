package schemas

import "gorm.io/gorm"

type FeatureFlags struct {
	gorm.Model
	FlagName  string `gorm:"unique_index"`
	IsEnabled bool
}
