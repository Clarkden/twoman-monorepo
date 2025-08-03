package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
	"twoman/handlers/helpers/auth"
	"twoman/handlers/helpers/socket"
	wsvalidator "twoman/handlers/helpers/websocket"
	"twoman/types"

	"github.com/getsentry/sentry-go"
	"github.com/gorilla/websocket"
	"github.com/mitchellh/mapstructure"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

var upgrade = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

var (
	userChannels   = make(map[uint]chan []byte)
	userChannelsMu sync.Mutex
)

type wsConnection struct {
	conn  *websocket.Conn
	mutex sync.Mutex
}

func (c *wsConnection) writeMessage(messageType int, data []byte) error {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	return c.conn.WriteMessage(messageType, data)
}

func (h Handler) HandleWebsocket() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		log.Println("Websocket connection opened")

		conn, err := upgrade.Upgrade(w, r, nil)
		if err != nil {
			sentry.CaptureException(err)
			log.Println("Upgrade error:", err)
			return
		}

		defer func(conn *websocket.Conn) {
			err := conn.Close()
			if err != nil {
				sentry.CaptureException(err)
				log.Println("Failed to close connection:", err)
			}
		}(conn)

		// Set a timeout for the authorization message
		authTimeout := 5 * time.Second
		err = conn.SetReadDeadline(time.Now().Add(authTimeout))
		if err != nil {
			sentry.CaptureException(err)
			log.Println("Failed to set read deadline:", err)
			return
		}

		// Wait for authorization message
		_, p, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Unexpected close error: %v", err)
			} else if errors.Is(err, websocket.ErrReadLimit) {
				log.Println("Read limit exceeded")
			} else if os.IsTimeout(err) {
				log.Println("Authorization timeout")
			} else {
				log.Println("Read error:", err)
			}
			sentry.CaptureException(err)
			return
		}

		var socketMessage types.SocketMessage[types.SocketAuthorizationData]
		err = json.Unmarshal(p, &socketMessage)
		if err != nil {
			sentry.CaptureException(err)
			log.Println("Failed to unmarshal message:", err)
			return
		}

		var authData types.SocketAuthorizationData
		var clientUsesValidatedFormat bool

		// Check if this is a new validated envelope format
		var envelope types.WebSocketEnvelope
		envErr := json.Unmarshal(p, &envelope)
		if envErr == nil && envelope.Type == "authorization" && envelope.Version != "" {
			// This is the new validated format
			log.Printf("DEBUG: Received new validated format message")
			clientUsesValidatedFormat = true
			err = json.Unmarshal(envelope.Payload, &authData)
			if err != nil {
				log.Printf("DEBUG: Failed to unmarshal validated payload: %v", err)
				sendConnectionError(conn, "INVALID_AUTH_DATA", "Invalid authorization data", true, envelope.CorrelationID)
				return
			}
		} else if socketMessage.Type == "authorization" {
			// This is the legacy format
			log.Printf("DEBUG: Received legacy format message")
			clientUsesValidatedFormat = false
			err = mapstructure.Decode(socketMessage.Data, &authData)
			if err != nil {
				sendConnectionError(conn, "INVALID_AUTH_DATA", "Invalid authorization data", false, "")
				return
			}
		} else {
			// Neither format matched authorization
			sendConnectionError(conn, "INVALID_MESSAGE_TYPE", "Unauthorized", false, "")
			return
		}

		// At this point, authData is already populated from either format

		// DEBUG: Log what we received in the authorization message
		log.Printf("DEBUG: Received auth data - Session length: %d, Version: %s", len(authData.Session), authData.Version)
		if len(authData.Session) == 0 {
			log.Printf("DEBUG: Empty session token received! Full message: %+v", socketMessage)
		}

		// Validate the token and ensure the user is authenticated
		token := authData.Session
		clientVersion := authData.Version
		ctx := context.Background()

		// DEBUG: Log what we're looking for (safely handle empty tokens)
		tokenPreview := "empty"
		if len(token) > 8 {
			tokenPreview = token[:8] + "..."
		} else if len(token) > 0 {
			tokenPreview = token
		}
		log.Printf("DEBUG: WebSocket auth - looking for session with token: %s", tokenPreview)

		sessionKey := "session:" + token
		keyPreview := "session:empty"
		if len(sessionKey) > 16 {
			keyPreview = sessionKey[:16] + "..."
		} else if len(sessionKey) > 0 {
			keyPreview = sessionKey
		}
		log.Printf("DEBUG: WebSocket auth - Redis key: %s", keyPreview)

		// DEBUG: Check if key exists in Redis
		exists, err := h.rdb.Exists(ctx, sessionKey).Result()
		if err != nil {
			log.Printf("DEBUG: Redis exists check failed: %v", err)
		} else {
			log.Printf("DEBUG: Redis key exists: %t", exists == 1)
		}

		session, err := auth.GetSessionByToken(ctx, token, h.rdb)
		if err != nil {
			log.Printf("DEBUG: GetSessionByToken failed: %v", err)

			correlationID := ""
			if clientUsesValidatedFormat {
				correlationID = envelope.CorrelationID
			}
			sendConnectionError(conn, "INVALID_AUTH_TOKEN", "Invalid authorization token", clientUsesValidatedFormat, correlationID)
			return
		}

		log.Printf("DEBUG: WebSocket auth successful for user: %d", session.UserID)

		if session.SessionID == "" {
			err := h.rdb.Del(ctx, token).Err()
			if err != nil {
				log.Println("Failed to delete invalid session")
				sentry.CaptureException(err)
			}

			correlationID := ""
			if clientUsesValidatedFormat {
				correlationID = envelope.CorrelationID
			}
			sendConnectionError(conn, "INVALID_SESSION", "Invalid session", clientUsesValidatedFormat, correlationID)
			return
		}

		session.Expiration = time.Now().Add(24 * time.Hour)
		jsonData, err := json.Marshal(session)
		if err != nil {
			sentry.CaptureException(err)
			log.Println("Failed to marshal session data")
			conn.Close()
			return
		}

		err = h.rdb.Set(ctx, "session:"+token, jsonData, 24*time.Hour).Err()
		if err != nil {
			sentry.CaptureException(err)
			log.Println("Failed to update session expiration")
			conn.Close()
			return
		}

		// Reset the read deadline after receiving the authorization message
		err = conn.SetReadDeadline(time.Time{})
		if err != nil {
			sentry.CaptureException(err)
			log.Println("Failed to reset read deadline:", err)
			conn.Close()
			return
		}

		// Create a channel for the user
		userChan := make(chan []byte)
		userChannelsMu.Lock()
		userChannels[session.UserID] = userChan
		userChannelsMu.Unlock()
		defer func() {
			userChannelsMu.Lock()
			delete(userChannels, session.UserID)
			userChannelsMu.Unlock()
		}()

		// Start a goroutine to handle the connection
		wsConn := &wsConnection{
			conn: conn,
		}
		go handleConnection(wsConn, userChan)

		socketHanlder := socket.Handler{
			UserChannels: userChannels,
		}

		channelName := fmt.Sprintf("user:%d", session.UserID)
		pubsub := h.rdb.Subscribe(ctx, channelName)
		defer func(pubsub *redis.PubSub) {
			err := pubsub.Close()
			if err != nil {
				log.Println("Failed to close pubsub:", err)
				sentry.CaptureException(err)
			}
		}(pubsub)

		var jsonString []byte
		if clientUsesValidatedFormat {
			// Send validated format response
			successResponse := types.WebSocketResponse{
				Type:          "connection_success",
				Version:       "1",
				CorrelationID: envelope.CorrelationID,
				Kind:          "RESPONSE",
				Payload:       json.RawMessage(`{"message":"Successfully connected and authenticated"}`),
			}
			jsonString, err = json.Marshal(successResponse)
		} else {
			// Send legacy format response
			successMessage := types.SocketMessage[types.SocketSuccessConnectionData]{
				Type: "connection_success",
				Data: types.SocketSuccessConnectionData{
					Message: "Successfully connected and authenticated",
				},
			}
			jsonString, err = json.Marshal(successMessage)
		}
		if err != nil {
			sentry.CaptureException(err)
			log.Println("Failed to marshal success message")
			conn.Close()
			return
		}
		wsConn.writeMessage(websocket.TextMessage, jsonString)

		go func() {
			for {
				msg, err := pubsub.ReceiveMessage(ctx)
				if err != nil {
					sentry.CaptureException(err)
					log.Println("Subscribe error:", err)
					return
				}
				if err := wsConn.writeMessage(websocket.TextMessage, []byte(msg.Payload)); err != nil {
					sentry.CaptureException(err)
					log.Println("Write error:", err)
					return
				}
			}
		}()

		var db *gorm.DB

		if session.Type == "demo" {
			db = h.demoDB
		} else {
			db = h.liveDB
		}

		for {
			messageType, p, err := conn.ReadMessage()
			if err != nil {
				sentry.CaptureException(err)
				log.Println("Read error:", err)
				return
			}
			handleMessage(messageType, p, conn, session.UserID, db, h.rdb, socketHanlder, clientVersion, h.wsValidator)
		}
	})
}

