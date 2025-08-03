package database

import (
	"fmt"
	"log"
	"math"
	"strings"
	"time"
	"twoman/handlers/helpers/profile"
	"twoman/schemas"

	"math/rand"

	"googlemaps.github.io/maps"
	"gorm.io/gorm"
)

var (
	girlNames = []string{"Sarah", "Emma", "Olivia", "Ava", "Isabella", "Sophia", "Mia", "Charlotte", "Amelia", "Evelyn"}
	boyNames  = []string{"John", "Noah", "Liam", "Mason", "Jacob", "William", "Ethan", "Michael", "Alexander", "James"}
)

func CreateUsersAndProfiles(db *gorm.DB, numUsers int, lat float64, lon float64, mapsClient *maps.Client) {
	users := make([]schemas.User, numUsers)
	profiles := make([]schemas.Profile, numUsers)

	// Create users and profiles
	for i := 0; i < numUsers; i++ {
		user := schemas.User{
			PhoneNumber:     fmt.Sprintf("+1%09d", rand.Intn(1000000000)),
			Email:           fmt.Sprintf("user%d@example.com", i),
			OauthProvider:   "local",
			OauthProviderID: fmt.Sprintf("local_%d", i),
		}

		if err := db.Create(&user).Error; err != nil {
			log.Printf("Failed to create user: %v", err)
			continue
		}

		gender := randomGender()
		images := genderImages(gender)
		latitude, longitude := generateRandomCoordinate(lat, lon)

		city, err := profile.GetCity(latitude, longitude, mapsClient)

		if err != nil {
			log.Printf("Failed to get city: %v", err)
			continue
		}

		name := ""

		if gender == "female" {
			name = girlNames[rand.Intn(len(girlNames))]
		} else {
			name = boyNames[rand.Intn(len(boyNames))]
		}

		newProfile := schemas.Profile{
			UserID:               user.ID,
			Name:                 name,
			Username:             fmt.Sprintf("user%d", i),
			Bio:                  fmt.Sprintf("Bio for user %d", i),
			Gender:               gender,
			DateOfBirth:          time.Now().AddDate(-rand.Intn(7)-18, 0, 0), // Between 18 and 24 years ago
			LocationPoint:        *schemas.NewPoint(latitude, longitude),
			City:                 city,
			Education:            randomEducation(),
			Occupation:           randomOccupation(),
			Interests:            randomInterests(),
			Image1:               images.Image1,
			Image2:               images.Image2,
			Image3:               images.Image3,
			Image4:               images.Image4,
			PreferredGender:      oppositeGender(gender),
			PreferredAgeMin:      rand.Intn(10) + 18, // Between 18 and 27
			PreferredAgeMax:      rand.Intn(32) + 28, // Between 28 and 59
			PreferredDistanceMax: rand.Intn(50) + 1,  // Between 1 and 50 km
		}

		if err := db.Create(&newProfile).Error; err != nil {
			log.Printf("Failed to create profile: %v", err)
			continue
		}

		users[i] = user
		profiles[i] = newProfile
	}

	for _, p := range profiles {
		// Determine number of friend requests this p will send (between 0 and 5)
		numFriendRequests := rand.Intn(6)

		// Create a slice to keep track of friend IDs to avoid duplicates
		friendIDs := make(map[uint]bool)

		for j := 0; j < numFriendRequests; j++ {
			// Keep trying until we find a suitable friend
			for {
				// Pick a random p
				friendIndex := rand.Intn(len(profiles))
				potentialFriend := profiles[friendIndex]

				// Check if this is a suitable friend (same gender, not self, not already requested)
				if potentialFriend.Gender == p.Gender &&
					potentialFriend.UserID != p.UserID &&
					!friendIDs[potentialFriend.UserID] {

					friendship := schemas.Friendship{
						ProfileID: p.UserID,               // Sender of the friend request
						FriendID:  potentialFriend.UserID, // Receiver of the friend request
						Accepted:  rand.Float32() < 0.7,   // 70% chance of being accepted
					}

					if err := db.Create(&friendship).Error; err != nil {
						log.Printf("Failed to create friendship: %v", err)
						continue
					}

					// Mark this friend as added
					friendIDs[potentialFriend.UserID] = true
					break
				}

				// If we've tried all possible friends, break out
				if len(friendIDs) == len(profiles)-1 {
					break
				}
			}
		}
	}
}

