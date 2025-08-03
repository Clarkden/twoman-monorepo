package schemas

type Report struct {
	ID         uint   `gorm:"primaryKey"`
	ReporterID uint   `json:"reporter_id"`
	ReportedID uint   `json:"reported_id"`
	Reason     string `json:"reason"`
}

type BugReport struct {
	ID         uint   `gorm:"primaryKey"`
	ReporterID uint   `json:"reporter_id"`
	Problem    string `json:"problem"`
}
