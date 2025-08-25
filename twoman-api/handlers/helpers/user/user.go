package user

import (
	"errors"
	"twoman/handlers/helpers/notifications"
	"twoman/handlers/helpers/profile"
	"twoman/schemas"

	"github.com/aws/aws-sdk-go/service/s3"

	"gorm.io/gorm"
)

// GetUserByID returns a user by their ID
func GetUserByID(id uint, db *gorm.DB) (*schemas.User, error) {
	var user *schemas.User
	if err := db.First(&user, id).Error; err != nil {
		return nil, err
	}

	return user, nil
}

// GetUserByPhoneNumber returns a user by their phone number
func GetUserByPhoneNumber(phoneNumber string, db *gorm.DB) (*schemas.User, error) {
	var user *schemas.User
	if err := db.Where("phone_number = ?", phoneNumber).First(&user).Error; err != nil {

		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}

		return nil, err
	}

	return user, nil
}

func CreateUserWithEmail(email string, db *gorm.DB) (*schemas.User, error) {
	user := schemas.User{
		Email: email,
	}

	if err := db.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

func CreateUserWithPhoneNumber(phone string, isDemo bool, db *gorm.DB) (*schemas.User, error) {
	user := schemas.User{
		PhoneNumber: phone,
	}

	if err := db.Create(&user).Error; err != nil {
		return nil, err
	}

	if isDemo {
		user.Type = "demo"

		if err := db.Save(&user).Error; err != nil {
			return nil, err
		}

		adminDemoNumber := schemas.AdminDemoNumbers{
			PhoneNumber: phone,
		}

		if err := db.Create(&adminDemoNumber).Error; err != nil {
			return nil, err
		}
	}

	return &user, nil
}

func FindUserByEmail(email string, db *gorm.DB) (*schemas.User, error) {
	var user schemas.User
	err := db.Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}

		return nil, err
	}

	return &user, nil
}

func DeleteUser(userId uint, db *gorm.DB, s3Client *s3.S3) error {
	if err := profile.DeleteProfile(userId, db, s3Client); err != nil {
		return err
	}

	if err := notifications.DeletePushTokens(userId, db); err != nil {
		return err
	}

	if err := db.Where("id = ?", userId).Delete(&schemas.User{}).Error; err != nil {
		return err
	}

	return nil
}

func IsUserPro(userId uint, db *gorm.DB) (bool, error) {
	var paidUser schemas.PaidUser
	err := db.Where("user_id = ?", userId).First(&paidUser).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}

		return false, err
	}

	return true, nil
}

func UpgradeUserToPro(userId uint, db *gorm.DB) error {
	var existingPaidUser schemas.PaidUser

	if err := db.Where("user_id = ?", userId).First(&existingPaidUser).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			paidUser := schemas.PaidUser{
				UserID: userId,
			}

			if err := db.Create(&paidUser).Error; err != nil {
				return err
			}

			return nil
		}

		return err
	}

	return nil
}

func DowngradeUserFromPro(userId uint, db *gorm.DB) error {
	if err := db.Where("user_id = ?", userId).Delete(&schemas.PaidUser{}).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
	}

	return nil
}

func CreateUserWithAppleID(appleID string, email string, db *gorm.DB) (*schemas.User, error) {
	user := schemas.User{
		AppleID:  appleID,
		Email:    email,
		Verified: true,
	}

	if err := db.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

func FindUserByAppleID(appleID string, db *gorm.DB) (*schemas.User, error) {
	var user schemas.User
	err := db.Where("apple_id = ?", appleID).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}

		return nil, err
	}

	return &user, nil
}

func CreateUserWithGoogleID(googleID string, email string, db *gorm.DB) (*schemas.User, error) {
	user := schemas.User{
		OauthProvider:   "google",
		OauthProviderID: googleID,
		Email:           email,
		Verified:        true,
	}

	if err := db.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

func FindUserByGoogleID(googleID string, db *gorm.DB) (*schemas.User, error) {
	var user schemas.User
	err := db.Where("oauth_provider = ? AND oauth_provider_id = ?", "google", googleID).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}

		return nil, err
	}

	return &user, nil
}
