package socket

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"reflect"
	"time"
	"twoman/handlers/helpers/chat"
	"twoman/handlers/helpers/matches"
	"twoman/handlers/helpers/notifications"
	"twoman/handlers/helpers/profile"
	"twoman/handlers/helpers/user"
	"twoman/schemas"
	"twoman/types"

	"github.com/getsentry/sentry-go"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type Handler struct {
	UserChannels map[uint]chan []byte
}

func BroadcastToUser[T schemas.Matches | schemas.Message | schemas.Friendship | types.SocketProfileResponseData](userID uint, message types.SocketMessage[*T], rdb *redis.Client, db *gorm.DB) {

	if userID == 0 {
		log.Println("Invalid user ID")
		return
	}

	jsonMessage, err := json.Marshal(message)

	if err != nil {
		sentry.CaptureException(err)
		log.Println("Error marshalling message:", err)
		return
	}

	channelName := fmt.Sprintf("user:%d", userID)
	ctx := context.Background()
	subscribedUsers := rdb.PubSubNumSub(ctx, channelName).Val()
	if subscribedUsers[channelName] > 0 {
		err := rdb.Publish(ctx, channelName, jsonMessage).Err()
		if err != nil {
			sentry.CaptureException(err)
			log.Println("Publish error:", err)
		}
	}

	pushTokens, err := notifications.GetPushTokensByUserId(userID, db)
	if err != nil {
		sentry.CaptureException(err)
		log.Println("Error getting push tokens:", err)
		return
	}

	if len(pushTokens) == 0 {
		log.Println("No push tokens found")
		return
	}

	if !pushTokens[0].NotificationsEnabled {
		log.Println("Notifications disabled")
		return
	}

	tokens := make([]string, len(pushTokens))
	for i, pt := range pushTokens {
		tokens[i] = pt.Token
	}

	var title, body string
	switch {
	case reflect.TypeOf(message.Data).Elem() == reflect.TypeOf(schemas.Matches{}):
		// 1) Check if the user wants match notifications
		if !pushTokens[0].NewMatchesNotificationsEnabled {
			log.Println("New matches notifications disabled")
			return
		}

		data := any(message.Data).(*schemas.Matches)

		// 2) If it's a friend-type match, skip (your existing logic).
		if data.IsFriend {
			return
		}

		// We'll figure out the user's "role" in the match
		// (i.e. am I profile2, profile3, or profile4?).
		// profile1 is the match initiator, so typically we won't push "new like" to them,
		// but that depends on your use case.
		isProfile2 := (data.Profile2ID != nil && *data.Profile2ID == userID)
		isProfile3 := (data.Profile3ID == userID)
		isProfile4 := (data.Profile4ID != nil && *data.Profile4ID == userID)

		// 3) Distinguish between "accepted" vs. "pending"
		switch data.Status {

		// ---------------------
		// A) ACCEPTED MATCH
		// ---------------------
		case "accepted":
			// Everyone has accepted; push a final "New Match" to
			// all relevant participants who want it.
			title = "New Match"
			body = "You have a new match!"
			// (No return here, we'll break to send the push.)

		// ---------------------
		// B) PENDING MATCH
		// ---------------------
		case "pending":
			// We'll handle SOLO vs. DUO
			if data.IsDuo {

				// ---------- DUO SCENARIO ----------
				// 1) If I'm profile2, and we haven't picked profile4 yet,
				//    that means I'm invited to choose a friend for the duo.
				//    "New 2 Man Invite"
				if isProfile2 && data.Profile4ID == nil {
					title = "New 2 Man Invite"
					body = "You have a new 2 Man invite from your friend!"
					break
				}

				if isProfile3 && data.Profile4 == nil {
					break
				}

				// 2) If I'm profile3 or profile4,
				//    that means I'm the target (or the friend of the target)
				//    who hasn't accepted yet. Typically you'd check if
				//    this user hasn't accepted to avoid double-notifications:
				//
				//    For example:
				//    - if I'm profile3 and !data.Profile3Accepted => show "X and Y want to run a 2 Man with you!"
				//    - if I'm profile4 and !data.Profile4Accepted => likewise.

				// profile3 scenario
				if isProfile3 && !data.Profile3Accepted {
					// The names can be pulled from data.Profile1.Name and data.Profile2?.Name
					// For safety, check if data.Profile2 is non-nil:
					var p2Name string
					if data.Profile2 != nil {
						p2Name = " and " + data.Profile2.Name
					}

					title = "New Duo Like!"
					body = fmt.Sprintf(
						"%s%s want to run a 2 Man with you!",
						data.Profile1.Name,
						p2Name,
					)
					break
				}

				// profile4 scenario
				if isProfile4 && !data.Profile4Accepted {
					var p2Name string
					if data.Profile2 != nil {
						p2Name = " and " + data.Profile2.Name
					}

					title = "New Duo Like!"
					body = fmt.Sprintf(
						"%s%s want to run a 2 Man with you!",
						data.Profile1.Name,
						p2Name,
					)
					break
				}

				// If none of the above DUO conditions apply, skip
				// (you might or might not want to handle partial acceptance).
				return

			} else {
				// ---------- SOLO SCENARIO ----------
				// Typically we only notify the target (profile3) that they got a new like
				// if the match is pending, i.e. waiting on them.

				if isProfile3 && !data.Profile3Accepted {
					title = "New Like!"
					body = fmt.Sprintf("%s liked you!", data.Profile1.Name)
					break
				}

				// If none of the above SOLO conditions apply, skip
				return
			}

		default:
			// If the status is something else (e.g. "rejected", "canceled"), skip
			return
		}

	case reflect.TypeOf(message.Data).Elem() == reflect.TypeOf(schemas.Message{}):

		if !pushTokens[0].NewMessagesNotificationsEnabled {
			log.Println("New messages notifications disabled")
			return
		}

		data := any(message.Data).(*schemas.Message)

		if data.ProfileID == userID {
			return
		}

		title = data.Profile.Name
		body = data.Message
	case reflect.TypeOf(message.Data).Elem() == reflect.TypeOf(types.SocketProfileResponseData{}):
		return
	case reflect.TypeOf(message.Data).Elem() == reflect.TypeOf(schemas.Friendship{}):

		data := any(message.Data).(*schemas.Friendship)
		if data.FriendID == userID && !data.Accepted {
			title = "New Friend Request"
			body = fmt.Sprintf("%s sent you a friend request", data.Profile.Name)

			break
		}
		if data.ProfileID == userID && data.Accepted {
			title = "New Friend"
			body = fmt.Sprintf("%s accepted your friend request", data.Friend.Name)
			break
		}

		return
	default:
		title = "New Motion"
		body = "There's some activity going on!"
	}

	log.Println("Sending push notifications")
	err = notifications.SendExpoNotifications(tokens, title, body, nil)
	if err != nil {
		sentry.CaptureException(err)
		log.Println("Error sending push notifications:", err)
		return
	}

}