func handleConnection(wsConn *wsConnection, userChan <-chan []byte) {
	defer func() {
		err := wsConn.conn.Close()
		if err != nil {
			log.Println("Failed to close connection:", err)
		}
	}()

	for {
		select {
		case message := <-userChan:
			if err := wsConn.writeMessage(websocket.TextMessage, message); err != nil {
				sentry.CaptureException(err)
				log.Println("Write error:", err)
				return
			}
		case <-time.After(5 * time.Second):
			if err := wsConn.writeMessage(websocket.PingMessage, nil); err != nil {
				sentry.CaptureException(err)
				log.Println("Ping error:", err)
				return
			}
		}
	}
}

func handleMessage(messageType int, message []byte, conn *websocket.Conn, userId uint, db *gorm.DB, rdb *redis.Client, socketHandler socket.Handler, clientVersion string, validator *wsvalidator.Validator) {
	// Try to parse as new envelope format first
	var envelope types.WebSocketEnvelope
	if err := json.Unmarshal(message, &envelope); err == nil && envelope.Version != "" {
		// This is a new envelope format message - validate it
		if err := validator.ValidateMessage(envelope.Type, envelope.Payload); err != nil {
			log.Printf("Message validation failed for type %s: %v", envelope.Type, err)
			sendValidationError(conn, envelope.CorrelationID, "VALIDATION_FAILED", "Message validation failed", err)
			return
		}

		// Handle validated envelope message
		handleValidatedMessage(envelope, conn, userId, db, rdb, socketHandler, clientVersion)
		return
	}

	// Fall back to legacy format for backward compatibility
	var baseMessage struct {
		Type string          `json:"type"`
		Data json.RawMessage `json:"data"`
	}
	err := json.Unmarshal(message, &baseMessage)
	if err != nil {
		sentry.CaptureException(err)
		log.Println(err)
		return
	}

	switch baseMessage.Type {
	case "ping":
		log.Println("Received ping")
		if err := conn.WriteMessage(messageType, []byte("pong")); err != nil {
			sentry.CaptureException(err)
			log.Println("Write error:", err)
			return
		}
	case "chat":
		var socketMessage types.SocketMessage[types.SocketChatData]
		err = json.Unmarshal(message, &socketMessage)
		if err != nil {
			sentry.CaptureException(err)
			log.Println("Failed to unmarshal chat message:", err)
			return
		}
		socketHandler.HandleChat(socketMessage, userId, db, rdb, clientVersion)
	case "match":
		var socketMessage types.SocketMessage[types.SocketMatchData]
		err = json.Unmarshal(message, &socketMessage)
		if err != nil {
			sentry.CaptureException(err)
			log.Println("Failed to unmarshal match message:", err)
			return
		}
		socketHandler.HandleMatch(socketMessage, userId, db, rdb, clientVersion)
	case "profile":
		var socketMessage types.SocketMessage[types.SocketProfileDecisionData]
		err = json.Unmarshal(message, &socketMessage)
		if err != nil {
			sentry.CaptureException(err)
			log.Println("Failed to unmarshal profile message:", err)
			return
		}
		socketHandler.HandleProfile(socketMessage, userId, db, rdb, clientVersion)
	default:
		if err := conn.WriteMessage(messageType, []byte(message)); err != nil {
			sentry.CaptureException(err)
			log.Println("Write error:", err)
			return
		}
	}
}

