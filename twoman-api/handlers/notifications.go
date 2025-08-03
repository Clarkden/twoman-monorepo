package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"twoman/globals"
	"twoman/handlers/helpers/notifications"
	"twoman/handlers/response"
	"twoman/types"
)

func (h Handler) HandleUpdateNotificationPreferences() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		var req types.UpdateNotificationPreferencesRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Println("Error decoding request: ", err)
			response.BadRequest(w, "Invalid request")
			return
		}

		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		if err := notifications.UpdateNotificationPreferences(session.UserID, req, h.DB(r)); err != nil {
			log.Println("Error updating notification preferences: ", err)
			response.InternalServerError(w, err, "Something went wrong")
			return

		}

		response.OK(w, "Notification preferences updated")
	})
}

func (h Handler) HandleGetNotificationPreferences() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		notificationPreferences, err := notifications.GetNotificationPreferences(session.UserID, h.DB(r))
		if err != nil {
			log.Println("Error getting notification preferences: ", err)
			response.InternalServerError(w, err, "Something went wrong")
			return
		}

		response.OKWithData(w, "Successfully retrieved notification preferences", notificationPreferences)
	})
}

func (h Handler) HandleUpdatePushToken() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)
		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {
		default:

			var pushTokenRequest types.UpdatePushTokenRequest
			if err := json.NewDecoder(r.Body).Decode(&pushTokenRequest); err != nil {
				response.BadRequest(w, "Invalid request")
				return
			}

			if err := notifications.AddPushToken(session.UserID, pushTokenRequest.PushToken, h.DB(r)); err != nil {
				response.InternalServerError(w, err, "Something went wrong")
				return
			}
		}

		response.OK(w, "OK")
	})
}
