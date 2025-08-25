import LoadingIndicator from "@/components/LoadingIndicator";
import {
  mainBackgroundColor,
  mainPurple,
  secondaryBackgroundColor,
} from "@/constants/globalStyles";
import type { Notification as NotificationType } from "@/types/api";
import apiFetch from "@/utils/fetch";
import { useFocusEffect } from "@react-navigation/native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { setupNotificationChannels } from "@/utils/notifications";

type ErrorState = {
  type: "preferences" | "update" | null;
  message: string;
  canRetry: boolean;
} | null;

export default function NotificationsScreen() {
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationType | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState({
    preferences: true,
    updating: false,
  });
  const [error, setError] = useState<ErrorState>(null);

  const fetchNotificationPreferences = useCallback(async () => {
    setLoading((prev) => ({ ...prev, preferences: true }));
    setError(null);

    try {
      const response = await apiFetch<NotificationType>(
        "/user/notification/preferences",
      );
      if (response.success) {
        setNotificationPreferences(response.data);
      } else {
        setError({
          type: "preferences",
          message: response.error || "Failed to load notification preferences",
          canRetry: true,
        });
      }
    } catch (error) {
      setError({
        type: "preferences",
        message:
          "Network error loading preferences. Please check your connection.",
        canRetry: true,
      });
    } finally {
      setLoading((prev) => ({ ...prev, preferences: false }));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotificationPreferences();
    }, [fetchNotificationPreferences]),
  );

  const toggleNotifications = async () => {
    if (!notificationPreferences) return;

    const newValue = !notificationPreferences.NotificationsEnabled;

    // If enabling notifications and we don't have a token, try to get one
    if (!token && newValue) {
      try {
        const result = await registerForPushNotificationsAsync();
        if (result.success && result.token) {
          setToken(result.token);
        } else if (result.reason === "permissions") {
          Alert.alert(
            "Notifications Disabled",
            "Please enable notifications in your device settings to receive push notifications.",
          );
          return;
        }
        // If it fails for other reasons (device, network, etc.), still allow the user to toggle the setting
      } catch (error) {
        console.log("Failed to get push token when enabling notifications:", error);
        // Still allow the toggle - the user preference should be saved even if token generation fails
      }
    }

    setNotificationPreferences((prev) =>
      prev
        ? {
            ...prev,
            NotificationsEnabled: newValue,
          }
        : null,
    );
  };

  const toggleNewMatchesNotifications = async () => {
    if (!notificationPreferences) return;
    setNotificationPreferences((prev) =>
      prev
        ? {
            ...prev,
            NewMatchesNotificationsEnabled:
              !prev.NewMatchesNotificationsEnabled,
          }
        : null,
    );
  };

  const toggleNewMessagesNotifications = async () => {
    if (!notificationPreferences) return;
    setNotificationPreferences((prev) =>
      prev
        ? {
            ...prev,
            NewMessagesNotificationsEnabled:
              !prev.NewMessagesNotificationsEnabled,
          }
        : null,
    );
  };

  const toggleNewFriendRequestNotifications = async () => {
    if (!notificationPreferences) return;
    setNotificationPreferences((prev) =>
      prev
        ? {
            ...prev,
            NewFriendRequestNotificationsEnabled:
              !prev.NewFriendRequestNotificationsEnabled,
          }
        : null,
    );
  };

  const updateNotificationPreferences = useCallback(async () => {
    if (!notificationPreferences) return;

    setLoading((prev) => ({ ...prev, updating: true }));
    setError(null);

    try {
      // Only include expo_push_token if we have a valid token
      const requestBody: any = {
        notifications_enabled: notificationPreferences.NotificationsEnabled,
        new_matches_notifications_enabled:
          notificationPreferences.NewMatchesNotificationsEnabled,
        new_messages_notifications_enabled:
          notificationPreferences.NewMessagesNotificationsEnabled,
        new_friend_request_notifications_enabled:
          notificationPreferences.NewFriendRequestNotificationsEnabled,
      };

      if (token && token.trim() !== "") {
        requestBody.expo_push_token = token;
      }

      const response = await apiFetch("/user/notification/preferences", {
        method: "PUT",
        body: requestBody,
      });

      if (!response.success) {
        setError({
          type: "update",
          message: response.error || "Failed to save preferences",
          canRetry: true,
        });
      }
    } catch (error) {
      setError({
        type: "update",
        message:
          "Network error saving preferences. Your changes may not be saved.",
        canRetry: true,
      });
    } finally {
      setLoading((prev) => ({ ...prev, updating: false }));
    }
  }, [notificationPreferences, token]);

  useEffect(() => {
    if (notificationPreferences) {
      updateNotificationPreferences();
    }
  }, [notificationPreferences, updateNotificationPreferences]);

  const initializePushNotifications = useCallback(async () => {
    try {
      const result = await registerForPushNotificationsAsync();
      if (result.success && result.token) {
        setToken(result.token);
      } else {
        setToken(null);
      }
    } catch (error) {
      console.log("Push token initialization failed silently:", error);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    initializePushNotifications();
  }, [initializePushNotifications]);

  // Show loading state while preferences are loading
  if (loading.preferences && !notificationPreferences) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <LoadingIndicator size={48} />
        <Text style={styles.loadingText}>
          Loading notification preferences...
        </Text>
      </View>
    );
  }

  // Show error state if preferences failed to load
  if (error?.type === "preferences" && !notificationPreferences) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Unable to load preferences</Text>
      </View>
    );
  }

  // If we have preferences but no token due to error, still show the preferences
  // but with a warning about push notifications

  if (!notificationPreferences) {
    return (
      <View>
        <Text>c</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.content}>
          {/* Show saving indicator */}
          {loading.updating && (
            <View style={styles.savingContainer}>
              <LoadingIndicator size={20} />
              <Text style={styles.savingText}>Saving preferences...</Text>
            </View>
          )}

          <View style={styles.contentContainer}>
            <View style={styles.notificationPreferenceItem}>
              <Text style={[styles.baseText]}>Enabled</Text>
              <Switch
                trackColor={{ true: mainPurple }}
                onValueChange={toggleNotifications}
                value={notificationPreferences.NotificationsEnabled}
              />
            </View>
            <View style={styles.notificationPreferenceItem}>
              <Text style={[styles.baseText]}>New Matches</Text>
              <Switch
                trackColor={{ true: mainPurple }}
                onValueChange={toggleNewMatchesNotifications}
                value={notificationPreferences.NewMatchesNotificationsEnabled}
              />
            </View>
            <View style={styles.notificationPreferenceItem}>
              <Text style={[styles.baseText]}>New Messages</Text>
              <Switch
                trackColor={{ true: mainPurple }}
                onValueChange={toggleNewMessagesNotifications}
                value={notificationPreferences.NewMessagesNotificationsEnabled}
              />
            </View>
            <View style={styles.notificationPreferenceItem}>
              <Text style={[styles.baseText]}>New Friend Requests</Text>
              <Switch
                trackColor={{ true: mainPurple }}
                onValueChange={toggleNewFriendRequestNotifications}
                value={
                  notificationPreferences.NewFriendRequestNotificationsEnabled
                }
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

type PushTokenResult = {
  success: boolean;
  token?: string | null;
  error: string;
  canRetry: boolean;
  isError: boolean; // True for genuine errors, false for user choices/device limitations
  reason?: "permissions" | "device" | "network" | "config"; // Reason for failure
};

async function registerForPushNotificationsAsync(): Promise<PushTokenResult> {
  // Check if running on physical device
  if (!Device.isDevice) {
    return {
      success: false,
      error:
        "Push notifications require a physical device. They won't work in simulator.",
      canRetry: false,
      isError: false,
      reason: "device",
    };
  }

  try {
    // Set up all Android notification channels
    if (Platform.OS === "android") {
      await setupNotificationChannels();
    }

    // Check existing permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return {
        success: false,
        error:
          "Push notification permissions were denied. Enable them in Settings to receive notifications.",
        canRetry: true,
        isError: false,
        reason: "permissions",
      };
    }

    // Get project ID
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) {
      return {
        success: false,
        error:
          "App configuration error: No project ID found. Contact support if this persists.",
        canRetry: false,
        isError: true,
        reason: "config",
      };
    }

    // Get push token
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

    if (!tokenData?.data) {
      return {
        success: false,
        error: "Failed to generate push notification token. Please try again.",
        canRetry: true,
        isError: true,
        reason: "network",
      };
    }

    return {
      success: true,
      token: tokenData.data,
      error: "",
      canRetry: false,
      isError: false,
    };
  } catch (error) {
    console.error("Push token registration error:", error);
    return {
      success: false,
      error:
        "Network error setting up push notifications. Check your connection and try again.",
      canRetry: true,
      isError: true,
      reason: "network",
    };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mainBackgroundColor,
  },
  content: {
    padding: 20,
    gap: 15,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  baseText: {
    color: "white",
    fontSize: 16,
  },
  contentContainer: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: secondaryBackgroundColor,
    flexDirection: "column",
    gap: 15,
  },
  notificationPreferenceItem: {
    backgroundColor: secondaryBackgroundColor,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  savingContainer: {
    backgroundColor: secondaryBackgroundColor,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  savingText: {
    color: "white",
    fontSize: 14,
  },
  loadingText: {
    color: "white",
    fontSize: 16,
    marginTop: 10,
    textAlign: "center",
  },
});