func handleValidatedMessage(envelope types.WebSocketEnvelope, conn *websocket.Conn, userId uint, db *gorm.DB, rdb *redis.Client, socketHandler socket.Handler, clientVersion string) {
	switch envelope.Type {
	case "ping":
		log.Println("Received validated ping")
		response := types.WebSocketResponse{
			Type:          "pong",
			Version:       "1",
			CorrelationID: envelope.CorrelationID,
			Kind:          "RESPONSE",
		}
		if responseBytes, err := json.Marshal(response); err == nil {
			conn.WriteMessage(websocket.TextMessage, responseBytes)
		}
	case "chat":
		var chatData types.SocketChatData
		if err := json.Unmarshal(envelope.Payload, &chatData); err != nil {
			sendValidationError(conn, envelope.CorrelationID, "PAYLOAD_PARSE_ERROR", "Failed to parse chat payload", err)
			return
		}
		// Convert to legacy format for existing handler
		legacyMessage := types.SocketMessage[types.SocketChatData]{
			Type: "chat",
			Data: chatData,
		}
		socketHandler.HandleChat(legacyMessage, userId, db, rdb, clientVersion)
	case "match":
		var matchData types.SocketMatchData
		if err := json.Unmarshal(envelope.Payload, &matchData); err != nil {
			sendValidationError(conn, envelope.CorrelationID, "PAYLOAD_PARSE_ERROR", "Failed to parse match payload", err)
			return
		}
		// Convert to legacy format for existing handler
		legacyMessage := types.SocketMessage[types.SocketMatchData]{
			Type: "match",
			Data: matchData,
		}
		socketHandler.HandleMatch(legacyMessage, userId, db, rdb, clientVersion)
	case "profile":
		var profileData types.SocketProfileDecisionData
		if err := json.Unmarshal(envelope.Payload, &profileData); err != nil {
			sendValidationError(conn, envelope.CorrelationID, "PAYLOAD_PARSE_ERROR", "Failed to parse profile payload", err)
			return
		}
		// Convert to legacy format for existing handler
		legacyMessage := types.SocketMessage[types.SocketProfileDecisionData]{
			Type: "profile",
			Data: profileData,
		}
		socketHandler.HandleProfile(legacyMessage, userId, db, rdb, clientVersion)
	default:
		sendValidationError(conn, envelope.CorrelationID, "UNKNOWN_MESSAGE_TYPE", "Unknown message type", fmt.Errorf("unknown message type: %s", envelope.Type))
	}
}

