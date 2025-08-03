package handlers

import (
	"net/http"
	"twoman/handlers/response"
)

func (h Handler) HandleHealth() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response.OK(w, "OK")
	})
}
