package handlers

import (
	"net/http"
	"strconv"
	"twoman/globals"
	"twoman/handlers/helpers/chat"
	"twoman/handlers/response"
	"twoman/types"
)

func (h Handler) HandleGetMatchChats() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)
		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			matchId, err := strconv.ParseUint(r.PathValue("matchId"), 10, 64)

			if err != nil {
				response.BadRequest(w, "Invalid match id")
				return
			}

			authorized := chat.VerifyUserInMatch(session.UserID, uint(matchId), h.DB(r))

			if !authorized {
				response.Unauthorized(w, "Unauthorized")
				return
			}

			limit, err := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)

			if err != nil {
				response.BadRequest(w, "Invalid limit")
				return
			}

			offset, err := strconv.ParseInt(r.URL.Query().Get("offset"), 10, 64)

			if err != nil {
				response.BadRequest(w, "Invalid offset")
				return
			}

			chats, err := chat.GetMatchChats(uint(matchId), int(limit), int(offset), h.DB(r))

			if err != nil {
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			response.OKWithData(w, "successfully found chats", chats)
		}
	})
}
