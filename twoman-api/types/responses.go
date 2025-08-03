package types

type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Error   string      `json:"error"`
	Code    int         `json:"code"`
	Data    interface{} `json:"data"`
}