func sendValidationError(conn *websocket.Conn, correlationID, code, message string, err error) {
	log.Printf("WebSocket validation error [%s]: %s - %v", code, message, err)

	errorResponse := types.WebSocketResponse{
		Type:          "error",
		Version:       "1",
		CorrelationID: correlationID,
		Kind:          "ERROR",
		Error: &types.ErrorPayload{
			Code:    code,
			Message: message,
		},
	}

	if responseBytes, marshalErr := json.Marshal(errorResponse); marshalErr == nil {
		conn.WriteMessage(websocket.TextMessage, responseBytes)
	}
}

// Helper function to send error messages in the appropriate format
func sendConnectionError(conn *websocket.Conn, code, message string, useValidatedFormat bool, correlationID string) {
	wsConn := &wsConnection{conn: conn}

	if useValidatedFormat {
		// Send validated format error response
		errorResponse := types.WebSocketResponse{
			Type:          "connection_failed",
			Version:       "1",
			CorrelationID: correlationID,
			Kind:          "ERROR",
			Error: &types.ErrorPayload{
				Code:    code,
				Message: message,
			},
		}
		if jsonString, err := json.Marshal(errorResponse); err == nil {
			wsConn.writeMessage(websocket.TextMessage, jsonString)
		}
	} else {
		// Send legacy format error message
		failedMessage := types.SocketMessage[types.SocketFailedConnectionData]{
			Type: "connection_failed",
			Data: types.SocketFailedConnectionData{
				Message: message,
				Code:    code,
			},
		}
		if jsonString, err := json.Marshal(failedMessage); err == nil {
			wsConn.writeMessage(websocket.TextMessage, jsonString)
		}
	}
}