func randomGender() string {
	genders := []string{"male", "female"}
	return genders[rand.Intn(len(genders))]
}

func oppositeGender(gender string) string {
	if gender == "male" {
		return "female"
	}

	return "male"
}

type GenderImages struct {
	Image1 string
	Image2 string
	Image3 string
	Image4 string
}

func genderImages(gender string) GenderImages {
	if gender == "female" {
		return GenderImages{
			Image1: "https://i.scdn.co/image/ab676161000051747ffadf2671159fbfdc5c87f4",
			Image2: "https://pyxis.nymag.com/v1/imgs/96b/978/1d09a29f819e1de0298abffbd8ac7b2e48-Camila-cabello.1x.rsquare.w1400.jpg",
			Image3: "https://cdn.apollo.audio/one/media/652d/4ea0/88fa/c905/b25a/ea13/camila-cabello.jpg?quality=80&format=jpg&crop=0,9,590,1058&resize=crop",
			Image4: "https://media.pitchfork.com/photos/66390c58438697b4dc1e03d6/4:3/w_3024,h_2268,c_limit/Camila-Cabello.jpg",
		}
	}

	return GenderImages{
		Image1: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIYNicxDRqEUswq7bxmCrilEkQlSOQaRWIXA&s",
		Image2: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSDzHe5ECDoe2Kg7fvcBwx9uPI3UV_8Hg70rg&s",
		Image3: "https://pbs.twimg.com/profile_images/1225304459896426496/Xy1O_4qo_400x400.jpg",
		Image4: "https://cdn.vox-cdn.com/thumbor/XcJKJhYgE95C0EPo7Dri7an-dhQ=/1400x1050/filters:format(jpeg)/cdn.vox-cdn.com/uploads/chorus_asset/file/19260985/1173652749.jpg.jpg",
	}
}

func randomEducation() string {
	educations := []string{"High School", "Bachelor's", "Master's", "PhD"}
	return educations[rand.Intn(len(educations))]
}

func randomOccupation() string {
	occupations := []string{"Engineer", "Teacher", "Doctor", "Artist", "Entrepreneur"}
	return occupations[rand.Intn(len(occupations))]
}

func randomInterests() string {
	interests := []string{"Sports", "Music", "Travel", "Reading", "Cooking", "Photography"}
	numInterests := rand.Intn(3) + 1 // 1 to 3 interests
	selectedInterests := make([]string, numInterests)
	for i := 0; i < numInterests; i++ {
		selectedInterests[i] = interests[rand.Intn(len(interests))]
	}
	return strings.Join(selectedInterests, ", ")
}

const (
	earthRadiusKm    = 6371 // Earth's radius in kilometers
	maxDistanceMiles = 20
)

func generateRandomCoordinate(centralLat, centralLon float64) (float64, float64) {
	// Convert max distance to kilometers
	maxDistanceKm := maxDistanceMiles * 1.60934

	// Generate a random distance within the maximum distance
	distanceKm := rand.Float64() * maxDistanceKm

	// Generate a random angle
	angle := rand.Float64() * 2 * math.Pi

	// Calculate the change in latitude and longitude
	changeLat := (distanceKm / earthRadiusKm) * (180 / math.Pi)
	changeLon := (distanceKm / earthRadiusKm) * (180 / math.Pi) / math.Cos(centralLat*math.Pi/180)

	// Calculate new latitude and longitude
	newLat := centralLat + changeLat*math.Cos(angle)
	newLon := centralLon + changeLon*math.Sin(angle)

	return newLat, newLon
}
