package schemas

type Friendship struct {
	ID        uint    `gorm:"primarykey"`
	ProfileID uint    `gorm:"constraint:OnDelete:CASCADE"`
	FriendID  uint    `gorm:"constraint:OnDelete:CASCADE"`
	Accepted  bool    `json:"accepted"`
	Profile   Profile `gorm:"foreignKey:ProfileID"`
	Friend    Profile `gorm:"foreignKey:FriendID"`
}
