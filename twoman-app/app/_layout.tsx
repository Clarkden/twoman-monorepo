import { Slot } from "expo-router";
import { useFonts } from "expo-font";
import { FontAwesome } from "@expo/vector-icons";
import React, { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import Toast, { ToastConfigParams } from "react-native-toast-message";
import { accentGray, secondaryBackgroundColor } from "@/constants/globalStyles";
import { Pressable, Text, View, AppState } from "react-native";
import appsFlyer from "react-native-appsflyer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Sentry from "@sentry/react-native";
// Star balance management moved to (app)/_layout.tsx where RevenueCat is configured

Sentry.init({
  dsn: "https://712986772afb4d1f15186c40cdf55a97@o4509483335942144.ingest.us.sentry.io/4509483342757888",
  environment: __DEV__ ? "development" : "production",

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Configure Session Replay
  // replaysSessionSampleRate: 0.1,
  // replaysOnErrorSampleRate: 1,
  // integrations: [Sentry.mobileReplayIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

const toastConfig = {
  messageToast: ({ text1, text2, props }: ToastConfigParams<any>) => (
    <Pressable
      onPress={props.onPress}
      style={{
        width: "90%",
        backgroundColor: secondaryBackgroundColor,
        borderRadius: 10,
        padding: 15,
        margin: 10,
      }}
    >
      <Text style={{ color: accentGray, fontSize: 12, marginBottom: 3 }}>
        {text1}
      </Text>
      <Text style={{ color: "white" }} numberOfLines={1}>
        {text2}
      </Text>
    </Pressable>
  ),
  success: ({ text1, props }: ToastConfigParams<any>) => (
    <View
      style={{
        width: "90%",
        backgroundColor: secondaryBackgroundColor,
        borderRadius: 10,
        padding: 15,
        margin: 10,
      }}
    >
      <Text style={{ color: "white" }}>{text1}</Text>
    </View>
  ),
};

export default Sentry.wrap(function Root() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // Star balance hooks moved to (app)/_layout.tsx

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    appsFlyer.initSdk({
      devKey: process.env.EXPO_PUBLIC_APPS_FLYER_DEV_KEY || "",
      isDebug: process.env.EXPO_PUBLIC_APPS_FLYER_IS_DEBUG === "true",
      appId: "id6505080080",
      onInstallConversionDataListener: false, //Optional
      onDeepLinkListener: false, //Optional
      timeToWaitForATTUserAuthorization: 10, //for iOS 14.5
    });
  }, []);

  // Star balance refresh logic moved to (app)/_layout.tsx where RevenueCat is configured

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Slot />
      <Toast config={toastConfig} />
    </GestureHandlerRootView>
  );
});
