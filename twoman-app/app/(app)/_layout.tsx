import { Redirect, Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { ThemeProvider } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft } from "lucide-react-native";
import { mainPurple } from "@/constants/globalStyles";
import { updatePushToken } from "@/utils/user";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform, TouchableOpacity } from "react-native";
import Purchases from "react-native-purchases";
import { ConnectionStatusOverlay } from "@/components/ConnectionStatusOverlay";
import { useSession } from "@/stores/auth";
import { useSubscriptionStore } from "@/stores/subscription";

export { ErrorBoundary } from "expo-router";

Notifications.setNotificationHandler(null);

SplashScreen.preventAutoHideAsync();

const REVENUE_CAT_APPLE_API_KEY =
  process.env.EXPO_PUBLIC_REVENUE_CAT_APPLE_API_KEY || "";

const commonHeaderOptions = {
  headerTintColor: mainPurple,
  headerShadowVisible: false, // This removes the bottom border
  headerLeft: () => (
    <TouchableOpacity onPress={() => router.back()}>
      <ChevronLeft size={24} color={mainPurple} />
    </TouchableOpacity>
  ),
};

export default function RootLayout() {
  const { session } = useSession();

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const userId = useSession((state) => state.session?.user_id);
  
  // Get subscription store
  const { fetchSubscriptionStatus } = useSubscriptionStore();

  useEffect(() => {
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);

    Purchases.configure({
      apiKey: REVENUE_CAT_APPLE_API_KEY,
      ...(userId && { appUserID: userId.toString() }),
    });
    
    // Initialize subscription status when user is available
    if (userId) {
      console.log("User ID available in root layout, fetching subscription status...");
      fetchSubscriptionStatus();
    }
  }, [userId, fetchSubscriptionStatus]);

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        updatePushToken(token);
      }
    });

    // if (Platform.OS === "android") {
    //   Notifications.getNotificationChannelsAsync().then((value) =>
    //     setChannels(value ?? []),
    //   );
    // }
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log(notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(response);
      });

    return () => {
      notificationListener.current &&
        Notifications.removeNotificationSubscription(
          notificationListener.current,
        );
      responseListener.current &&
        Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  if (!session) {
    return <Redirect href="/auth" />;
  }

  return (
    <ThemeProvider value={Theme}>
      <ConnectionStatusOverlay />
      <StatusBar style="light" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="[matchId]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            title: "Profile",
            ...commonHeaderOptions,
          }}
        />
        <Stack.Screen
          name="preferences"
          options={{
            title: "Preferences",
            ...commonHeaderOptions,
          }}
        />
        <Stack.Screen
          name="friends"
          options={{
            title: "Add Friends",
            ...commonHeaderOptions,
          }}
        />
        <Stack.Screen
          name="blocks"
          options={{
            title: "Blocked",
            ...commonHeaderOptions,
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            title: "Notifications",
            ...commonHeaderOptions,
          }}
        />
        <Stack.Screen
          name="onboard"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

const Theme = {
  dark: true,
  colors: {
    primary: "rgb(10, 132, 255)",
    background: "#0a0a0a",
    card: "rgb(18, 18, 18)",
    text: "white",
    border: "rgb(39, 39, 41)",
    notification: "rgb(255, 69, 58)",
  },
};

async function registerForPushNotificationsAsync() {
  let token;

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
      console.log("Failed to get push token for push notification!");
      return;
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      if (!projectId) {
        return "";
      }
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log(token);
    } catch (e) {
      // token = `${e}`;
    }
  } else {
    console.log("Must use physical device for Push Notifications");
  }

  return token;
}
