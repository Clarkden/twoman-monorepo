package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
	"twoman/schemas"
	"twoman/types"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func CreateAdmin(username, hashedPassword string, db *gorm.DB) (*schemas.Admin, error) {
	admin := schemas.Admin{
		Username: username,
		Password: hashedPassword,
	}

	if err := db.Create(&admin).Error; err != nil {
		return nil, err
	}

	return &admin, nil
}

func AdminLogin(username, password string, db *gorm.DB) (*schemas.Admin, error) {
	var adminRecord *schemas.Admin

	if err := db.Where(&schemas.Admin{Username: username}).First(&adminRecord).Error; err != nil {
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(adminRecord.Password), []byte(password)); err != nil {
		return nil, err
	}

	return adminRecord, nil
}

func GetAdminByID(id uint, db *gorm.DB) (*schemas.Admin, error) {
	var admin schemas.Admin

	if err := db.Where(&schemas.Admin{ID: id}).First(&admin).Error; err != nil {
		return nil, err
	}

	return &admin, nil
}

func GetAdminByUsername(username string, db *gorm.DB) (*schemas.Admin, error) {
	var admin schemas.Admin
	if err := db.Where(&schemas.Admin{Username: username}).First(&admin).Error; err != nil {
		return nil, err
	}

	return &admin, nil
}

func IsRegistrationEnabled(db *gorm.DB) (bool, error) {
	var adminFlags schemas.AdminFlags

	if err := db.Where(&schemas.AdminFlags{Name: "registration"}).First(&adminFlags).Error; err != nil {
		return false, err
	}

	return adminFlags.Enabled, nil
}

func AdminCount(db *gorm.DB) (int64, error) {
	var count int64

	if err := db.Model(&schemas.Admin{}).Count(&count).Error; err != nil {
		return 0, err
	}

	return count, nil
}

func CreateAdminSession(admin *schemas.Admin, rdb *redis.Client, ctx context.Context) (string, error) {
	session := uuid.New().String()

	type sessionData struct {
		AdminID uint
	}

	data := sessionData{
		AdminID: admin.ID,
	}

	jsonData, err := json.Marshal(data)

	if err != nil {
		return "", err
	}

	if err := rdb.Set(context.Background(), fmt.Sprintf("admin:%s", session), jsonData, 60*24*7*time.Hour).Err(); err != nil {
		return "", err
	}

	return session, nil
}

func DeleteAdminSession(session string, rdb *redis.Client) error {
	err := rdb.Del(context.Background(), fmt.Sprintf("admin:%s", session)).Err()
	if err != nil {
		return err
	}
	return nil
}

func GetAllReports(db *gorm.DB) ([]types.ReportWithProfiles, error) {
	var reports []types.ReportWithProfiles

	err := db.Model(&schemas.Report{}).Select("reports.*, " +
		"(SELECT name FROM profiles WHERE user_id = reports.reporter_id) as reporter_name, " +
		"(SELECT username FROM profiles WHERE user_id = reports.reporter_id) as reporter_username, " +
		"(SELECT name FROM profiles WHERE user_id = reports.reported_id) as reported_name, " +
		"(SELECT username FROM profiles WHERE user_id = reports.reported_id) as reported_username").
		Find(&reports).Error

	if err != nil {
		return nil, err
	}

	return reports, nil
}

func DeleteReport(reportID uint, db *gorm.DB) error {
	return db.Delete(&schemas.Report{}, reportID).Error
}

func GetAllFriendships(db *gorm.DB) ([]schemas.Friendship, error) {
	var friendships []schemas.Friendship
	if err := db.Find(&friendships).Error; err != nil {
		return nil, err
	}
	return friendships, nil
}

func UpdateFriendship(friendshipID uint, accepted bool, db *gorm.DB) error {
	return db.Model(&schemas.Friendship{}).Where("id = ?", friendshipID).Update("accepted", accepted).Error
}

func DeleteFriendship(friendshipID uint, db *gorm.DB) error {
	return db.Delete(&schemas.Friendship{}, friendshipID).Error
}

func GetAllMatches(db *gorm.DB) ([]schemas.Matches, error) {
	var matches []schemas.Matches
	if err := db.Find(&matches).Error; err != nil {
		return nil, err
	}
	return matches, nil
}

func DeleteMatch(matchID uint, db *gorm.DB) error {
	return db.Delete(&schemas.Matches{}, matchID).Error
}

func UpdateMatchStatus(matchID uint, status string, db *gorm.DB) error {
	return db.Model(&schemas.Matches{}).Where("id = ?", matchID).Update("status", status).Error
}

func GetAllUsers(db *gorm.DB) ([]schemas.User, error) {
	var users []schemas.User
	if err := db.Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func DeleteUser(userID uint, db *gorm.DB) error {
	return db.Delete(&schemas.User{}, userID).Error
}

func GetAllProfiles(db *gorm.DB) ([]schemas.Profile, error) {
	var profiles []schemas.Profile
	if err := db.Find(&profiles).Error; err != nil {
		return nil, err
	}
	return profiles, nil
}

func UpdateProfile(profileID uint, updates map[string]interface{}, db *gorm.DB) error {
	return db.Model(&schemas.Profile{}).Where("user_id = ?", profileID).Updates(updates).Error
}

func ValidateAdminSession(session string, rdb *redis.Client) (uint, error) {
	key := fmt.Sprintf("admin:%s", session)
	data, err := rdb.Get(context.Background(), key).Result()
	if err != nil {
		return 0, err
	}

	var sessionData struct {
		AdminID uint
	}

	err = json.Unmarshal([]byte(data), &sessionData)
	if err != nil {
		return 0, err
	}

	return sessionData.AdminID, nil
}
