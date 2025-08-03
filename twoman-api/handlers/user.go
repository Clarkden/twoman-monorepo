package handlers

import (
	"net/http"
	"twoman/globals"
	"twoman/handlers/helpers/user"
	"twoman/handlers/response"
	"twoman/types"
)

func (h Handler) HandleGetUserSelf() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)
		clientVersion := r.Header.Get("X-Client-Version")
		switch clientVersion {

		default:

			foundUser, err := user.GetUserByID(session.UserID, h.DB(r))

			if err != nil {
				response.NotFound(w, err.Error())
				return
			}

			response.OKWithData(w, "successfully found self", foundUser)
		}
	})
}

func (h Handler) HandleDeleteUser() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)
		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {
		default:

			// if err := user.DeleteUser(session.UserID, h.DB(r), h.s3); err != nil {
			// 	response.InternalServerError(w, err, "Something went wrong")
			// 	return
			// }

			response.OK(w, "OK")
		}
	})
}
