package utils

import "strings"

// IsValidExpoToken validates the format of an Expo push token
func IsValidExpoToken(token string) bool {
	if len(token) == 0 {
		return false
	}
	
	// Expo push tokens typically start with "ExponentPushToken[" or "ExpoPushToken["
	if strings.HasPrefix(token, "ExponentPushToken[") || strings.HasPrefix(token, "ExpoPushToken[") {
		return strings.HasSuffix(token, "]") && len(token) > 20
	}
	
	// Could be a raw FCM/APNs token - basic length check
	return len(token) >= 10 && len(token) <= 255
}

// GetPlatformFromToken determines platform from token format
func GetPlatformFromToken(token string) string {
	if strings.HasPrefix(token, "ExponentPushToken") || strings.HasPrefix(token, "ExpoPushToken") {
		return "expo"
	}
	if len(token) == 64 {
		return "ios" // APNs tokens are typically 64 chars
	}
	if len(token) > 100 {
		return "android" // FCM tokens are longer
	}
	return "unknown"
}