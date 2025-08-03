import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import {
  borderColor,
  mainBackgroundColor,
  mainPurple,
} from "@/constants/globalStyles";
import { FontAwesome } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Message } from "@/types/api";
import { messageHandler } from "@/utils/websocket";
import { differenceInDays, format, isToday, isYesterday } from "date-fns";
import { SocketChatData, SocketMessage } from "@/types/socket";
import { MoreHorizontal } from "lucide-react-native";
import apiFetch from "@/utils/fetch";
import { useSession } from "@/stores/auth";
import useWebSocket from "@/hooks/useWebsocket";

function formatCustomDate(date: Date): string {
  const now = new Date();
  const diffDays = differenceInDays(now, date);

  if (isToday(date)) {
    return `Today ${format(date, "h:mm a")}`;
  } else if (isYesterday(date)) {
    return `Yesterday ${format(date, "h:mm a")}`;
  } else if (diffDays <= 5) {
    return format(date, "EEEE h:mm a");
  } else {
    return format(date, "EEE, MMM d 'at' h:mm a");
  }
}

const ChatSettingsButton = ({ matchId }: { matchId: string }) => {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => {
        router.push(`/${matchId}/settings`);
      }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <MoreHorizontal size={24} color="#a364f5" />
    </TouchableOpacity>
  );
};

