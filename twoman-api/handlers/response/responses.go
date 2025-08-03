package response

import (
	"encoding/json"
	"net/http"
	"twoman/types"

	"github.com/getsentry/sentry-go"
)

func BadRequest(w http.ResponseWriter, error string) {
	w.WriteHeader(http.StatusBadRequest)
	w.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(w).Encode(types.Response{
		Success: false,
		Message: "",
		Error:   error,
		Code:    http.StatusBadRequest,
		Data:    nil,
	})
	if err != nil {
		return
	}
}

func InternalServerError(w http.ResponseWriter, exception error, message string) {

	sentry.CaptureException(exception)

	w.WriteHeader(http.StatusInternalServerError)
	w.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(w).Encode(types.Response{
		Success: false,
		Message: "",
		Error:   message,
		Code:    http.StatusInternalServerError,
		Data:    nil,
	})
	if err != nil {
		return
	}
}

func Unauthorized(w http.ResponseWriter, error string) {
	w.WriteHeader(http.StatusUnauthorized)
	w.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(w).Encode(types.Response{
		Success: false,
		Message: "",
		Error:   error,
		Code:    http.StatusUnauthorized,
		Data:    nil,
	})
	if err != nil {
		return
	}
}

func OK(w http.ResponseWriter, message string) {
	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(w).Encode(types.Response{
		Success: true,
		Message: message,
		Error:   "",
		Code:    http.StatusOK,
		Data:    nil,
	})
	if err != nil {
		return
	}
}

func OKWithData(w http.ResponseWriter, message string, data interface{}) {
	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(w).Encode(types.Response{
		Success: true,
		Message: message,
		Error:   "",
		Code:    http.StatusOK,
		Data:    data,
	})
	if err != nil {
		return
	}
}

func NotFound(w http.ResponseWriter, error string) {
	w.WriteHeader(http.StatusNotFound)
	w.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(w).Encode(types.Response{
		Success: false,
		Message: "",
		Error:   error,
		Code:    http.StatusNotFound,
		Data:    nil,
	})
	if err != nil {
		return
	}
}

func Conflict(w http.ResponseWriter, error string) {
	w.WriteHeader(http.StatusConflict)
	w.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(w).Encode(types.Response{
		Success: false,
		Message: "",
		Error:   error,
		Code:    http.StatusConflict,
		Data:    nil,
	})
	if err != nil {
		return
	}

}
func Forbidden(w http.ResponseWriter, error string) {
	w.WriteHeader(http.StatusForbidden)
	w.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(w).Encode(types.Response{
		Success: false,
		Message: "",
		Error:   error,
		Code:    http.StatusForbidden,
		Data:    nil,
	})
	if err != nil {
		return
	}
}

func TooManyRequests(w http.ResponseWriter, error string) {
	w.WriteHeader(http.StatusTooManyRequests)
	w.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(w).Encode(types.Response{
		Success: false,
		Message: "",
		Error:   error,
		Code:    http.StatusTooManyRequests,
		Data:    nil,
	})
	if err != nil {
		return
	}
}
