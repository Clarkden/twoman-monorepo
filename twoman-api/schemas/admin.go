package schemas

type Admin struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	Username string `gorm:"uniqueIndex" json:"username"`
	Password string `json:"password"`
}

type AdminFlags struct {
	ID      uint   `gorm:"primaryKey" json:"id"`
	Name    string `json:"name"`
	Enabled bool   `json:"enabled"`
}

type AdminDemoNumbers struct {
	ID          uint   `gorm:"primaryKey"`
	PhoneNumber string `grom:"uniqueIndex" json:"phone_number"`
}