export default function ChatMatchId() {
  const {
    matchId,
    profile1_name,
    profile1_avatar,
    profile1_user_id,
    profile2_user_id,
    profile2_name,
    profile2_avatar,
    profile3_user_id,
    profile3_name,
    profile3_avatar,
    profile4_user_id,
    profile4_name,
    profile4_avatar,
    is_duo,
  } = useLocalSearchParams();

  const userId = useSession((state) => state.session?.user_id);
  const navigation = useNavigation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageFetchLimit, setMessageFetchLimit] = useState(15);
  const [messageFetchOffset, setMessageFetchOffset] = useState(0);
  const [message, setMessage] = useState("");
  const { ws, sendMessage } = useWebSocket();
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  function getScreenTitle(
    profile1_name: string,
    profile1_user_id: number,
    profile2_name: string,
    profile2_user_id: number,
    profile3_name: string,
    profile3_user_id: number,
    profile4_name: string,
    profile4_user_id: number,
    is_duo: number,
    userId: number,
  ): string {
    if (is_duo === 1) {
      return "Group";
    } else {
      if (profile1_user_id === userId) {
        return profile3_name;
      } else if (profile3_user_id === userId) {
        return profile1_name;
      } else {
        return "Unknown";
      }
    }
  }

  async function fetchMoreMessages() {
    if (isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const response = await apiFetch<Message[]>(
        `/chat/${matchId}?limit=${messageFetchLimit}&offset=${messageFetchOffset}`,
      );
      if (response.code !== 200) {
        console.log(response.error);
        return;
      }
      //   const newProcessedMessages = processMessages(response.data);
      //   setMessages((prevMessages) => [...prevMessages, ...newProcessedMessages]);
      setMessages((prev) => [...prev, ...response.data]);

      setMessageFetchOffset((prevOffset) => prevOffset + messageFetchLimit);
    } catch (error) {
      console.log(error);
    } finally {
      setIsFetchingMore(false);
    }
  }

  async function getMatchChats() {
    try {
      const response = await apiFetch<Message[]>(
        `/chat/${matchId}?limit=${messageFetchLimit}&offset=${messageFetchOffset}`,
      );
      if (response.code !== 200) {
        console.log(response.error);
        return;
      }
      //   const processedMessages = processMessages(response.data);
      setMessages(response.data);
      setMessageFetchOffset(messageFetchOffset + messageFetchLimit);
    } catch (error) {
      console.log(error);
    }
  }

  async function sendChatMessage(message: string) {
    if (!ws) {
      console.log("Websocket not connected");
      return;
    }

    sendMessage({
      type: "chat",
      data: {
        message: message,
        match_id: Number(matchId),
      },
    });
  }

  async function handleSendChatMessage() {
    if (message.length === 0) {
      return;
    }

    try {
      await sendChatMessage(message);
      setMessage("");
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (!userId) return;

    const screenTitle = getScreenTitle(
      profile1_name as string,
      Number(profile1_user_id),
      profile2_name as string,
      Number(profile2_user_id),
      profile3_name as string,
      Number(profile3_user_id),
      profile4_name as string,
      Number(profile4_user_id),
      Number(is_duo),
      userId,
    );

    navigation.setOptions({
      title: screenTitle,
      headerRight: () => <ChatSettingsButton matchId={matchId as string} />,
    });
  }, [
    profile1_name,
    profile1_user_id,
    profile2_name,
    profile2_user_id,
    profile3_name,
    profile3_user_id,
    profile4_name,
    profile4_user_id,
    is_duo,
    userId,
    navigation,
  ]);

  useEffect(() => {
    if (!navigation.isFocused) return;

    getMatchChats();
  }, [navigation.isFocused]);

  useEffect(() => {
    const handleChatMessage = (newMessage: Message) => {
      if (newMessage.match_id === Number(matchId)) {
        setMessages((prev) => {
          const existingIndex = prev.findIndex((m) => m.ID === newMessage.ID);
          if (existingIndex !== -1) {
            return prev;
          }
          return [newMessage, ...prev];
        });
      }
    };

    messageHandler.subscribe("chat", handleChatMessage);

    return () => {
      messageHandler.unsubscribe("chat", handleChatMessage);
    };
  }, [matchId]);

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const olderMessage = messages[index + 1];

    let shouldShowTimestamp = false;
    if (!olderMessage) {
      shouldShowTimestamp = true;
    } else {
      const timeDelta = Math.abs(
        new Date(item.CreatedAt).getTime() -
          new Date(olderMessage.CreatedAt).getTime(),
      );
      shouldShowTimestamp = timeDelta > 59 * 60 * 1000;
    }

    const shouldShowNameLabel =
      is_duo === "1" &&
      item.profile_id !== userId &&
      (!olderMessage || olderMessage.profile_id !== item.profile_id);

    return (
      <View
        style={{
          marginTop: olderMessage
            ? olderMessage.profile_id !== item.profile_id
              ? 10
              : 0
            : 0,
        }}
      >
        {shouldShowTimestamp && (
          <View style={{ alignItems: "center", marginVertical: 20 }}>
            <Text style={{ color: "gray" }}>
              {formatCustomDate(new Date(item.CreatedAt))}
            </Text>
          </View>
        )}
        {shouldShowNameLabel && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 5,
              marginTop: 20,
            }}
          >
            <Text style={{ color: "gray" }}>{item.Profile.name}</Text>
          </View>
        )}
        <View
          style={[
            item.profile_id === userId
              ? styles.sentMessage
              : styles.receivedMessage,
          ]}
        >
          <Text style={styles.messageText}>{item.message}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: mainBackgroundColor }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 112 : 0}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, paddingBottom: 5 }}>
            <FlatList
              data={messages}
              keyExtractor={(message) => message.ID.toString()}
              renderItem={renderItem}
              inverted
              onEndReached={fetchMoreMessages}
              onEndReachedThreshold={0.5}
              initialNumToRender={15}
              style={{
                backgroundColor: mainBackgroundColor,
                paddingHorizontal: 10,
              }}
            />
          </View>

          <View
            style={{
              padding: 10,
            }}
          >
            <View style={styles.TextInputView}>
              <TextInput
                multiline
                style={[
                  {
                    flex: 1,
                    borderRadius: 25,
                    minHeight: 40,
                    marginLeft: 10,
                    color: "white",
                    paddingTop: 10,
                    paddingBottom: 10,
                    textAlignVertical: "center",
                  },
                  Platform.OS === "ios" ? styles.iosTextInput : null,
                ]}
                textAlignVertical="center"
                placeholder="Send Message..."
                placeholderTextColor="#858585"
                value={message}
                onChangeText={setMessage}
              />
              <View
                style={{
                  padding: 5,
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.SendButton,
                    {
                      opacity: message.trim().length === 0 ? 0 : 1,
                    },
                  ]}
                  disabled={message.trim().length === 0}
                  onPress={handleSendChatMessage}
                >
                  <FontAwesome name="send" size={14} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  ChatView: {
    flex: 1,
    padding: 10,
  },
  TextInputView: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: borderColor,
    gap: 5,
  },
  SendButton: {
    borderRadius: 18,
    backgroundColor: "#a364f5",
    width: 30,
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  chatBubbleText: {
    color: "#1b1a1c",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sentMessage: {
    alignSelf: "flex-end",
    backgroundColor: mainPurple,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
    maxWidth: "80%",
  },
  receivedMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#2d2b2e",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
    maxWidth: "80%",
  },
  messageText: {
    fontSize: 16,
    color: "#fff",
  },
  sendButton: {
    backgroundColor: "#128C7E",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  dateHeaderContainer: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#888",
  },
  iosTextInput: {
    paddingTop: 10,
    paddingBottom: 10,
    lineHeight: 20,
  },
});