func (s Handler) HandleChat(socketMessage types.SocketMessage[types.SocketChatData], userId uint, db *gorm.DB, rdb *redis.Client, clientVersion string) {
	switch clientVersion {
	default:

		var socketChatData types.SocketChatData
		jsonData, err := json.Marshal(socketMessage.Data)
		if err != nil {
			sentry.CaptureException(err)
			log.Println("Failed to marshal chat data:", err)
			return
		}
		err = json.Unmarshal(jsonData, &socketChatData)
		if err != nil {
			sentry.CaptureException(err)
			log.Println("Failed to unmarshal chat data:", err)
			return
		}

		match, chatMessage, err := chat.SaveChatMessage(userId, socketChatData.MatchID, socketChatData.Message, db)
		if err != nil {
			sentry.CaptureException(err)
			log.Println("Error saving chat message:", err)
			return
		}
		if match == nil {
			sentry.CaptureException(err)
			log.Println("Match not found")
			return
		}

		senderProfile, err := profile.GetProfileById(userId, db)

		if err != nil {
			sentry.CaptureException(err)
			log.Println("Error getting profile:", err)
			return
		}

		chatMessage.Profile = *senderProfile

		chatSocketMessage := types.SocketMessage[*schemas.Message]{
			Type: "chat",
			Data: chatMessage,
		}

		if !match.IsDuo {
			BroadcastToUser(match.Profile1ID, chatSocketMessage, rdb, db)
			BroadcastToUser(match.Profile3ID, chatSocketMessage, rdb, db)
		} else {
			log.Println("Broadcasting to all participants")
			BroadcastToUser(match.Profile1ID, chatSocketMessage, rdb, db)
			if match.Profile2ID != nil {
				BroadcastToUser(*match.Profile2ID, chatSocketMessage, rdb, db)
			}
			BroadcastToUser(match.Profile3ID, chatSocketMessage, rdb, db)
			if match.Profile4ID != nil {
				BroadcastToUser(*match.Profile4ID, chatSocketMessage, rdb, db)
			}
		}
	}

}

