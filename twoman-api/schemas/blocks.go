package schemas

type Block struct {
	ProfileID        uint    `gorm:"primaryKey;constraint:OnDelete:CASCADE"`
	BlockedProfileID uint    `gorm:"primaryKey;constraint:OnDelete:CASCADE"`
	Profile          Profile `gorm:"foreignKey:ProfileID"`
	BlockedProfile   Profile `gorm:"foreignKey:BlockedProfileID"`
}
