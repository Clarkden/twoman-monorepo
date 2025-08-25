import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Notification channel definitions
export const NotificationChannels = {
  DEFAULT: "default",
  MATCHES: "matches",
  MESSAGES: "messages", 
  FRIEND_REQUESTS: "friend_requests",
  GENERAL: "general"
} as const;

export type NotificationChannel = typeof NotificationChannels[keyof typeof NotificationChannels];

// Set up all notification channels for Android
export async function setupNotificationChannels() {
  if (Platform.OS !== "android") {
    return; // iOS doesn't use channels
  }

  try {
    // Default channel (already exists but we'll update it)
    await Notifications.setNotificationChannelAsync(NotificationChannels.DEFAULT, {
      name: "General Notifications",
      description: "General app notifications",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#A364F5",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });

    // Matches channel - highest priority
    await Notifications.setNotificationChannelAsync(NotificationChannels.MATCHES, {
      name: "New Matches",
      description: "Notifications for new matches",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: "#A364F5",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });

    // Messages channel - high priority
    await Notifications.setNotificationChannelAsync(NotificationChannels.MESSAGES, {
      name: "Messages",
      description: "New messages from matches",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: "#A364F5",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });

    // Friend requests channel - medium priority
    await Notifications.setNotificationChannelAsync(NotificationChannels.FRIEND_REQUESTS, {
      name: "Friend Requests", 
      description: "New friend requests",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250],
      lightColor: "#A364F5",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });

    // General channel - lower priority
    await Notifications.setNotificationChannelAsync(NotificationChannels.GENERAL, {
      name: "App Updates",
      description: "App updates and general information",
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0, 150],
      lightColor: "#A364F5",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });

    console.log("✅ All notification channels set up successfully");
  } catch (error) {
    console.error("❌ Error setting up notification channels:", error);
  }
}

// Get the appropriate channel for a notification type
export function getNotificationChannel(type: string): NotificationChannel {
  switch (type.toLowerCase()) {
    case "match":
    case "matches":
    case "new_match":
      return NotificationChannels.MATCHES;
    case "message":
    case "messages":
    case "new_message":
      return NotificationChannels.MESSAGES;
    case "friend_request":
    case "friend":
    case "friendship":
      return NotificationChannels.FRIEND_REQUESTS;
    case "general":
    case "update":
    case "app":
      return NotificationChannels.GENERAL;
    default:
      return NotificationChannels.DEFAULT;
  }
}

// Create notification content with proper channel
export function createNotificationContent(
  title: string,
  body: string,
  type: string = "default",
  data?: any
): Notifications.NotificationContentInput {
  const channel = getNotificationChannel(type);
  
  return {
    title,
    body,
    data: {
      ...data,
      type,
      channel,
    },
    ...(Platform.OS === "android" && {
      channelId: channel,
    }),
    categoryIdentifier: type,
    badge: 1,
  };
}

// Enhanced notification handler configuration
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const { data } = notification.request.content;
      const type = data?.type || "default";
      
      // Customize notification display based on type
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: type === "match" || type === "message" 
          ? Notifications.AndroidNotificationPriority.HIGH 
          : Notifications.AndroidNotificationPriority.DEFAULT,
      };
    },
  });
}

// Create grouped notification content for Android
export function createGroupedNotificationContent(
  title: string,
  body: string,
  type: string,
  groupKey: string,
  data?: any
): Notifications.NotificationContentInput {
  const channel = getNotificationChannel(type);
  
  return {
    title,
    body,
    data: {
      ...data,
      type,
      channel,
      groupKey,
    },
    ...(Platform.OS === "android" && {
      channelId: channel,
      groupId: groupKey,
      groupAlertBehavior: Notifications.AndroidGroupAlertBehavior.SUMMARY,
    }),
    categoryIdentifier: type,
    badge: 1,
    sticky: type === "match" || type === "message", // Keep important notifications visible
  };
}

// Create summary notification for grouped notifications
export function createSummaryNotificationContent(
  groupKey: string,
  count: number,
  type: string
): Notifications.NotificationContentInput {
  const channel = getNotificationChannel(type);
  
  let title = "2 Man";
  let body = "";
  
  switch (type) {
    case "match":
      body = count === 1 ? "1 new match" : `${count} new matches`;
      break;
    case "message":
      body = count === 1 ? "1 new message" : `${count} new messages`;
      break;
    case "friend_request":
      body = count === 1 ? "1 new friend request" : `${count} new friend requests`;
      break;
    default:
      body = count === 1 ? "1 new notification" : `${count} new notifications`;
  }
  
  return {
    title,
    body,
    data: {
      type: `${type}_summary`,
      channel,
      groupKey,
      count,
    },
    ...(Platform.OS === "android" && {
      channelId: channel,
      groupId: groupKey,
      isGroupSummary: true,
    }),
    categoryIdentifier: `${type}_summary`,
    badge: count,
  };
}

// Schedule a local notification with proper categorization
export async function scheduleLocalNotification(
  title: string,
  body: string,
  type: string = "default",
  data?: any,
  groupKey?: string
) {
  try {
    const content = groupKey
      ? createGroupedNotificationContent(title, body, type, groupKey, data)
      : createNotificationContent(title, body, type, data);
    
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: null, // Show immediately
    });
    
    console.log(`✅ Local notification scheduled: ${type}`);
  } catch (error) {
    console.error("❌ Error scheduling notification:", error);
  }
}

// Helper to get notification statistics for debugging
export async function getNotificationChannelInfo() {
  if (Platform.OS !== "android") {
    return null;
  }
  
  try {
    const channels = await Notifications.getNotificationChannelsAsync();
    console.log("📊 Available notification channels:", channels.map(c => ({
      id: c.id,
      name: c.name,
      importance: c.importance,
    })));
    return channels;
  } catch (error) {
    console.error("❌ Error getting channel info:", error);
    return null;
  }
}