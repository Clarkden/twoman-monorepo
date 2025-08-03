import React, { useEffect, useState } from "react";
import { Tabs, useRouter, useSegments } from "expo-router";
import { Linking, Pressable, Text, View } from "react-native";
import { CircleUser, Heart, Home, MessageCircle } from "lucide-react-native";
import apiFetch from "@/utils/fetch";
import { FeatureFlag, Friendship, Match, Message, Profile } from "@/types/api";
import { messageHandler } from "@/utils/websocket";
import Toast from "react-native-toast-message";
import { mainBackgroundColor, secondaryBackgroundColor } from "@/constants/globalStyles";
import { FontAwesome5 } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSession } from "@/stores/auth";
import { useSubscriptionStore } from "@/stores/subscription";
import useWebSocket from "@/hooks/useWebsocket";

export default function TabLayout() {
  const router = useRouter();
  const { session } = useSession();
  const segments = useSegments();
  const userId = useSession((state) => state.session?.user_id);

  const [waitlistEnabled, setWaitlistEnabled] = useState(false);
  const { connectionStatus } = useWebSocket();
  const [initialized, setInitialized] = useState(false);
  
  // Get subscription store
  const { fetchSubscriptionStatus } = useSubscriptionStore();

  const handleGetProfile = async () => {
    if (!session) return;

    if (connectionStatus !== "connected") {
      console.log("[_layout.tsx] Websocket not connected. Aborting.");
      return;
    }

    console.log("Fetching profile data.");

    try {
      const response = await apiFetch<Profile>("/profile/me");

      if (!response.success) {
        router.replace("/onboard");
        return;
      }

      await handleGetWaitlistFlag();
      
      // Fetch subscription status on app initialization
      console.log("Fetching subscription status on app init...");
      await fetchSubscriptionStatus();
    } catch (error) {
      console.log(error);
    } finally {
      setInitialized(true);
    }
  };

  const handleGetWaitlistFlag = async () => {
    try {
      const response = await apiFetch<FeatureFlag>("/flag/waitlist");

      if (!response.success) {
        console.log(response);
        return;
      }

      if (response.data.IsEnabled) {
        setWaitlistEnabled(true);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (!initialized) {
      handleGetProfile();
    }

    if (connectionStatus === "connected" && session) {
      handleGetWaitlistFlag();
    }

    return () => {
      setInitialized(false);
    };
  }, [connectionStatus, session]);

  // Fetch subscription status when session is available
  useEffect(() => {
    if (session && connectionStatus === "connected") {
      console.log("Session available, fetching subscription status...");
      fetchSubscriptionStatus();
    }
  }, [session, connectionStatus, fetchSubscriptionStatus]);

  useEffect(() => {
    const handleChatMessage = (data: Message) => {
      if (segments.includes("chat") || segments.includes("[matchId]")) return;

      if (data.Profile.user_id === userId) return;

      Toast.show({
        type: "messageToast",
        text1: data.Profile.name,
        text2: data.message,
        props: {
          onPress: () => router.replace(`/chat`),
        },
      });
    };

    const handleMatchMessage = (data: Match) => {
      // If it's a friend match, skip "like"/"invite" toasts (or handle differently).
      if (data.is_friend) {
        return;
      }

      // 1) Check for "pending" toasts (the match is still waiting on someone's acceptance).
      if (data.status === "pending") {
        // I am the *solo/duo target* (profile3) and haven't accepted?
        if (data.profile3_id === userId && !data.profile3_accepted) {
          if (data.is_duo) {
            // DUO scenario for profile3
            // Show "X and friend Y want to run a 2 Man with you!"
            Toast.show({
              type: "messageToast",
              text1: "New Duo Like!",
              text2: `${data.profile1.name} ${
                data.profile2?.name ? "and " + data.profile2?.name : ""
              } want to run a 2 Man with you!`,
              props: {
                onPress: () => router.replace(`/chat`),
              },
            });
          } else {
            // SOLO scenario for profile3
            // "X liked you!"
            Toast.show({
              type: "messageToast",
              text1: "New Like!",
              text2: `${data.profile1.name} liked you!`,
              props: {
                onPress: () => router.replace(`/chat`),
              },
            });
          }
          return;
        }

        // I am the "friend" (profile4) in a DUO scenario and haven't accepted?
        if (data.profile4_id === userId && !data.profile4_accepted) {
          // "X and Y want to run a 2 Man with you!"
          Toast.show({
            type: "messageToast",
            text1: "New Duo Like!",
            text2: `${data.profile1.name} ${
              data.profile2?.name ? "and " + data.profile2?.name : ""
            } want to run a 2 Man with you!`,
            props: {
              onPress: () => router.replace(`/chat`),
            },
          });
          return;
        }

        // I am profile2 in a DUO match but we haven't selected profile4 yet?
        // "X wants to run a 2 Man with you!"
        // (meaning profile1 invited me to pick a friend for the duo).
        if (data.is_duo && data.profile2_id === userId && !data.profile4_id) {
          Toast.show({
            type: "messageToast",
            text1: "New 2 Man Invite!",
            text2: `${data.profile1.name} wants to run a 2 Man with you!`,
            props: {
              onPress: () => router.replace(`/likes`),
            },
          });
          return;
        }
      }

      // 2) Check if the match just got fully accepted => "New Match!"
      if (data.status === "accepted") {
        Toast.show({
          type: "messageToast",
          text1: "New Match!",
          text2: "You just got a new match!",
          props: {
            onPress: () => router.replace(`/chat`),
          },
        });
      }
    };

    const handleFriendshipMessage = (data: Friendship) => {
      if (data.ProfileID === userId && data.accepted) {
        Toast.show({
          type: "messageToast",
          text1: "New Friend!",
          text2: `${data.Friend.name} accepted your friend request!`,
          props: {
            onPress: () => router.replace(`/settings`),
          },
        });
      } else if (data.FriendID === userId && !data.accepted) {
        Toast.show({
          type: "messageToast",
          text1: "New Friend Request!",
          text2: `${data.Profile.name} wants to be your friend!`,
          props: {
            onPress: () => router.replace(`/settings`),
          },
        });
      }
    };

    messageHandler.subscribe("chat", handleChatMessage);
    messageHandler.subscribe("match", handleMatchMessage);
    messageHandler.subscribe("friendship", handleFriendshipMessage);

    return () => {
      messageHandler.unsubscribe("chat", handleChatMessage);
      messageHandler.unsubscribe("match", handleMatchMessage);
      messageHandler.unsubscribe("friendship", handleFriendshipMessage);
    };
  }, [messageHandler, segments]);

  if (waitlistEnabled) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <BlurView
          intensity={0}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 400,
            zIndex: 0,
          }}
        >
          <LinearGradient
            colors={["#9141fa", "transparent"]}
            style={{
              height: 400,
              width: "100%",
              zIndex: -1,
              opacity: 0.8,
            }}
          />
        </BlurView>
        <View style={{ alignItems: "center", maxWidth: "80%" }}>
          <Text
            style={{
              color: "#fff",
              fontWeight: "bold",
              fontSize: 28,
              marginBottom: 10,
            }}
          >
            Hang Tight!
          </Text>
          <Text
            style={{
              color: "lightgray",
              textAlign: "center",
              marginBottom: 40,
              fontSize: 18,
            }}
          >
            We're under waitlist while we wait for more users to join you!
          </Text>
          <Text style={{ color: "lightgray", marginBottom: 10, fontSize: 18 }}>
            Follow our socials to stay up to date.
          </Text>
          <View
            style={{
              flexDirection: "row",
              gap: 20,
              marginTop: 10,
            }}
          >
            <Pressable
              onPress={() => {
                Linking.openURL("https://www.tiktok.com/@2man_app");
              }}
            >
              <FontAwesome5 name={"tiktok"} color={"white"} size={32} />
            </Pressable>
            <Pressable
              onPress={() => {
                Linking.openURL("https://www.instagram.com/2manapp");
              }}
            >
              <FontAwesome5 name={"instagram"} color={"white"} size={32} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: mainBackgroundColor,
      }}
    >
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: "#a364f5",
          tabBarShowLabel: false,
          headerTitleStyle: {
            color: "#a364f5",
            fontSize: 24,
            fontWeight: "bold",
          },
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: mainBackgroundColor,
          },
          tabBarStyle: {
            backgroundColor: mainBackgroundColor,
            borderTopWidth: 0,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "2 Man",
            tabBarIcon: ({ color }) => <Home size={24} color={color} />,
            headerTitleAlign: "left",
          }}
        />
        <Tabs.Screen
          name="likes"
          options={{
            title: "Likes",
            headerTitleAlign: "left",
            tabBarIcon: ({ color }) => <Heart size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            headerTitleAlign: "left",
            headerTitle: "Chat",
            tabBarIcon: ({ color }) => (
              <MessageCircle size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            headerTitleAlign: "left",
            headerTitle: "Settings",
            tabBarIcon: ({ color }) => <CircleUser size={24} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}
