package types

type AppleIdentity struct {
	Email string `json:"email"`
	Sub   string `json:"sub"`
}

type GoogleIdentity struct {
	Email         string `json:"email"`
	Sub           string `json:"sub"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
}
