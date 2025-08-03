package handlers

import (
	"bytes"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"twoman/globals"
	"twoman/handlers/response"
	"twoman/types"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/s3"
	"gorm.io/gorm"

	fileHelper "twoman/handlers/helpers/file"
)

func (h Handler) HandleFileUpload() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			allowedMimeTypes := map[string]bool{
				"image/jpeg": true,
				"image/png":  true,
				"image/gif":  true,
			}

			session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)
			err := r.ParseMultipartForm(10 << 20) // Max size of 10MB
			if err != nil {
				log.Println("Error parsing form", err)
				response.BadRequest(w, "Error parsing form")
				return
			}

			file, header, err := r.FormFile("file")
			if err != nil {
				log.Println("Error getting file")
				log.Println(r.Form)
				response.BadRequest(w, "Error getting file")
				return
			}
			defer func(file multipart.File) {
				err := file.Close()
				if err != nil {
					log.Println("Error closing file:", err)
				}
			}(file)

			mimeType := header.Header.Get("Content-Type")
			if !allowedMimeTypes[mimeType] {
				log.Println("Invalid file type")
				response.BadRequest(w, "Invalid file type")
				return
			}

			// maxFileSize := int64(5 * 1024 * 1024) // 5MB
			// if header.Size > maxFileSize {
			// 	log.Println("File too large")
			// 	response.BadRequest(w, "File too large")
			// 	return
			// }

			filename := fileHelper.GenerateUniqueFilename(header.Filename)

			processedImage, err := fileHelper.ProcessImage(file)
			if err != nil {
				log.Println("Error processing image:", err)
				response.InternalServerError(w, err, "Error processing image")
				return
			}

			_, err = h.s3.PutObject(&s3.PutObjectInput{
				Key:    aws.String(filename),
				Body:   bytes.NewReader(processedImage),
				Bucket: aws.String(os.Getenv("AWS_BUCKET_NAME")),
			})

			if err != nil {
				log.Println("Error uploading file:", err)
				response.InternalServerError(w, err, "Error uploading file")
				return
			}

			var db *gorm.DB

			if h.DB(r) == h.liveDB {
				log.Print("liveDB")
				db = h.liveDB
			} else {
				log.Print("demoDB")
				db = h.demoDB
			}

			fileMetadata, err := fileHelper.StoreFileMetadata(filename, int64(len(processedImage)), session.UserID, db)
			if err != nil {
				log.Println("Error storing file metadata:", err)
				response.InternalServerError(w, err, "Error storing file metadata")
				return
			}

			type FileResponse struct {
				URL  string `json:"url"`
				ID   uint   `json:"id"`
				File string `json:"file"`
			}

			response.OKWithData(w, "file uploaded successfully", FileResponse{
				URL:  os.Getenv("AWS_PUBLIC_URL") + "/" + filename,
				ID:   fileMetadata.ID,
				File: fileMetadata.Filename,
			})
		}
	})
}
