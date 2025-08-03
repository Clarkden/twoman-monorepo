package file

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"log"
	"math"
	"mime/multipart"
	"os"
	"twoman/schemas"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/google/uuid"
	"golang.org/x/image/draw"
	"gorm.io/gorm"
)

const (
	MaxFileSize = 1 * 1024 * 1024 // 1MB
	MaxWidth    = 1920
	MaxHeight   = 1080
	JPEGQuality = 85
)

func ProcessImage(file multipart.File) ([]byte, error) {
	// Decode the image
	img, _, err := image.Decode(file)
	if err != nil {
		return nil, err
	}

	// Get original dimensions
	bounds := img.Bounds()
	origWidth := bounds.Dx()
	origHeight := bounds.Dy()

	// Calculate scaling factor
	widthScale := float64(MaxWidth) / float64(origWidth)
	heightScale := float64(MaxHeight) / float64(origHeight)
	scale := math.Min(widthScale, heightScale)
	scale = math.Min(scale, 1.0)

	if scale < 1.0 {
		// Calculate new dimensions
		newWidth := int(float64(origWidth) * scale)
		newHeight := int(float64(origHeight) * scale)

		// Create a new image with the calculated dimensions
		newImg := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))

		// Resize the image
		draw.NearestNeighbor.Scale(newImg, newImg.Bounds(), img, bounds, draw.Over, nil)

		img = newImg
	}

	// Encode to JPEG
	var buffer bytes.Buffer
	err = jpeg.Encode(&buffer, img, &jpeg.Options{Quality: JPEGQuality})
	if err != nil {
		return nil, err
	}

	return buffer.Bytes(), nil
}

func SaveProgressiveJPEG(img image.Image) ([]byte, error) {
	var buffer bytes.Buffer
	err := jpeg.Encode(&buffer, img, &jpeg.Options{
		Quality: 85,
	})
	if err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

func GenerateUniqueFilename(originalFilename string) string {
	id := uuid.New()

	uniqueFilename := fmt.Sprintf("%s%s", id.String(), ".jpg")

	return uniqueFilename
}

func StoreFileMetadata(filename string, size int64, userID uint, db *gorm.DB) (*schemas.FileMetadata, error) {
	metadata := schemas.FileMetadata{
		Filename: filename,
		Size:     size,
		UserID:   userID,
	}

	if err := db.Create(&metadata).Error; err != nil {
		return nil, err
	}

	return &metadata, nil
}

func DeleteFileByName(filename string, db *gorm.DB, s3Client *s3.S3) error {
	log.Println("Deleting file by name: ", filename)
	var metadata schemas.FileMetadata
	if err := db.Where("filename = ?", filename).First(&metadata).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// If the metadata is not found, the file might have been already deleted
			// We can proceed with deleting from S3 just in case
			log.Printf("File metadata for %s not found in database, proceeding with S3 deletion", filename)
		} else {
			return err
		}
	}

	// Delete from S3
	_, err := s3Client.DeleteObject(&s3.DeleteObjectInput{
		Key:    aws.String(filename),
		Bucket: aws.String(os.Getenv("AWS_BUCKET_NAME")),
	})

	if err != nil {
		return fmt.Errorf("failed to delete file from S3: %w", err)
	}

	// If we found metadata earlier, delete it from the database
	if metadata.ID != 0 {
		if err := db.Delete(&metadata).Error; err != nil {
			return fmt.Errorf("failed to delete file metadata from database: %w", err)
		}
	}

	return nil
}

func DeleteAllUserFiles(userID uint, db *gorm.DB, s3Client *s3.S3) error {
	var metadata []*schemas.FileMetadata

	if err := db.Where("user_id = ?", userID).Find(&metadata).Error; err != nil {

		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}

		return err
	}

	for _, m := range metadata {
		if err := DeleteFileByName(m.Filename, db, s3Client); err != nil {
			return err
		}
	}

	return nil
}
