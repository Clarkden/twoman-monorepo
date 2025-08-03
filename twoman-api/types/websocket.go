package types

import "encoding/json"

type SocketMessage[T any] struct {
	Type string `json:"type"`
	Data T      `json:"data"`
}

// WebSocketEnvelope represents the new envelope structure for validated messages
type WebSocketEnvelope struct {
	Type          string          `json:"type"`
	Version       string          `json:"v"`
	CorrelationID string          `json:"correlationId"`
	Payload       json.RawMessage `json:"payload"`
}

// WebSocketResponse represents a standardized response structure
type WebSocketResponse struct {
	Type          string          `json:"type"`
	Version       string          `json:"v"`
	CorrelationID string          `json:"correlationId"`
	Kind          string          `json:"kind"`
	Payload       json.RawMessage `json:"payload,omitempty"`
	Error         *ErrorPayload   `json:"error,omitempty"`
}

// ErrorPayload represents error information in responses
type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type SocketChatData struct {
	Message string `json:"message"`
	MatchID uint   `json:"match_id"`
}

type SocketAuthorizationData struct {
	Session string `json:"session"`
	Version string `json:"version"`
}

type SocketMatchData struct {
	Action        string `json:"action"`
	MatchID       uint   `json:"match_id"`
	TargetProfile uint   `json:"target_profile,omitempty"`
}

type SocketProfileDecisionData struct {
	Decision      string `json:"decision"`
	IsDuo         bool   `json:"is_duo,omitempty"`
	FriendProfile uint   `json:"friend_profile,omitempty"`
	TargetProfile uint   `json:"target_profile,omitempty"`
}

type SocketProfileDiscoveryData struct {
	ProfileID uint `json:"profile_id"`
}

type SocketProfileResponseData struct {
	Message string `json:"message"`
	Success bool   `json:"success"`
}

type SocketFailedConnectionData struct {
	Message string `json:"message"`
	Code    string `json:"code"`
}

type SocketSuccessConnectionData struct {
	Message string `json:"message"`
}