func (s Handler) HandleMatch(socketMessage types.SocketMessage[types.SocketMatchData], userId uint, db *gorm.DB, rdb *redis.Client, clientVersion string) {
	switch clientVersion {

	default:

		matchData := socketMessage.Data

		switch matchData.Action {
		case "accept":
			log.Println("Accepting match")
			err := matches.AcceptMatch(matchData.MatchID, userId, db)
			if err != nil {
				sentry.CaptureException(err)
				log.Println("Error accepting match:", err)
				return
			}
		case "reject":

			log.Println("Rejecting match")
			err := matches.RejectMatch(matchData.MatchID, userId, db)
			if err != nil {
				sentry.CaptureException(err)
				log.Println("Error rejecting match:", err)
				return
			}
		case "update_target":
			log.Println("Update target message | Target Profile: ", matchData.TargetProfile)
			profile3ID, profile4ID, err := matches.UpdateDuoTargetProfile2(matchData.MatchID, userId, matchData.TargetProfile, db)

			if err != nil {
				sentry.CaptureException(err)
				log.Println("Error updating target profile:", err)
				return
			}

			log.Println("Profile 4 ID: ", profile4ID)
			if profile3ID == nil || profile4ID == nil {
				log.Println("Target profile 2 not set")
				sentry.CaptureException(err)
				return
			}

			match, err := matches.GetMatchByID(matchData.MatchID, db)

			if err != nil {
				log.Println("Error getting match:", err)
				sentry.CaptureException(err)
				return
			}

			matchSocketMessage := types.SocketMessage[*schemas.Matches]{
				Type: "match",
				Data: match,
			}

			BroadcastToUser(userId, matchSocketMessage, rdb, db)
			BroadcastToUser(*profile3ID, matchSocketMessage, rdb, db)
			BroadcastToUser(*profile4ID, matchSocketMessage, rdb, db)
			return
		case "unmatch":
			err := matches.Unmatch(matchData.MatchID, userId, db)

			if err != nil {
				log.Println("Error unmatching:", err)
				sentry.CaptureException(err)
				return
			}

			match, err := matches.GetMatchByID(matchData.MatchID, db)

			if err != nil {
				log.Println("Error getting match:", err)
				sentry.CaptureException(err)
				return
			}

			matchSocketMessage := types.SocketMessage[*schemas.Matches]{
				Type: "match",
				Data: match,
			}

			if !match.IsDuo {
				BroadcastToUser(match.Profile1ID, matchSocketMessage, rdb, db)
				BroadcastToUser(match.Profile3ID, matchSocketMessage, rdb, db)
			} else {
				BroadcastToUser(match.Profile1ID, matchSocketMessage, rdb, db)
				if match.Profile2ID != nil {
					BroadcastToUser(*match.Profile2ID, matchSocketMessage, rdb, db)
				}
				BroadcastToUser(match.Profile3ID, matchSocketMessage, rdb, db)
				if match.Profile4ID != nil {
					BroadcastToUser(*match.Profile4ID, matchSocketMessage, rdb, db)
				}
			}
			return
		case "friend_match":
			match, err := matches.CreateFriendMatch(matchData.MatchID, userId, db)

			if err != nil {
				log.Println("Error creating friend match:", err)
				sentry.CaptureException(err)
				return
			}

			matchSocketMessage := types.SocketMessage[*schemas.Matches]{
				Type: "match",
				Data: match,
			}

			BroadcastToUser(match.Profile1ID, matchSocketMessage, rdb, db)
			BroadcastToUser(match.Profile3ID, matchSocketMessage, rdb, db)

		default:
			log.Println("Unhandled message case: ", matchData.Action)
		}

		match, err := matches.GetMatchByID(matchData.MatchID, db)
		if err != nil {
			log.Println("Error getting match:", err)
			sentry.CaptureException(err)
			return
		}

		matchSocketMessage := types.SocketMessage[*schemas.Matches]{
			Type: "match",
			Data: match,
		}

		if !match.IsDuo {
			BroadcastToUser(match.Profile1ID, matchSocketMessage, rdb, db)
			BroadcastToUser(match.Profile3ID, matchSocketMessage, rdb, db)
		} else {
			BroadcastToUser(match.Profile1ID, matchSocketMessage, rdb, db)
			if match.Profile2ID != nil {
				BroadcastToUser(*match.Profile2ID, matchSocketMessage, rdb, db)
			}
			BroadcastToUser(match.Profile3ID, matchSocketMessage, rdb, db)
			if match.Profile4ID != nil {
				BroadcastToUser(*match.Profile4ID, matchSocketMessage, rdb, db)
			}
		}
	}
}

