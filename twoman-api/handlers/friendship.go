package handlers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"twoman/globals"
	"twoman/handlers/helpers/friendship"
	"twoman/handlers/helpers/matches"
	"twoman/handlers/helpers/profile"
	"twoman/handlers/helpers/socket"
	"twoman/handlers/response"
	"twoman/schemas"
	"twoman/types"

	"gorm.io/gorm"
)

// TODO: Implement friend invites using websocket for real-time in-app notifications

// @Summary Send Friend Invite
// @Description Send a friend invite to another user
// @Tags Friendship
// @Accept json
// @Produce json
// @Param username path string true "Recipient's Username"
// @Success 200 {object} types.Response
// @Failure 400 {object} types.Response
// @Failure 404 {object} types.Response
// @Failure 409 {object} types.Response
// @Failure 500 {object} types.Response
// @Router /friendship/send/{username} [post]
func (h Handler) HandleSendFriendInvite() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Println("Handling SendFriendInvite")
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			username := r.PathValue("username")
			if username == "" {
				response.BadRequest(w, "username param must not be empty")
				return
			}

			recipientProfile, err := profile.FindProfileByUsername(username, h.DB(r))

			if err != nil {
				switch {
				case errors.Is(err, gorm.ErrRecordNotFound):
					response.NotFound(w, "Recipient not found")
				default:
					response.InternalServerError(w, err, "Something went wrong")
				}

				return
			}

			friendshipRecord, err := friendship.SendFriendRequest(session.UserID, recipientProfile.UserID, h.DB(r))
			if err != nil {
				log.Println(err)
				switch {
				case errors.Is(err, gorm.ErrRecordNotFound):
					response.NotFound(w, "Recipient not found")
				case strings.Contains(err.Error(), "friendship already exists"):
					response.Conflict(w, "Friendship already exists")
				case strings.Contains(err.Error(), "could not save friendship record"):
					response.InternalServerError(w, err, "Something went wrong")
				default:
					response.InternalServerError(w, err, "Something went wrong")
				}
				return
			}

			log.Println("Friendship Profile Name: ", friendshipRecord.Profile.Name, "Friendship Profile Username: ", friendshipRecord.Profile.Username)
			log.Println("Friendship Friend Name: ", friendshipRecord.Friend.Name, "Friendship Friend Username: ", friendshipRecord.Friend.Username)
			log.Println("Friendship Accepted: ", friendshipRecord.Accepted)

			socketFriendshipMessage := types.SocketMessage[*schemas.Friendship]{
				Type: "friendship",
				Data: friendshipRecord,
			}

			socket.BroadcastToUser(recipientProfile.UserID, socketFriendshipMessage, h.rdb, h.DB(r))

			response.OK(w, "OK")
		}
	})
}

// @Summary Get Friends
// @Description Get the list of friends for the current user
// @Tags Friendship
// @Accept json
// @Produce json
// @Success 200 {object} types.Response
// @Failure 500 {object} types.Response
// @Router /friendship/friends [get]
func (h Handler) HandleGetFriends() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			log.Println("getting friends")

			friends, err := friendship.GetAllFriends(session.UserID, h.DB(r))
			if err != nil {
				log.Println("Could not get friends")
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			fmt.Printf("Friends: %v", friends)

			if len(friends) == 0 {
				log.Println("empty friends array")
				response.OKWithData(w, "OK", []string{})
				return
			}

			response.OKWithData(w, "OK", friends)
		}
	})

}

// @Summary Get Friend Requests
// @Description Get the list of friend requests for the current user
// @Tags Friendship
// @Accept json
// @Produce json
// @Success 200 {object} types.Response
// @Failure 500 {object} types.Response
// @Router /friendship/requests [get]
func (h Handler) HandleGetFriendRequests() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			friendRequests, err := friendship.GetAllFriendRequests(session.UserID, h.DB(r))
			if err != nil {
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			if len(friendRequests) == 0 {
				response.OKWithData(w, "OK", []string{})
				return
			}

			response.OKWithData(w, "OK", friendRequests)
		}
	})
}

