package schemas

import (
	"database/sql/driver"
	"encoding/binary"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/twpayne/go-geom"
	"github.com/twpayne/go-geom/encoding/wkb"
)

type Point struct {
	*geom.Point
}

type Profile struct {
	UserID               uint      `gorm:"primaryKey" json:"user_id"`
	Name                 string    `json:"name"`
	Username             string    `gorm:"uniqueIndex" json:"username"`
	Bio                  string    `json:"bio"`
	Gender               string    `json:"gender"`
	DateOfBirth          time.Time `json:"date_of_birth"`
	LocationPoint        Point     `gorm:"type:point;not null;SRID:4326" json:"location_point"`
	City                 string    `json:"city"`
	Education            string    `json:"education"`
	Occupation           string    `json:"occupation"`
	Interests            string    `json:"interests"`
	Image1               string    `json:"image1"`
	Image2               string    `json:"image2"`
	Image3               string    `json:"image3"`
	Image4               string    `json:"image4"`
	PreferredGender      string    `json:"preferred_gender"`
	PreferredAgeMin      int       `json:"preferred_age_min"`
	PreferredAgeMax      int       `json:"preferred_age_max"`
	PreferredDistanceMax int       `json:"preferred_distance_max"`
}

type ProfileView struct {
	ID        uint `gorm:"primarykey"`
	CreatedAt time.Time
	UpdatedAt time.Time
	UserID    uint `json:"user_id"`
	ProfileID uint `json:"profile_id"`
}

func NewPoint(latitude, longitude float64) *Point {
	return &Point{
		Point: geom.NewPointFlat(geom.XY, []float64{longitude, latitude}),
	}
}

func (p *Point) Scan(src interface{}) error {
	if src == nil {
		p.Point = nil
		return nil
	}

	b, ok := src.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}

	if len(b) < 5 {
		return errors.New("invalid MariaDB spatial data format")
	}

	// Skip the first 4 bytes (SRID)
	wkbData := b[4:]

	g, err := wkb.Unmarshal(wkbData)
	if err != nil {
		return fmt.Errorf("wkb unmarshal error: %w", err)
	}

	pt, ok := g.(*geom.Point)
	if !ok {
		return errors.New("not a geom.Point")
	}
	p.Point = pt

	return nil
}

func (p Point) Value() (driver.Value, error) {
	if p.Point == nil {
		return nil, nil
	}

	// Marshal the point to WKB
	wkbData, err := wkb.Marshal(p.Point, wkb.NDR)
	if err != nil {
		return nil, err
	}

	// Prepend SRID (4326) - assuming little-endian encoding
	sridData := make([]byte, 4+len(wkbData))
	binary.LittleEndian.PutUint32(sridData[:4], 4326)
	copy(sridData[4:], wkbData)

	return sridData, nil
}

func (p *Point) String() string {
	return fmt.Sprintf("POINT(%f %f)", p.X(), p.Y())
}

func (p *Point) Valid() bool {
	lon, lat := p.X(), p.Y()
	log.Println("Validating point: ", lat, lon)
	return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}
