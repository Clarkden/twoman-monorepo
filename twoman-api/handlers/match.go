package handlers

import (
	"net/http"
	"strconv"
	"twoman/globals"
	"twoman/handlers/helpers/matches"
	"twoman/handlers/response"
	"twoman/types"
)

func (h Handler) HandleGetPendingMatches() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			pendingMatches, err := matches.GetPendingMatches(session.UserID, h.DB(r))
			if err != nil {
				response.InternalServerError(w, err, "Something went wrong")
				return
			}
			response.OKWithData(w, "Successfully retrieved pending matches", pendingMatches)
		}
	})

}

func (h Handler) HandleGetAcceptedMatches() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			acceptedMatches, err := matches.GetAcceptedMatches(session.UserID, h.DB(r))
			if err != nil {
				response.InternalServerError(w, err, "Something went wrong")
				return
			}
			response.OKWithData(w, "Successfully retrieved accepted matches", acceptedMatches)
		}
	})
}

func (h Handler) HandleGetPendingMatchTarget() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			pendingMatchTargetDecisions, err := matches.GetMatchesPendingProfile4Decision(session.UserID, h.DB(r))

			if err != nil {
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			response.OKWithData(w, "Successfully retrieved pending match target decisions", pendingMatchTargetDecisions)
		}

	})
}

func (h Handler) HandleGetMatch() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		clientVersion := r.Header.Get("X-Client-Version")

		matchId := r.PathValue("matchId")

		if matchId == "" {
			response.BadRequest(w, "Match ID is required")
			return
		}

		parsedMatchId, err := strconv.Atoi(matchId)

		if err != nil {
			response.BadRequest(w, "Invalid match ID")
			return
		}

		switch clientVersion {

		default:
			match, err := matches.GetMatchByID(uint(parsedMatchId), h.DB(r))
			if err != nil {
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			// Check if the user is part of the match
			isUserInMatch := match.Profile1ID == session.UserID || match.Profile3ID == session.UserID

			if match.Profile2ID != nil {
				isUserInMatch = isUserInMatch || *match.Profile2ID == session.UserID
			}

			if match.Profile4ID != nil {
				isUserInMatch = isUserInMatch || *match.Profile4ID == session.UserID
			}

			if !isUserInMatch {
				response.Forbidden(w, "You are not a part of this match")
				return
			}

			response.OKWithData(w, "Successfully retrieved match", match)
		}
	})
}
