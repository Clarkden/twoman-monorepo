package types

type ReportWithProfiles struct {
	ID               uint   `json:"id"`
	ReporterID       uint   `json:"reporter_id"`
	ReportedID       uint   `json:"reported_id"`
	Reason           string `json:"reason"`
	ReporterName     string `json:"reporter_name"`
	ReporterUsername string `json:"reporter_username"`
	ReportedName     string `json:"reported_name"`
	ReportedUsername string `json:"reported_username"`
}
