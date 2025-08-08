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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as Device from "expo-device";
import apiFetch from "@/utils/fetch";
import {
  mainBackgroundColor,
  mainPurple,
  secondaryBackgroundColor,
} from "@/constants/globalStyles";
import type { Notification as NotificationType } from "@/types/api";
import LoadingIndicator from "@/components/LoadingIndicator";

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationType | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const fetchNotificationPreferences = useCallback(async () => {
    try {
      const response = await apiFetch<NotificationType>(
        "/user/notification/preferences",
      );
      if (response.success) {
        setNotificationPreferences(response.data);
      } else {
        console.log(response.error);
      }
    } catch (error) {
      console.log(error);
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

    if (!token && newValue) {
      Alert.alert(
        "Please enable notifications in your device settings to receive notifications.",
      );
      return;
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
    if (!notificationPreferences || !token) return;

    try {
      const response = await apiFetch("/user/notification/preferences", {
        method: "PUT",
        body: {
          expo_push_token: token,
          notifications_enabled: notificationPreferences.NotificationsEnabled,
          new_matches_notifications_enabled:
            notificationPreferences.NewMatchesNotificationsEnabled,
          new_messages_notifications_enabled:
            notificationPreferences.NewMessagesNotificationsEnabled,
          new_friend_request_notifications_enabled:
            notificationPreferences.NewFriendRequestNotificationsEnabled,
        },
      });

      if (!response.success) {
        console.log(response.error);
      }
    } catch (error) {
      console.log(error);
    }
  }, [notificationPreferences, token]);

  useEffect(() => {
    if (notificationPreferences) {
      updateNotificationPreferences();
    }
  }, [notificationPreferences, updateNotificationPreferences]);

  useEffect(() => {
    registerForPushNotificationsAsync().then(setToken);
  }, []);

  if (!notificationPreferences) {
    return (
      <View
        style={[
          styles.container,
          {
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <LoadingIndicator size={48} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.content}>
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

async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      Alert.alert("Error", "Failed to get push token for push notification!");
      return;
    }
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      if (!projectId) {
        Alert.alert("Error", "No project ID found");
        return null;
      }
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
      Alert.alert("Error", "Failed to get push token");
    }
  } else {
    Alert.alert("Error", "Must use physical device for Push Notifications");
    return null;
  }

  return token;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mainBackgroundColor,
  },
  content: {
    padding: 20,
    gap: 10,
  },
  baseText: {
    color: "white",
  },
  contentContainer: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: secondaryBackgroundColor,
    flexDirection: "column",
    gap: 10,
  },
  notificationPreferenceItem: {
    backgroundColor: secondaryBackgroundColor,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
