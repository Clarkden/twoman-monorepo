package flags

import (
	"gorm.io/gorm"
	"twoman/schemas"
)

func GetFeatureFlag(flagName string, db *gorm.DB) (*schemas.FeatureFlags, error) {
	var flag *schemas.FeatureFlags
	if err := db.Where("flag_name = ?", flagName).First(&flag).Error; err != nil {
		return nil, err
	}

	return flag, nil
}