// @Summary Accept Friend Request
// @Description Accept a friend request
// @Tags Friendship
// @Accept json
// @Produce json
// @Param profileId path string true "Friendship ID"
// @Success 200 {object} types.Response
// @Failure 400 {object} types.Response
// @Failure 404 {object} types.Response
// @Failure 409 {object} types.Response
// @Failure 500 {object} types.Response
// @Router /friendship/{friendshipId}/accept [patch]
func (h Handler) HandleAcceptFriendRequest() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			friendshipId := r.PathValue("friendshipId")
			if friendshipId == "" {
				response.BadRequest(w, "profileId param must not be empty")
				return
			}

			id, err := strconv.ParseUint(friendshipId, 10, 64)

			if err != nil {
				response.BadRequest(w, "Invalid friendship id")
				return
			}

			friendshipRecord, err := friendship.AcceptFriendRequest(uint(id), session.UserID, h.DB(r))

			if err != nil {
				log.Println(err)
				switch {
				case errors.Is(err, gorm.ErrRecordNotFound):
					response.NotFound(w, "Friend request not found")
				case strings.Contains(err.Error(), "could not update friendship record"):
					response.InternalServerError(w, err, "Something went wrong")
				case strings.Contains(err.Error(), "user friendship not found"):
					response.NotFound(w, "Friendship not found")
				case strings.Contains(err.Error(), "friendship is already accepted"):
					response.Conflict(w, "Friendship is already accepted")
				default:
					response.InternalServerError(w, err, "Something went wrong")
				}
				return
			}

			socketFriendshipMessage := types.SocketMessage[*schemas.Friendship]{
				Type: "friendship",
				Data: friendshipRecord,
			}

			socket.BroadcastToUser(friendshipRecord.ProfileID, socketFriendshipMessage, h.rdb, h.DB(r))

			log.Println("Creating friend match")
			var match *schemas.Matches
			match, err = matches.CreateFriendMatch(friendshipRecord.ProfileID, friendshipRecord.FriendID, h.DB(r))

			if err != nil {
				log.Println(err)
			}

			if match == nil {
				log.Println("Match is nil")
			} else {

				socketMatchMessage := types.SocketMessage[*schemas.Matches]{
					Type: "match",
					Data: match,
				}

				socket.BroadcastToUser(friendshipRecord.ProfileID, socketMatchMessage, h.rdb, h.DB(r))
				socket.BroadcastToUser(friendshipRecord.FriendID, socketMatchMessage, h.rdb, h.DB(r))
			}

			response.OK(w, "OK")
		}
	})
}

// @Summary Reject Friend Request
// @Description Reject a friend request
// @Tags Friendship
// @Accept json
// @Produce json
// @Param profileId path string true "Friendship ID"
// @Success 200 {object} types.Response
// @Failure 400 {object} types.Response
// @Failure 500 {object} types.Response
// @Router /friendship/{friendshipId}/reject [patch]
func (h Handler) HandleRejectFriendRequest() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			friendshipId := r.PathValue("friendshipId")
			if friendshipId == "" {
				response.BadRequest(w, "profileId param must not be empty")
				return
			}

			id, err := strconv.ParseUint(friendshipId, 10, 64)

			if err != nil {
				response.BadRequest(w, "Invalid friendship id")
				return
			}

			if err := friendship.RejectFriendRequest(uint(id), session.UserID, h.DB(r)); err != nil {
				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			response.OK(w, "OK")
		}
	})
}

// @Summary Remove Friendship
// @Description Remove a friendship
// @Tags Friendship
// @Accept json
// @Produce json
// @Param profileId path string true "Friend's Profile ID"
// @Success 200 {object} types.Response
// @Failure 400 {object} types.Response
// @Failure 404 {object} types.Response
// @Failure 500 {object} types.Response
// @Router /friendship/{profileId}/remove [post]
func (h Handler) HandleRemoveFriendship() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		session := r.Context().Value(globals.SessionMiddlewareKey).(*types.Session)

		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			profileId := r.PathValue("profileId")
			if profileId == "" {
				response.BadRequest(w, "profileId param must not be empty")
				return
			}

			id, err := strconv.ParseUint(profileId, 10, 64)
			if err != nil {
				response.BadRequest(w, "Invalid profile id")
			}

			log.Println("Getting friendship match")

			match, err := matches.GetFriendshipMatch(session.UserID, uint(id), h.DB(r))

			if err != nil {
				switch {
				case errors.Is(err, gorm.ErrRecordNotFound):
					break
				default:
					response.InternalServerError(w, err, "Something went wrong")
					return
				}
			}

			if match != nil {
				log.Println("Removing friendship match")
				socketMatchRemovedMessage := types.SocketMessage[*schemas.Matches]{
					Type: "match_removed",
					Data: match,
				}

				socket.BroadcastToUser(session.UserID, socketMatchRemovedMessage, h.rdb, h.DB(r))
				socket.BroadcastToUser(uint(id), socketMatchRemovedMessage, h.rdb, h.DB(r))
			}

			if err := friendship.RemoveFriendship(session.UserID, uint(id), h.DB(r)); err != nil {
				switch {
				case strings.Contains(err.Error(), "could not find friendship record"):
					response.NotFound(w, "Friendship not found")
					return
				default:
					response.InternalServerError(w, err, "Something went wrong")
				}

				return
			}

			response.OK(w, "OK")
		}
	})
}
