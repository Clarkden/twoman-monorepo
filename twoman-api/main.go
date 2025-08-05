package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
	"twoman/handlers/helpers/database"
	"twoman/router"
	"twoman/schemas"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/getsentry/sentry-go"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"github.com/rs/cors"
	"github.com/twilio/twilio-go"
	"googlemaps.github.io/maps"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// @title Twoman API
// @version 0.1
// @description Twoman API server

func main() {

	seedFlag := flag.Bool("seed", false, "Seed the database")
	numUsers := flag.Int("numUsers", 100, "Number of users to seed")
	flag.Parse()

	err := godotenv.Load()

	if err != nil {
		log.Println("Error loading .env file")
	}

	awsBucketName := os.Getenv("AWS_BUCKET_NAME")
	awsAccessKeyID := os.Getenv("AWS_ACCESS_KEY_ID")
	awsAccessSecretAccessKey := os.Getenv("AWS_SECRET_ACCESS_KEY")
	awsRegion := os.Getenv("AWS_DEFAULT_REGION")
	awsEndpoint := os.Getenv("AWS_ENDPOINT_URL")

	if awsBucketName == "" {
		log.Fatal("AWS_BUCKET_NAME not set")
	}

	if awsAccessKeyID == "" {
		log.Fatal("AWS_ACCESS_KEY_ID not set")
	}

	if awsAccessSecretAccessKey == "" {
		log.Fatal("AWS_SECRET_ACCESS_KEY not set")
	}

	if awsRegion == "" {
		log.Fatal("AWS_DEFAULT_REGION not set")
	}

	if awsEndpoint == "" {
		log.Fatal("AWS_ENDPOINT_URL not set")
	}

	log.Println("Creating S3 client")

	sess, err := session.NewSession(&aws.Config{
		Region:   aws.String(awsRegion),
		Endpoint: aws.String(awsEndpoint),
	})

	if err != nil {
		log.Fatalf("Failed to create session for S3: %v", err)
	}

	s3Svc := s3.New(sess)

	log.Println("Successfully created S3 client")

	log.Println("Connecting to main redis DB")

	var rdb *redis.Client
	var rlmdb *redis.Client

	redisUrl := os.Getenv("REDIS_URL")

	if redisUrl == "" {

		redisAddress := os.Getenv("REDIS_ADDRESS")
		redisPassword := os.Getenv("REDIS_PASSWORD")

		if redisAddress == "" {
			log.Fatal("REDIS_ADDRESS not set")
		}

		rdb = redis.NewClient(&redis.Options{
			Addr:     redisAddress,
			Password: redisPassword,
			DB:       0,
		})

		rlmdb = redis.NewClient(&redis.Options{
			Addr:     redisUrl,
			Password: redisPassword,
			DB:       1,
		})
	} else {
		var options *redis.Options
		options, err = redis.ParseURL(redisUrl)

		if err != nil {
			log.Fatalf("Failed to parse redis URL: %v", err)
		}

		rdb = redis.NewClient(options)

		options.DB = 1
		rlmdb = redis.NewClient(options)
	}

	if rdb == nil {
		log.Fatal("Could not connect to redis")
	}

	log.Println("Successfully connected to redis DB")
	log.Println("Connecting to maria DB")

	var liveDsn string
	var demoDsn string

	liveDsn = os.Getenv("MARIADB_DSN")
	demoDsn = os.Getenv("DEMO_MARIADB_DSN")

	if liveDsn == "" {

		log.Println("MARIADB_DSN not set")

		mariadbUser := os.Getenv("MARIADB_USER")
		mariadbPassword := os.Getenv("MARIADB_PASSWORD")
		mariadbDatabase := os.Getenv("MARIADB_DATABASE")
		mariadbUrl := os.Getenv("MARIADB_URL")

		if mariadbUser == "" || mariadbPassword == "" || mariadbUrl == "" {
			log.Fatal("MARIADB_USER or MARIADB_PASSWORD or MARIADB_URL not set")
		}

		liveDsn = fmt.Sprintf("%s:%s@tcp(%s)/%s?charset=utf8mb4&parseTime=True&loc=Local", mariadbUser, mariadbPassword, mariadbUrl, mariadbDatabase)
	}

	if demoDsn == "" {

		log.Println("DEMO_MARIADB_DSN not set")

		mariadbUser := os.Getenv("DEMO_MARIADB_USER")
		mariadbPassword := os.Getenv("DEMO_MARIADB_PASSWORD")
		mariadbDatabase := os.Getenv("DEMO_MARIADB_DATABASE")
		mariadbUrl := os.Getenv("DEMO_MARIADB_URL")

		if mariadbUser == "" || mariadbPassword == "" || mariadbUrl == "" {
			log.Fatal("DEMO_MARIADB_USER or DEMO_MARIADB_PASSWORD or DEMO_MARIADB_URL not set")
		}

		demoDsn = fmt.Sprintf("%s:%s@tcp(%s)/%s?charset=utf8mb4&parseTime=True&loc=Local", mariadbUser, mariadbPassword, mariadbUrl, mariadbDatabase)
	}

	liveDB, err := gorm.Open(mysql.Open(liveDsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to live database: %v", err)
	}

	demoDB, err := gorm.Open(mysql.Open(demoDsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to demo database: %v", err)
	}

	log.Println("Successfully connected to maria DB")
	log.Println("Migrating maria DB")

	err = MigrateDB(liveDB)
	if err != nil {
		log.Fatalf("Failed to migrate live database: %v", err)
	}

	err = MigrateDB(demoDB)
	if err != nil {
		log.Fatalf("Failed to migrate demo database: %v", err)
	}

	log.Println("Successfully migrated maria DB")

	log.Println("Creating maps client")

	mapsClient, err := maps.NewClient(maps.WithAPIKey(os.Getenv("GOOGLE_API_KEY")))
	if err != nil {
		log.Fatalf("fatal error: %s", err)
	}

	development := os.Getenv("ENVIRONMENT") == "development"

	if *seedFlag {
		if !development {
			log.Fatal("Seeding is only allowed in development environment")
		}
		lat := 34.0549
		lng := -118.2426

		log.Println("Seeding the database...")
		database.CreateUsersAndProfiles(liveDB, *numUsers, lat, lng, mapsClient)
		database.CreateUsersAndProfiles(demoDB, *numUsers, lat, lng, mapsClient)

		log.Println("Database seeding completed successfully!")
		os.Exit(0)
	}

	log.Println("Creating twilio client")

	twilioAccountSID := os.Getenv("TWILIO_ACCOUNT_SID")
	twilioAuthToken := os.Getenv("TWILIO_AUTH_TOKEN")

	if twilioAccountSID == "" {
		log.Fatal("TWILIO_ACCOUNT_SID not set")
	}

	if twilioAuthToken == "" {
		log.Fatal("twilioAuthToken not set")
	}

	twClient := twilio.NewRestClientWithParams(twilio.ClientParams{
		Username: twilioAccountSID,
		Password: twilioAuthToken,
	})

	log.Println("Successfully created twilio client")

	log.Println("Starting http server")

	port := os.Getenv("PORT")

	if port == "" {
		port = "8080"
	}

	allowedOriginsEnv := os.Getenv("ALLOWED_ORIGINS")
	var allowedOrigins []string
	if allowedOriginsEnv != "" {
		allowedOrigins = strings.Split(allowedOriginsEnv, ",")
	} else {
		allowedOrigins = []string{"http://localhost:5173"}
	}

	c := cors.New(cors.Options{
		AllowedOrigins:   allowedOrigins, // Add your frontend origin
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	handler := c.Handler(router.Router(liveDB, demoDB, rdb, s3Svc, rlmdb, mapsClient, twClient, development))

	err = http.ListenAndServe(fmt.Sprintf(":%s", port), handler)

	if err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func MigrateDB(db *gorm.DB) error {

	err := db.Migrator().AutoMigrate(
		&schemas.User{},
		&schemas.Profile{},
		&schemas.Friendship{},
		&schemas.Matches{},
		&schemas.Block{},
		&schemas.Message{},
		&schemas.FileMetadata{},
		&schemas.ProfileView{},
		&schemas.FeatureFlags{},
		&schemas.Report{},
		&schemas.BugReport{},
		&schemas.PaidUser{},
		&schemas.PushTokens{},
		&schemas.Admin{},
		&schemas.AdminFlags{},
		&schemas.AdminDemoNumbers{},
		&schemas.Referral{},
		&schemas.ReferralCode{},
		&schemas.ReferralReward{},
		&schemas.ProSubscriptionV2{},
		&schemas.Stars{},
		&schemas.StarTransactions{},
	)

	if err != nil {
		return err
	}

	return nil
}

func initSentry() {
	environment := os.Getenv("ENVIRONMENT")

	// Only initialize Sentry if not in development
	if environment != "development" {
		sentryConnString := os.Getenv("SENTRY_DSN")
		if sentryConnString == "" {
			log.Fatal("SENTRY_DSN environment variable is not set")
		}

		err := sentry.Init(sentry.ClientOptions{
			Dsn:              sentryConnString,
			Environment:      environment,
			Debug:            environment != "production",
			TracesSampleRate: 1.0,
		})
		if err != nil {
			log.Fatalf("sentry.Init: %s", err)
		}

		defer sentry.Flush(2 * time.Second)
		sentry.CaptureMessage("Sentry initialized")
	}
}
