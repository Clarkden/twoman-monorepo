package handlers

import (
	"fmt"
	"net/http"
	"twoman/globals"
	wsvalidator "twoman/handlers/helpers/websocket"

	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/redis/go-redis/v9"
	"github.com/twilio/twilio-go"
	"googlemaps.github.io/maps"
	"gorm.io/gorm"
)

type Handler struct {
	liveDB               *gorm.DB
	demoDB               *gorm.DB
	s3                   *s3.S3
	rdb                  *redis.Client
	rateLimitingDatabase *redis.Client
	maps                 *maps.Client
	tw                   *twilio.RestClient
	wsValidator          *wsvalidator.Validator
}

func NewHandler(liveDB, demoDB *gorm.DB, s3 *s3.S3, rdb *redis.Client, rlmdb *redis.Client, maps *maps.Client, twClient *twilio.RestClient) *Handler {
	validator, err := wsvalidator.NewValidator()
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize WebSocket validator: %v", err))
	}

	return &Handler{
		liveDB:               liveDB,
		demoDB:               demoDB,
		s3:                   s3,
		rdb:                  rdb,
		rateLimitingDatabase: rlmdb,
		maps:                 maps,
		tw:                   twClient,
		wsValidator:          validator,
	}
}

func (h Handler) DB(r *http.Request) *gorm.DB {
	ctxDB, ok := r.Context().Value(globals.DatabaseConnKey).(*gorm.DB)
	if ok && ctxDB != nil {
		return ctxDB
	}
	return h.liveDB
}
