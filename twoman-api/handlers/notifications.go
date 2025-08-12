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

		// Use new V2 system
		if err := notifications.UpdateNotificationPreferencesV2(session.UserID, req, h.DB(r)); err != nil {
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

		// Use compatibility function to maintain legacy API response format
		notificationPreferences, err := notifications.GetNotificationPreferencesCompat(session.UserID, h.DB(r))
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

			// Use new V2 system
			if err := notifications.AddPushTokenV2(session.UserID, pushTokenRequest.PushToken, h.DB(r)); err != nil {
				log.Println("Error adding push token: ", err)
				response.InternalServerError(w, err, "Something went wrong")
				return
			}
		}

		response.OK(w, "OK")
	})
}
