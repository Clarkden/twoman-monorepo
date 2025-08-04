package schemas

import (
	"time"
)

// Stars tracks user star balances and transactions
type Stars struct {
	ID          uint      `gorm:"primarykey"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	UserID      uint      `json:"user_id" gorm:"constraint:OnDelete:CASCADE"`
	Balance     int       `json:"balance" gorm:"default:0"`
	User        User      `gorm:"foreignKey:UserID" json:"user"`
}

// StarTransactions tracks star purchases and usage
type StarTransactions struct {
	ID            uint      `gorm:"primarykey"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
	UserID        uint      `json:"user_id" gorm:"constraint:OnDelete:CASCADE"`
	Amount        int       `json:"amount"` // positive for purchase, negative for usage
	TransactionType string  `json:"transaction_type"` // "purchase", "duo_like", "solo_like", "bonus"
	Description   string    `json:"description"`
	User          User      `gorm:"foreignKey:UserID" json:"user"`
}