func (s Handler) HandleProfile(socketMessage types.SocketMessage[types.SocketProfileDecisionData], userId uint, db *gorm.DB, rdb *redis.Client, clientVersion string) {

	ctx := context.Background()

	switch clientVersion {
	default:

		profileData := socketMessage.Data

		if profileData.Decision == "like" {

			key := fmt.Sprintf("user:likes:%d:%s", userId, time.Now().Format("2006-01-02"))
			likesCount, err := rdb.Get(ctx, key).Int()
			if err != nil && !errors.Is(err, redis.Nil) {
				log.Println("Error getting likes count:", err)
				sendErrorResponse(userId, "Error processing like", rdb, db)
				sentry.CaptureException(err)
				return
			}

			log.Println("Likes count:", likesCount)

			userIsPro, err := user.IsUserPro(userId, db)

			if err != nil {
				log.Println("Error checking if user is pro:", err)
				sendErrorResponse(userId, "Error processing like", rdb, db)
				sentry.CaptureException(err)
				return
			}

			if !userIsPro && likesCount >= 8 {
				sendErrorResponse(userId, "Daily like limit reached", rdb, db)
				return
			}

			_, err = rdb.Incr(ctx, key).Result()
			if err != nil {
				log.Println("Error incrementing likes count:", err)
				sendErrorResponse(userId, "Error processing like", rdb, db)
				sentry.CaptureException(err)
				return
			}

			if likesCount == 0 {
				rdb.Expire(ctx, key, 24*time.Hour)
			}

			if err := profile.CreateProfileView(userId, profileData.TargetProfile, db); err != nil {
				log.Println("Error creating profile view:", err)
				sendErrorResponse(userId, "Error processing like", rdb, db)
				sentry.CaptureException(err)
				return
			}

			if err := profile.CreateProfileView(profileData.TargetProfile, userId, db); err != nil {
				sendErrorResponse(userId, "Error processing like", rdb, db)
				sentry.CaptureException(err)
				return
			}

			if profileData.IsDuo {
				if err := matches.CreateDuoMatch(userId, profileData.FriendProfile, profileData.TargetProfile, db); err != nil {
					log.Println("Error creating match:", err)
					sendErrorResponse(userId, "Error processing like", rdb, db)
					sentry.CaptureException(err)
					return
				}

				match, err := matches.GetDuoMatchByProfileIDs(userId, profileData.FriendProfile, profileData.TargetProfile, db)

				if err != nil {
					log.Println("Error getting match:", err)
					sendErrorResponse(userId, "Error processing like", rdb, db)
					sentry.CaptureException(err)
					return
				}

				matchSocketMessage := types.SocketMessage[*schemas.Matches]{
					Type: "match",
					Data: match,
				}

				BroadcastToUser(profileData.FriendProfile, matchSocketMessage, rdb, db)
			} else {

				if err := matches.CreateSoloMatch(userId, profileData.TargetProfile, db); err != nil {
					log.Println("Error creating match:", err)
					sendErrorResponse(userId, "Error processing like", rdb, db)
					sentry.CaptureException(err)
					return
				}

				match, err := matches.GetSoloMatchByProfileIDs(userId, profileData.TargetProfile, db)

				if err != nil {
					log.Println("Error getting match:", err)
					sentry.CaptureException(err)
					return
				}

				matchSocketMessage := types.SocketMessage[*schemas.Matches]{
					Type: "match",
					Data: match,
				}

				BroadcastToUser(profileData.TargetProfile, matchSocketMessage, rdb, db)

			}

			sendSuccessResponse(userId, "Successfully processed like", rdb, db)

		} else {
			if err := profile.CreateProfileView(userId, profileData.TargetProfile, db); err != nil {
				log.Println("Error creating profile view:", err)
				sentry.CaptureException(err)
				return
			}

			sendSuccessResponse(userId, "Successfully processed dislike", rdb, db)
		}

	}

}

func sendErrorResponse(userId uint, message string, rdb *redis.Client, db *gorm.DB) {
	response := types.SocketMessage[*types.SocketProfileResponseData]{
		Type: "profile_response",
		Data: &types.SocketProfileResponseData{
			Message: message,
			Success: false,
		},
	}
	BroadcastToUser(userId, response, rdb, db)
}

func sendSuccessResponse(userId uint, message string, rdb *redis.Client, db *gorm.DB) {
	response := types.SocketMessage[*types.SocketProfileResponseData]{
		Type: "profile_response",
		Data: &types.SocketProfileResponseData{
			Message: message,
			Success: true,
		},
	}
	BroadcastToUser(userId, response, rdb, db)
}
